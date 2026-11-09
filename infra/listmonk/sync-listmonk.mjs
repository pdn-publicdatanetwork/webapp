// Sync des contacts DataParl' vers Listmonk — appelé par .github/workflows/sync-listmonk.yml.
// Source de vérité : dataparl-auth (crm_contacts, newsletter_subscribers) ; les
// désinscriptions Listmonk sont répercutées en retour (statut archive + tag).
// NB : JavaScript pur obligatoire — Node refuse la syntaxe TypeScript (« ! »,
// « as ») dans un .mjs (SyntaxError), cause des 30 échecs du 25/10 au 09/11.
const need = (nom) => {
  const v = process.env[nom];
  if (!v) { console.error(`Variable d'environnement ${nom} manquante — vérifier les secrets du dépôt.`); process.exit(1); }
  return v;
};

const SUPA_URL = need("SUPABASE_AUTH_URL");
const SUPA_KEY = need("SUPABASE_AUTH_SERVICE_KEY");
const LM_URL = need("LISTMONK_URL").replace(/\/$/, "");
const LM_TOKEN = need("LISTMONK_TOKEN");
const LM_LIST_ID = Number(process.env.LISTMONK_LIST_ID ?? 1);

const supa = async (table, query) =>
  (await fetch(`${SUPA_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  })).json();

const lm = async (path, method, body) => {
  const r = await fetch(`${LM_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(LM_TOKEN + ":").toString("base64")}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, j: await r.json().catch(() => null) };
};

const [crm, newsletter] = await Promise.all([
  supa("crm_contacts", "select=email,statut,tags,note&limit=5000"),
  supa("newsletter_subscribers", "select=email,confirmed,unsubscribed_at&limit=5000"),
]);
const abonnes = newsletter
  .filter((n) => n.confirmed && !n.unsubscribed_at).map((n) => n.email.toLowerCase());
const desinscrits = newsletter
  .filter((n) => n.unsubscribed_at).map((n) => n.email.toLowerCase());

let upsert = 0, optout = 0, retours = 0;
for (const c of crm) {
  const email = c.email.toLowerCase();
  const statut = desinscrits.includes(email) || c.statut === "archive" ? "optout" : "subscribed";
  const r = await lm("/api/v1/subscribers", "POST", {
    email, name: "", status: statut, lists: [LM_LIST_ID],
    preconfirm: true,
    attrs: { statut: c.statut, tags: (c.tags ?? []).join(","), note: c.note ?? "" },
    has_optout: statut === "optout" ? 1 : 0,
  });
  if (r.status === 200 || r.status === 201) statut === "optout" ? optout++ : upsert++;
}
// Abonnés newsletter sans fiche crm_contacts : créer l'entrée minimale.
const connus = new Set(crm.map((c) => c.email.toLowerCase()));
for (const email of abonnes.filter((e) => !connus.has(e))) {
  const r = await lm("/api/v1/subscribers", "POST", { email, name: "", status: "subscribed", lists: [LM_LIST_ID], preconfirm: true, attrs: {} });
  if (r.status === 200 || r.status === 201) upsert++;
}
// Retour : désinscrits côté Listmonk -> archivés dans crm_contacts.
const lmSubs = await lm("/api/v1/subscribers?list_id=" + LM_LIST_ID + "&page=1&per_page=500", "GET");
for (const s of (lmSubs.j?.data?.results ?? [])) {
  if (s.status === "blocked" || s.status === "unsubscribed") {
    await fetch(`${SUPA_URL}/rest/v1/crm_contacts?email=eq.${encodeURIComponent(s.email.toLowerCase())}`, {
      method: "PATCH",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ statut: "archive", tags: ["desinscrit_newsletter"], maj_le: new Date().toISOString(), maj_par: "listmonk-sync" }),
    });
    retours++;
  }
}
console.log(JSON.stringify({ upsert, optout, retours }));
