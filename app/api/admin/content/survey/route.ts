import { avecAdmin, erreur } from "@/lib/adminRoute";
import { authAdmin } from "@/lib/supabaseAdmin";
import { bouton, expedier, hashJeton, piedObligatoire } from "@/lib/mail";
import { randomToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

// Enquête utilisateurs (survey.dataparl.fr) : liste des réponses et détail.
// ?id= : la réponse entière (qui, notes, commentaire). Le prénom/nom du compte
// est retrouvé via l'auth au moment de la lecture.
export async function GET(req: Request) {
  return avecAdmin(req, async () => {
    const db = authAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (id) {
      const { data } = await db.from("survey_reponses").select("*").eq("id", id).limit(1);
      const r = data?.[0] as (Record<string, string | number | null> & { user_id: string | null; email: string }) | undefined;
      if (!r) return erreur(404, "réponse introuvable");
      let qui: { prenom: string; nom: string } | null = null;
      if (r.user_id) {
        const { data: u } = await db.auth.admin.getUserById(r.user_id);
        const m = (u.user?.user_metadata ?? {}) as Record<string, string>;
        const complet = String(m.full_name ?? m.name ?? "").trim();
        const nomComplet = complet.includes(" ") ? complet.split(" ").slice(-1)[0] : "";
        qui = { prenom: m.prenom ?? (complet.split(" ").slice(0, -1).join(" ") || ""), nom: m.nom ?? nomComplet };
      }
      return { reponse: r, qui };
    }
    const { data } = await db.from("survey_reponses")
      .select("id, email, user_id, note_experience, note_contenu, note_global, commentaire, cree_le, repondu_le")
      .order("cree_le", { ascending: false })
      .limit(500);
    return { reponses: data ?? [] };
  }, "contenu_enquete");
}

// Renvoyer l'invitation : une nouvelle ligne (nouveau jeton) et un e-mail
// depuis enquetes@dataparl.fr avec le lien personnel du questionnaire.
export async function POST(req: Request) {
  return avecAdmin(req, async () => {
    const { id } = (await req.json().catch(() => ({}))) as { id?: string };
    if (!id) return erreur(400, "id manquant");
    const db = authAdmin();
    const { data: ligne } = await db.from("survey_reponses")
      .select("email, user_id, repondu_le").eq("id", id).limit(1);
    const r = ligne?.[0] as { email: string; user_id: string | null; repondu_le: string | null } | undefined;
    if (!r) return erreur(404, "réponse introuvable");
    if (r.repondu_le) return erreur(409, "déjà répondue : pas besoin de renvoyer");
    const jeton = randomToken(24);
    const { error } = await db.from("survey_reponses").insert({
      user_id: r.user_id, email: r.email, jeton_hash: hashJeton(jeton),
    });
    if (error) {
      console.error("survey insert", error);
      return erreur(500, "enquête momentanément indisponible");
    }
    const url = `https://survey.dataparl.fr/?j=${jeton}`;
    const res = await expedier({
      from: "enquetes@dataparl.fr",
      to: [r.email],
      subject: "Ton avis sur DataParl'",
      titre: "Ton avis compte",
      corpsHtml: [
        "<p>Bonjour,</p>",
        "<p>La dernière fois, notre questionnaire n'a malheureusement pas abouti à cause d'un problème de notre côté — il est corrigé depuis. Si tu as 2 minutes, ton avis nous aiderait beaucoup à améliorer DataParl'.</p>",
        bouton(url, "Donner mon avis (2 min)"),
        '<p style="color:#4A5670">Si le bouton ne fonctionne pas, copie-colle ce lien : <a href="' + url + '" style="color:#4A5670">' + url + '</a></p>',
      ].join(""),
      text: [
        "Bonjour,",
        "",
        "La dernière fois, notre questionnaire n'a malheureusement pas abouti à cause d'un problème de notre côté — il est corrigé depuis. Si tu as 2 minutes, ton avis nous aiderait beaucoup à améliorer DataParl'.",
        "",
        url,
        "",
        "Merci !",
        "L'équipe DataParl'",
      ].join("\n"),
      type: "transactionnel",
      pied: piedObligatoire(),
    });
    if (!res.ok) return erreur(502, "e-mail non envoyé : " + res.error);
    return { envoye: true };
  }, "contenu_enquete");
}