import "server-only";
import { authAdmin } from "./supabaseAdmin";

// Console Slack « CRM » : fiche 360° par e-mail (compte, messages contact,
// newsletter, alertes, enquête, suivi) et édition du suivi (statut, tags,
// note) dans crm_contacts. Identique à l'admin /admin/crm et à l'API
// /api/admin/crm : même table, mêmes statuts, même audit admin_audit
// (au nom « slack:<pseudo> »).

type Bloc = Record<string, unknown>;

export const CRM_STATUTS = ["nouveau", "a_contacter", "en_cours", "repondu", "vip", "archive"];

const LIBELLE: Record<string, string> = {
  nouveau: "Nouveau", a_contacter: "À contacter", en_cours: "En cours",
  repondu: "Répondu", vip: "VIP", archive: "Archivé",
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NB_MAX = 150;

function dh(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export type SuiviCrm = { statut: string | null; tags: string[] | null; note: string | null };

export async function crmCourant(email: string): Promise<SuiviCrm | null> {
  const { data } = await authAdmin().from("crm_contacts")
    .select("statut, tags, note").ilike("email", email.toLowerCase()).maybeSingle();
  return (data as SuiviCrm | null) ?? null;
}

// Modal de recherche (Home tab, section CRM) : liste déroulante filtrable
// (le select Slack se filtre en tapant) des contacts connus (suivi CRM
// récent, comptes récents, derniers messages contact), plus un champ
// libre pour une adresse absente de la liste.
export async function modalRechercheCrm(): Promise<Record<string, unknown>> {
  const db = authAdmin();
  const [crm, comptes, contacts] = await Promise.all([
    db.from("crm_contacts").select("email, statut, maj_le").order("maj_le", { ascending: false }).limit(100).catch(() => ({ data: [] as { email: string; statut: string | null }[] })),
    db.from("comptes_utilisateurs").select("email, user_metadata, created_at").order("created_at", { ascending: false }).limit(100).catch(() => ({ data: [] as { email: string; user_metadata: Record<string, string> | null }[] })),
    db.from("contact_messages").select("email, created_at").order("created_at", { ascending: false }).limit(50).catch(() => ({ data: [] as { email: string }[] })),
  ]);
  const vus = new Set<string>();
  const options: { text: { type: "plain_text"; text: string }; value: string }[] = [];
  const ajouter = (email: string, etiquette: string) => {
    const e = (email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(e) || vus.has(e) || options.length >= NB_MAX) return;
    vus.add(e);
    const t = (etiquette ? etiquette + " : " : "") + e;
    options.push({ text: { type: "plain_text", text: t.slice(0, 75) }, value: e });
  };
  ((crm.data ?? []) as { email: string; statut: string | null }[]).forEach((r) => ajouter(r.email, "🎯 " + (LIBELLE[r.statut ?? "nouveau"] ?? r.statut ?? "Suivi")));
  ((comptes.data ?? []) as { email: string; user_metadata: Record<string, string> | null }[]).forEach((r) => {
    const meta = r.user_metadata ?? {};
    const nom = [meta.prenom, meta.nom].filter(Boolean).join(" ");
    ajouter(r.email, nom ? "👤 " + nom : "👤 Compte");
  });
  ((contacts.data ?? []) as { email: string }[]).forEach((r) => ajouter(r.email, "✉️ Contact"));
  const blocs: Bloc[] = [];
  if (options.length) {
    blocs.push({ type: "input", optional: true, block_id: "liste", element: { type: "static_select", action_id: "v", placeholder: { type: "plain_text", text: "Tape pour filtrer (" + options.length + " contacts)" }, options }, label: { type: "plain_text", text: "Dans la liste" } });
  }
  blocs.push({ type: "input", optional: true, block_id: "q", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "adresse e-mail absente de la liste" } }, label: { type: "plain_text", text: options.length ? "Ou saisis une adresse" : "Adresse e-mail" } });
  blocs.push({ type: "context", elements: [{ type: "mrkdwn", text: "Vue 360° : compte, messages contact, newsletter, alertes, enquête et suivi CRM. Équivalent de /admin/crm/<email>." }] });
  return {
    type: "modal", callback_id: "crm_recherche",
    title: { type: "plain_text", text: "Fiche contact" },
    submit: { type: "plain_text", text: "Chercher" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: blocs,
  };
}

// Modal d'édition du suivi (statut, tags, note). L'e-mail voyage dans
// private_metadata : jamais dans un bloc visible.
export function modalSuivi(email: string, courant: SuiviCrm | null): Record<string, unknown> {
  const options = CRM_STATUTS.map((s) => ({ text: { type: "plain_text", text: LIBELLE[s] }, value: s }));
  const statutCourant = courant?.statut && CRM_STATUTS.includes(courant.statut) ? courant.statut : "nouveau";
  return {
    type: "modal", callback_id: "crm_maj",
    private_metadata: JSON.stringify({ email: email.toLowerCase().slice(0, 200) }),
    title: { type: "plain_text", text: "Suivi CRM" },
    submit: { type: "plain_text", text: "Enregistrer" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: [
      { type: "input", block_id: "statut", element: { type: "static_select", action_id: "v", options, initial_option: { text: { type: "plain_text", text: LIBELLE[statutCourant] }, value: statutCourant } }, label: { type: "plain_text", text: "Statut" } },
      { type: "input", optional: true, block_id: "tags", element: { type: "plain_text_input", action_id: "v", initial_value: (courant?.tags ?? []).join(", "), placeholder: { type: "plain_text", text: "ex. presse, partenaire (séparés par des virgules)" } }, label: { type: "plain_text", text: "Tags (facultatifs)" } },
      { type: "input", optional: true, block_id: "note", element: { type: "plain_text_input", action_id: "v", multiline: true, max_length: 4000, initial_value: courant?.note ?? "" }, label: { type: "plain_text", text: "Note (facultative)" } },
      { type: "context", elements: [{ type: "mrkdwn", text: "Enregistré dans le suivi CRM (" + email.toLowerCase() + "), visible dans l'admin." }] },
    ],
  };
}

// Fiche 360° d'une personne (Home tab → CRM → Fiche contact).
export async function ficheCrm(q: string): Promise<Bloc[]> {
  const email = q.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error("Indique une adresse e-mail valide.");
  const db = authAdmin();
  const [comptes, contacts, newsletter, alertes, survey, crm] = await Promise.all([
    db.from("comptes_utilisateurs").select("id, email, created_at, last_sign_in_at, user_metadata").ilike("email", email).limit(1),
    db.from("contact_messages").select("sujet, statut, created_at, repondu_at").ilike("email", email).order("created_at", { ascending: false }).limit(10),
    db.from("newsletter_subscribers").select("confirmed, unsubscribed_at, subscribed_at").ilike("email", email).limit(5),
    db.from("alert_subscriptions").select("frequence, active").ilike("email", email).limit(20),
    db.from("survey_reponses").select("repondu_le, note_global, commentaire").ilike("email", email).order("cree_le", { ascending: false }).limit(5),
    db.from("crm_contacts").select("statut, tags, note, maj_le").ilike("email", email).maybeSingle(),
  ]);
  const u = ((comptes.data ?? [])[0]) as { email: string; created_at: string; last_sign_in_at: string | null; user_metadata: Record<string, string> | null } | undefined;
  const msgs = (contacts.data ?? []) as { sujet: string | null; statut: string | null; created_at: string; repondu_at: string | null }[];
  const nl = (newsletter.data ?? []) as { confirmed: boolean; unsubscribed_at: string | null; subscribed_at: string }[];
  const al = (alertes.data ?? []) as { frequence: string; active: boolean }[];
  const sv = (survey.data ?? []) as { repondu_le: string | null; note_global: number | null }[];
  const suivi = (crm.data ?? null) as { statut: string | null; tags: string[] | null; note: string | null; maj_le: string | null } | null;
  if (!u && !msgs.length && !nl.length && !al.length && !sv.length && !suivi) {
    throw new Error("Aucune trace de cette adresse : compte, messages, abonnements, enquête ou suivi.");
  }

  const meta = u?.user_metadata ?? {};
  const nom = [meta.prenom, meta.nom].filter(Boolean).join(" ") || meta.full_name || meta.name || "";
  let identite = u
    ? "*Compte :* oui" + (nom ? " (" + nom + ")" : "") + ", inscrit le " + dh(u.created_at) + ", dernière connexion " + dh(u.last_sign_in_at)
    : "*Compte :* aucun";
  if (nl.length) {
    const etat = nl.some((n) => n.confirmed && !n.unsubscribed_at) ? "abonné(e)" : nl[0].unsubscribed_at ? "désinscrit(e)" : "en attente de confirmation";
    identite += "\n*Newsletter :* " + etat + " (depuis " + dh(nl[0].subscribed_at) + ")";
  }
  if (al.length) identite += "\n*Alertes :* " + al.map((a) => (a.active ? "" : "(inactive) ") + a.frequence).join(", ");
  if (sv.length) identite += "\n*Enquête :* " + (sv[0].repondu_le ? "répondue le " + dh(sv[0].repondu_le) + ", note " + (sv[0].note_global ?? "–") + "/5" : "invitation sans réponse");

  const morceaux: Bloc[] = [
    { type: "header", text: { type: "plain_text", text: "👤 " + (u?.email ?? email), emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: identite } },
  ];
  if (msgs.length) {
    morceaux.push({ type: "section", text: { type: "mrkdwn", text: "*✉️ Messages contact (" + msgs.length + ") :*\n" + msgs.map((m) => "• " + dh(m.created_at) + " : " + (m.sujet || "(sans objet)").slice(0, 100) + (m.repondu_at ? " (répondu)" : " *sans réponse*")).join("\n") } });
  }
  if (suivi) {
    morceaux.push({ type: "section", text: { type: "mrkdwn", text: "*🎯 Suivi CRM :* " + (LIBELLE[suivi.statut ?? "nouveau"] ?? suivi.statut) + (suivi.maj_le ? ", maj " + dh(suivi.maj_le) : "") + (suivi.tags?.length ? "\n*Tags :* " + suivi.tags.join(", ") : "") + (suivi.note ? "\n*Note :* " + suivi.note.slice(0, 600) : "") } });
  }
  morceaux.push({ type: "actions", elements: [
    { type: "button", text: { type: "plain_text", text: "🎯 Modifier le suivi" }, action_id: "crm_editer", value: email },
  ] });
  return morceaux;
}

// Enregistre le suivi (statut, tags, note) : upsert crm_contacts + audit.
export async function majCrm(
  qui: string, email: string, statut: string | undefined, tags: string[] | undefined, note: string | undefined,
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { ok: false, erreur: "adresse e-mail invalide" };
  if (statut && !CRM_STATUTS.includes(statut)) return { ok: false, erreur: "statut inconnu" };
  const valeurs: Record<string, unknown> = { email: e, maj_le: new Date().toISOString(), maj_par: "slack:" + qui };
  if (statut !== undefined) valeurs.statut = statut;
  if (tags !== undefined) valeurs.tags = tags.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20);
  if (note !== undefined) valeurs.note = note.trim() ? note.trim().slice(0, 4000) : null;
  const { error } = await authAdmin().from("crm_contacts").upsert(valeurs);
  if (error) return { ok: false, erreur: "crm_contacts : " + error.message };
  try {
    await authAdmin().from("admin_audit").insert({ github_login: "slack:" + qui, action: "crm.maj", cible: e, details: { statut, tags } });
  } catch { /* audit best-effort */ }
  return { ok: true };
}
