// Matrice de permissions de l'équipe : le rôle donne les accès par défaut,
// une ligne de staff_permissions (autorisé / refusé) les affine module par
// module. Les administrateurs ont toujours tout. Sans dépendance (testé).
export type Role = "admin" | "editeur" | "utilisateur";

export const MODULES = [
  { cle: "boites_communes", libelle: "Emails génériques", detail: "hello@, contact@, presse@, rgpd@… dans la messagerie", defaut: ["editeur"] },
  { cle: "formulaires", libelle: "Formulaires", detail: "Messages de contact et oppositions", defaut: ["editeur"] },
  { cle: "crm", libelle: "CRM", detail: "Vue 360° par e-mail : comptes, contacts, newsletter, alertes, enquête, presse et suivi", defaut: ["editeur"] },
  { cle: "elus", libelle: "Élus", detail: "Biographies, mandats et fonctions des élus (édition manuelle)", defaut: ["editeur"] },
  { cle: "jorf", libelle: "JORF", detail: "Balayage du Journal officiel : gouvernements et cabinets ministériels", defaut: ["editeur"] },
  { cle: "comptes", libelle: "Comptes et abonnés", detail: "Liste des utilisateurs et des abonnés aux alertes", defaut: ["editeur"] },
  { cle: "contenu_sitemap", libelle: "Plan du site", detail: "Activer, désactiver ou passer une page en brouillon", defaut: [], reserve: true },
  { cle: "contenu_sheets", libelle: "DataParl' Sheets", detail: "Publier ou masquer une feuille du tableur media.dataparl.fr/sheets", defaut: [], reserve: true },
  { cle: "contenu_liens", libelle: "Liens tracés", detail: "Créer des liens courts et lire leurs statistiques", defaut: ["editeur"] },
  { cle: "contenu_enquete", libelle: "Enquête utilisateurs", detail: "Réponses au questionnaire survey.dataparl.fr : qui, quand, notes", defaut: [], reserve: true },
  { cle: "communication", libelle: "Communication", detail: "Communiqués, carnet presse, mailing", defaut: ["editeur"] },
  { cle: "cles_api", libelle: "Clés API", detail: "Demandes et clés d'accès à l'API", defaut: [], reserve: true },
  { cle: "journal", libelle: "Journal", detail: "Journal d'activité de l'équipe", defaut: [], reserve: true },
] as const satisfies readonly { cle: string; libelle: string; detail: string; defaut: readonly Role[]; reserve?: boolean }[];

// Modules réservés aux administrateurs (protégés par la double authentification) : la matrice ne peut pas les ouvrir.
export const reserve = (module: string) => MODULES.some((m) => m.cle === module && "reserve" in m && m.reserve);

export type Module = (typeof MODULES)[number]["cle"];
export const CLES_MODULES = MODULES.map((m) => m.cle) as Module[];

export function defaut(role: Role, module: Module): boolean {
  if (role === "admin") return true;
  return (MODULES.find((m) => m.cle === module)?.defaut as readonly Role[] | undefined)?.includes(role) ?? false;
}

// Modules ouverts à un compte, compte tenu de ses réglages particuliers.
export function modulesDe(role: Role, reglages: { module: string; autorise: boolean }[]): Module[] {
  if (role === "admin") return [...CLES_MODULES];
  const r = new Map(reglages.map((x) => [x.module, x.autorise]));
  return CLES_MODULES.filter((m) => !reserve(m) && (r.get(m) ?? defaut(role, m)));
}
