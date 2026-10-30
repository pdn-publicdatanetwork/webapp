import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { aujourdhuiParis, correspond, decaler, lundiDe, messageAlerte, type Abonnement, type MvtAlerte } from "@/lib/alertes";
import { nouveauJetonPreferences } from "@/lib/consent";
import { MAIL_WEB_URL } from "@/lib/env";
import { mouvementExclu } from "@/lib/exclusions";
import { COLONNES_PUBLIQUES, dataQueryTout } from "@/lib/data";
import { prenomNomAdresse } from "@/lib/gabarit";
import { expedier, piedOptIn } from "@/lib/mail";
import { cleElus } from "@/lib/referentiel";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Envoi des alertes, appelé chaque matin par la tâche planifiée de Vercel
// (vercel.json), après le passage quotidien de la collecte. Quotidien : les
// mouvements d'hier et d'aujourd'hui pas encore envoyés. Le lundi : le
// récapitulatif des 7 jours précédents. Idempotent (table alert_sends).
// Les liens de consentement (préférences, désinscription) vivent sur
// mail.dataparl.fr (MAIL_WEB_URL), l'hôte des versions en ligne des emails.
function autorise(req: Request): boolean {
  const s = process.env.CRON_SECRET ?? "";
  const recu = req.headers.get("authorization") ?? "";
  const attendu = `Bearer ${s}`;
  return !!s && recu.length === attendu.length && timingSafeEqual(Buffer.from(recu), Buffer.from(attendu));
}

// Heartbeat Better Stack (monitor « Cron alertes ») : signaler que le cron a
// bien tourné. Ping lancé sans attendre la réponse — son échec éventuel
// n'interrompt jamais l'envoi des alertes. Silencieux si l'URL n'est pas
// configurée (variable d'environnement, jamais dans le code : elle contient
// le jeton du heartbeat).
function pingHeartbeat() {
  const url = process.env.BETTERSTACK_HEARTBEAT_URL ?? "";
  if (url) fetch(url, { method: "GET", cache: "no-store" }).catch(() => {});
}

type Sub = Abonnement & { email: string; user_id: string | null; frequence: "quotidienne" | "hebdomadaire"; frequences: ("quotidienne" | "hebdomadaire")[] };

// « Prénom NOM » : les infos du compte (metadata de l'auth), plus rien à saisir.
async function destinataire(s: Sub): Promise<string | undefined> {
  if (!s.user_id) return undefined;
  const { data } = await authAdmin().auth.admin.getUserById(s.user_id);
  const meta = data.user?.user_metadata ?? {};
  if (meta.prenom || meta.nom) return prenomNomAdresse(String(meta.prenom ?? ""), String(meta.nom ?? ""));
  const complet = String(data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? "").trim();
  if (!complet.includes(" ")) return undefined;
  const mots = complet.split(/\s+/);
  return prenomNomAdresse(mots.slice(0, -1).join(" "), mots[mots.length - 1]);
}

