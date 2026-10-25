import { z } from "zod";
import { audit } from "@/lib/adminAuth";
import { avecAdmin, corps, erreur } from "@/lib/adminRoute";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// CRM : vue 360° par e-mail. Chaque « personne » fusionne toutes les relations
// dataparl.fr (compte, messages contact, newsletter, alertes, enquête, presse).
// Le suivi vient de crm_contacts (service_role seul), jamais exposé publiquement.
const STATUTS = ["nouveau", "a_contacter", "en_cours", "repondu", "vip", "archive"] as const;
const cle = (e: unknown) => String(e ?? "").trim().toLowerCase();
const iso = (v: unknown): string | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
};

type Personne = {
  email: string; prenom: string; compte: boolean;
  dernierLogin: string | null; creationCompte: string | null;
  nContacts: number; contactsSansReponse: number; dernierContact: string | null;
  newsletter: boolean; alertes: number; surveyInvite: boolean; surveyRepondu: boolean;
  noteGlobale: number | null; presse: boolean; statut: string | null; tags: string[]; note: string | null;
};

export async function GET(req: Request) {
  return avecAdmin(req, async () => {
    const db = authAdmin();
    const email = cle(new URL(req.url).searchParams.get("email"));

    // Fiche d'une personne (recherche insensible à la casse).
    if (email) {
      const [comptes, contacts, newsletter, alertes, survey, crm] = await Promise.all([
        db.from("comptes_utilisateurs").select("id, email, created_at, last_sign_in_at, user_metadata").ilike("email", email).limit(5),
        db.from("contact_messages").select("prenom, nom, email, sujet, message, statut, created_at, repondu_at, note_admin").ilike("email", email).order("created_at", { ascending: false }).limit(50),
        db.from("newsletter_subscribers").select("email, confirmed, subscribed_at, unsubscribed_at, source").ilike("email", email).limit(10),
        db.from("alert_subscriptions").select("email, frequence, chambres, active, created_at").ilike("email", email).limit(50),
        db.from("survey_reponses").select("email, cree_le, repondu_le, note_experience, note_contenu, note_global, commentaire").ilike("email", email).order("cree_le", { ascending: false }).limit(50),
        db.from("crm_contacts").select("email, statut, tags, note, maj_le, maj_par").ilike("email", email).maybeSingle(),
      ]);
      return {
        compte: (comptes.data ?? [])[0] ?? null,
        contacts: contacts.data ?? [],
        newsletter: newsletter.data ?? [],
        alertes: alertes.data ?? [],
        survey: survey.data ?? [],
        crm: crm.data ?? null,
      };
    }

    // Liste consolidée.
    const [comptes, contacts, newsletter, alertes, survey, crm, presse] = await Promise.all([
      db.from("comptes_utilisateurs").select("id, email, created_at, last_sign_in_at, user_metadata").order("created_at", { ascending: false }).limit(1000),
      db.from("contact_messages").select("email, sujet, statut, created_at, repondu_at").order("created_at", { ascending: false }).limit(1000),
      db.from("newsletter_subscribers").select("email, confirmed, unsubscribed_at").limit(1000),
      db.from("alert_subscriptions").select("email, active, frequence, chambres, created_at").limit(1000),
      db.from("survey_reponses").select("email, cree_le, repondu_le, note_global").limit(1000),
      db.from("crm_contacts").select("email, statut, tags, note").limit(1000),
      db.from("presse_contacts").select("email, actif").limit(500),
    ]);

    const personnes = new Map<string, Personne>();
    const p = (e: unknown): Personne => {
      const k = cle(e);
      if (!personnes.has(k)) personnes.set(k, {
        email: k, prenom: "", compte: false, dernierLogin: null, creationCompte: null,
        nContacts: 0, contactsSansReponse: 0, dernierContact: null,
        newsletter: false, alertes: 0, surveyInvite: false, surveyRepondu: false,
        noteGlobale: null, presse: false, statut: null, tags: [], note: null,
      });
      return personnes.get(k)!;
    };

    for (const c of (comptes.data ?? []) as Record<string, unknown>[]) {
      const x = p(c.email);
      x.compte = true;
      x.creationCompte = iso(c.created_at);
      x.dernierLogin = iso(c.last_sign_in_at);
      const m = (c.user_metadata ?? {}) as Record<string, string>;
      x.prenom = String(m.prenom ?? "").trim() || String(m.full_name ?? m.name ?? "").trim();
    }
    for (const c of (contacts.data ?? []) as Record<string, unknown>[]) {
      const x = p(c.email);
      x.nContacts += 1;
      if (!c.repondu_at) x.contactsSansReponse += 1;
      const d = iso(c.created_at);
      if (d && (!x.dernierContact || d > x.dernierContact)) x.dernierContact = d;
    }
    for (const n of (newsletter.data ?? []) as Record<string, unknown>[]) {
      if (!n.unsubscribed_at) p(n.email).newsletter = true;
    }
    for (const a of (alertes.data ?? []) as Record<string, unknown>[]) {
      if (a.active) p(a.email).alertes += 1;
    }
    for (const s of (survey.data ?? []) as Record<string, unknown>[]) {
      const x = p(s.email);
      x.surveyInvite = true;
      if (s.repondu_le) {
        x.surveyRepondu = true;
        if (typeof s.note_global === "number") x.noteGlobale = s.note_global;
      }
    }
    for (const pr of (presse.data ?? []) as Record<string, unknown>[]) {
      if (pr.actif) p(pr.email).presse = true;
    }
    for (const c of (crm.data ?? []) as Record<string, unknown>[]) {
      const x = p(c.email);
      x.statut = String(c.statut ?? "nouveau");
      x.tags = (c.tags as string[] | null) ?? [];
      x.note = (c.note as string | null) ?? null;
    }

    const liste = [...personnes.values()].sort((a, b) => {
      const da = a.dernierLogin ?? a.dernierContact ?? a.creationCompte ?? "";
      const db2 = b.dernierLogin ?? b.dernierContact ?? b.creationCompte ?? "";
      return db2.localeCompare(da);
    });
    return { personnes: liste };
  }, "crm");
}

const Maj = z.object({
  email: z.string().trim().toLowerCase().email(),
  statut: z.enum(STATUTS).optional(),
  tags: z.array(z.string().trim().toLowerCase().max(60)).max(20).optional(),
  note: z.string().max(4000).optional(),
});

// Suivi CRM : statut, tags et note d'une personne (table crm_contacts,
// service_role seul). Journalisé dans admin_audit.
export async function POST(req: Request) {
  return avecAdmin(req, async (a) => {
    const p = Maj.safeParse(await corps(req));
    if (!p.success) return erreur(400, "requête invalide");
    const valeurs: Record<string, unknown> = { email: p.data.email, maj_le: new Date().toISOString(), maj_par: a.github };
    if (p.data.statut !== undefined) valeurs.statut = p.data.statut;
    if (p.data.tags !== undefined) valeurs.tags = p.data.tags.filter(Boolean);
    if (p.data.note !== undefined) valeurs.note = p.data.note.trim() || null;
    const { error } = await authAdmin().from("crm_contacts").upsert(valeurs);
    if (error) throw error;
    await audit(a, "crm.maj", p.data.email, { statut: p.data.statut });
    return { ok: true };
  }, "crm");
}
