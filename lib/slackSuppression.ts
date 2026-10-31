import "server-only";
import { authAdmin, dataAdmin } from "./supabaseAdmin";

// Console Slack : suppression d'une ligne dans les rubriques de données.
// Pensée pour nettoyer les lignes de test. Cible une liste blanche de
// tables, un vrai DELETE, et une trace admin_audit au nom « slack:<pseudo> ».
// Les comptes utilisateurs ne sont pas concernés : comptes_utilisateurs est
// une vue sur auth.users, leur suppression passe par l'admin (dépendances
// GoTrue et cascades multiples).

type Bloc = Record<string, unknown>;

type Cible = "enquete" | "abonne" | "cle" | "telechargement" | "crm" | "journal";

const TABLES: Record<Cible, { db: "auth" | "data"; table: string; colonne: string; libelle: string }> = {
  enquete: { db: "auth", table: "survey_reponses", colonne: "id", libelle: "réponse/invitation à l'enquête" },
  abonne: { db: "auth", table: "newsletter_subscribers", colonne: "id", libelle: "abonné(e) newsletter" },
  cle: { db: "auth", table: "api_keys", colonne: "id", libelle: "clé API" },
  telechargement: { db: "data", table: "telechargements", colonne: "id", libelle: "téléchargement" },
  crm: { db: "auth", table: "crm_contacts", colonne: "email", libelle: "suivi CRM" },
  journal: { db: "auth", table: "associations_journal", colonne: "id", libelle: "ligne de journal" },
};

// Bouton de suppression (avec confirmation native Slack) : value = "cible:id".
export function boutonSuppression(cible: Cible, id: string, texte = "🗑 Supprimer"): Bloc {
  return { type: "actions", elements: [{ type: "button", style: "danger", text: { type: "plain_text", text: texte.slice(0, 75) }, action_id: "supprimer_ligne", value: (cible + ":" + id).slice(0, 190),
    confirm: { title: { type: "plain_text", text: "Supprimer ?" }, text: { type: "plain_text", text: "Cette ligne sera définitivement supprimée. Action tracée dans l'audit." }, confirm: { type: "plain_text", text: "Supprimer" }, deny: { type: "plain_text", text: "Annuler" }, style: "danger" } }] };
}

export async function supprimerLigne(qui: string, valeur: string): Promise<{ ok: true; message: string } | { ok: false; erreur: string }> {
  const sep = valeur.indexOf(":");
  if (sep <= 0) return { ok: false, erreur: "cible illisible" };
  const cible = valeur.slice(0, sep) as Cible;
  const id = valeur.slice(sep + 1).slice(0, 200);
  const c = TABLES[cible];
  if (!c || !id) return { ok: false, erreur: "rubrique inconnue ou ligne vide" };
  const db = c.db === "auth" ? authAdmin() : (dataAdmin() as unknown as ReturnType<typeof authAdmin>);
  const { error } = await db.from(c.table).delete().eq(c.colonne, id);
  if (error) return { ok: false, erreur: c.table + " : " + error.message };
  try {
    await authAdmin().from("admin_audit").insert({ github_login: "slack:" + qui, action: "slack.suppression", cible: c.table, details: { rubrique: cible, ligne: id } });
  } catch { /* audit best-effort */ }
  return { ok: true, message: "🗑️ " + c.libelle + " supprimé(e) (" + String(id).slice(0, 50) + ")." };
}