export async function GET(req: Request) {
  if (!autorise(req)) return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  pingHeartbeat();
  const jour = aujourdhuiParis();
  const lundi = jour === lundiDe(jour);
  const db = authAdmin();


  const [{ data: subs, error }, { data: refus }] = await Promise.all([
    db.from("alert_subscriptions").select("email, user_id, frequence, frequences, chambres, types, groupes, elus").eq("active", true),
    db.from("communication_preferences").select("email").eq("alertes_enabled", false),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const exclus = new Set((refus ?? []).map((r) => r.email as string));
  const abonnes = ((subs ?? []) as Sub[]).filter((s) => !exclus.has(s.email));
  if (!abonnes.length) {
    await db.from("liens_clics").delete().lt("le", new Date(Date.now() - 395 * 86400_000).toISOString());
    return NextResponse.json({ ok: true, jour, envoyes: 0, abonnes: 0 });
  }

  // Exclusions temporaires (ex. fausses arrivées Sénat du 2026-10-09) :
  // jamais envoyées dans les DataParl' Daily et Weekly.
  const mvts = (await dataQueryTout<MvtAlerte>("mouvements", new URLSearchParams({
    select: `${COLONNES_PUBLIQUES},elu_origine_cle,elu_origine_id`, date_event: `gte.${decaler(jour, -7)}`, order: "date_event.desc,chambre.asc,id.asc",
  }), 0)).filter((m) => !mouvementExclu(m));

  const periodes = [`quotidienne:${jour}`, `quotidienne:${decaler(jour, -1)}`, `hebdomadaire:${jour}`];
  const { data: deja } = await db.from("alert_sends").select("email, periode").in("periode", periodes);
  const envoye = new Set((deja ?? []).map((d) => `${d.email}|${d.periode}`));

  const cacheIds = new Map<string, string[]>();
  const idsDe = async (elus: string[]) => {
    const out = new Set<string>();
    for (const e of elus) {
      if (!cacheIds.has(e)) cacheIds.set(e, await cleElus(e).catch(() => [e]));
      for (const x of cacheIds.get(e)!) out.add(x);
    }
    return out;
  };

  let envoyes = 0;
  const erreurs: string[] = [];
  for (const s of abonnes) {
    const ids = await idsDe(s.elus ?? []);
    const a: Abonnement = { ...s, chambres: s.chambres ?? [], types: s.types ?? [], groupes: s.groupes ?? [], elus: s.elus ?? [] };
    // Fréquences cumulables : Daily ET Weekly. Anciens réglages repris
    // automatiquement (colonne frequences vide = l'ancienne frequence).
    const freqs = s.frequences?.length ? s.frequences : [s.frequence];
    let choisis: MvtAlerte[] = [];
    let nouvelles: string[] = [];
    for (const freq of freqs) {
    const hebdo = freq === "hebdomadaire";
    try {
      if (hebdo) {
        if (!lundi || envoye.has(`${s.email}|hebdomadaire:${jour}`)) continue;
        choisis = mvts.filter((m) => m.date_event < jour && m.date_event >= decaler(jour, -7) && correspond(m, a, ids));
      } else {
        const dates = [decaler(jour, -1), jour].filter((d) => !envoye.has(`${s.email}|quotidienne:${d}`));
        choisis = mvts.filter((m) => dates.includes(m.date_event) && correspond(m, a, ids));
      }
      if (!choisis.length) continue;
      const msg = messageAlerte(choisis, freq, jour);
      const jeton = await nouveauJetonPreferences(s.email);
      const r = await expedier({
        to: [s.email], subject: msg.sujet, titre: msg.titre, corpsHtml: msg.html, text: msg.texte, type: "alerte",
        // Expéditeurs dédiés (à valider dans Resend, domaine dataparl.fr) :
        // dataparl-daily@ et dataparl-weekly@ — délivrabilité et filtres
        // indépendants des autres envois du site.
        from: hebdo ? "dataparl-weekly@dataparl.fr" : "dataparl-daily@dataparl.fr",
        nomExpediteur: hebdo ? "DataParl' Weekly" : "DataParl' Daily",
        edition: msg.edition, adressage: { date: jour, pour: await destinataire(s).catch(() => undefined) },
        pied: piedOptIn(`${MAIL_WEB_URL}/preferences?id=${jeton}`, `${MAIL_WEB_URL}/desinscription?id=${jeton}`),
        unsubscribeUrl: `${MAIL_WEB_URL}/api/desinscription?id=${jeton}`,
      });
      if (!r.ok) { erreurs.push(r.error); continue; }
      nouvelles = hebdo
        ? [`hebdomadaire:${jour}`]
        : [...new Set(choisis.map((m) => `quotidienne:${m.date_event}`))];
      await db.from("alert_sends").insert(nouvelles.map((periode) => ({ email: s.email, periode, message_id: r.resendId, n_mouvements: choisis.length })));
      envoyes += 1;
    } catch (e) {
      erreurs.push(e instanceof Error ? e.message : String(e));
    }
    }
  }
  // Ménage quotidien : les ouvertures de liens tracés sont gardées 13 mois.
  await db.from("liens_clics").delete().lt("le", new Date(Date.now() - 395 * 86400_000).toISOString());
  return NextResponse.json({ ok: erreurs.length === 0, jour, abonnes: abonnes.length, envoyes, erreurs: erreurs.slice(0, 5) });
}
