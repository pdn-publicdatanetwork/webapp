// Registre des pages publiques de dataparl.fr : source de vérité du module
// « Plan du site » de l'admin et du sitemap public. Une page désactivée (ou
// en brouillon) répond 404, ainsi que toutes ses sous-pages. Sans dépendance (testé).
export type Statut = "active" | "desactivee" | "brouillon";
export type PageSite = { chemin: string; titre: string; verrou?: string; dynamique?: string; sitemap?: boolean };

export const PAGES: PageSite[] = [
  { chemin: "/", titre: "Accueil", verrou: "L'accueil ne désactive pas", sitemap: true },
  { chemin: "/an", titre: "Assemblée nationale", sitemap: true },
  { chemin: "/senat", titre: "Sénat", sitemap: true },
  { chemin: "/pe", titre: "Parlement européen", sitemap: true },
  { chemin: "/mouvements", titre: "Mouvements", dynamique: "une page par chambre", sitemap: true },
  { chemin: "/daily", titre: "DataParl' Daily (jour par jour)", dynamique: "une page par jour publié", sitemap: true },
  { chemin: "/collab", titre: "Collaborateurs", dynamique: "une fiche par collaborateur, une page d'accueil et une liste par chambre", sitemap: true },
  { chemin: "/collab/an/trombinoscope", titre: "Trombinoscope des collaborateurs de député", sitemap: true },
  { chemin: "/collab/senat/trombinoscope", titre: "Trombinoscope des collaborateurs de Sénateur", sitemap: true },
  { chemin: "/collab/pe/trombinoscope", titre: "Trombinoscope des collaborateurs de député européen", sitemap: true },
  { chemin: "/collab/parti", titre: "Collaborateurs par parti politique", dynamique: "une fiche par parti", sitemap: true },
  { chemin: "/collab/pe/tiers-payants", titre: "Tiers payants du Parlement européen", dynamique: "une fiche par structure", sitemap: true },
  { chemin: "/collab/pe/prestataires", titre: "Prestataires de services du Parlement européen", dynamique: "une fiche par structure", sitemap: true },
  { chemin: "/collab/pe/reseau", titre: "Le réseau des collaborateurs du Parlement européen", sitemap: true },
  { chemin: "/gouv", titre: "Gouvernements et cabinets ministériels", dynamique: "les gouvernements depuis 2012, une fiche par ministre et une fiche par membre de cabinet", sitemap: true },
  { chemin: "/lexique", titre: "Lexique des collaborateurs parlementaires", sitemap: true },
  { chemin: "/parlementaires", titre: "Parlementaires", dynamique: "une fiche par élu, une biographie par élu", sitemap: true },
  { chemin: "/parlementaires/map", titre: "Carte des permanences parlementaires", sitemap: true },
  { chemin: "/senatoriales2026", titre: "Sénatoriales 2026", dynamique: "une page par département renouvelé", sitemap: true },
  { chemin: "/groupe", titre: "Groupes parlementaires", dynamique: "une fiche par groupe et par chambre, et une par mandature (législature, série ou scrutin)", sitemap: true },
  { chemin: "/departement", titre: "Départements", dynamique: "une fiche par département", sitemap: true },
  { chemin: "/parti", titre: "Partis politiques", dynamique: "une fiche par parti", sitemap: true },
  { chemin: "/methode", titre: "Méthode", dynamique: "les pages méthode (VigiParl', MixiParl', sources)", sitemap: true },
  { chemin: "/methode/sources", titre: "Méthode · sources", sitemap: true },
  { chemin: "/questions", titre: "Questions fréquentes", sitemap: true },
  { chemin: "/vigiparl", titre: "VigiParl'", sitemap: true },
  { chemin: "/vigiparl/methode", titre: "VigiParl' · méthode", sitemap: true },
  { chemin: "/vigiparl/timeline", titre: "VigiParl' · année par année", sitemap: true },
  { chemin: "/vigiparl/an", titre: "VigiParl' · Turnover Assemblée nationale", sitemap: true },
  { chemin: "/vigiparl/senat", titre: "VigiParl' · Turnover Sénat", sitemap: true },
  { chemin: "/vigiparl/pe", titre: "VigiParl' · Turnover Parlement européen", sitemap: true },
  { chemin: "/vigiparl/an/parlementaires", titre: "VigiParl' · Assemblée, par élu", sitemap: true },
  { chemin: "/vigiparl/senat/parlementaires", titre: "VigiParl' · Sénat, par élu", sitemap: true },
  { chemin: "/vigiparl/pe/parlementaires", titre: "VigiParl' · Parlement européen, par élu", sitemap: true },
  { chemin: "/mixiparl", titre: "MixiParl'", sitemap: true },
  { chemin: "/mixiparl/methode", titre: "MixiParl' · méthode", sitemap: true },
  { chemin: "/mixiparl/timeline", titre: "MixiParl' · année par année", sitemap: true },
  { chemin: "/mixiparl/an/parlementaires", titre: "MixiParl' · Assemblée, par élu", sitemap: true },
  { chemin: "/mixiparl/senat/parlementaires", titre: "MixiParl' · Sénat, par élu", sitemap: true },
  { chemin: "/mixiparl/pe/parlementaires", titre: "MixiParl' · Parlement européen, par élu", sitemap: true },
  { chemin: "/alertes", titre: "Alertes par email", sitemap: true },
  { chemin: "/presse", titre: "Presse & médias", sitemap: true },
  { chemin: "/presse/communiques", titre: "Communiqués de presse", dynamique: "une page par communiqué publié", sitemap: true },
  { chemin: "/faq", titre: "Questions fréquentes", sitemap: true },
  { chemin: "/a-propos", titre: "À propos", sitemap: true },
  { chemin: "/questions/qui-sont-les-collaborateurs-parlementaires", titre: "Étude · Qui sont les collaborateurs parlementaires", sitemap: true },
  { chemin: "/questions/combien-de-collaborateurs", titre: "Étude · Combien de collaborateurs", sitemap: true },
  { chemin: "/questions/mixite-des-equipes", titre: "Étude · Mixité des équipes", sitemap: true },
  { chemin: "/questions/turnover-des-equipes", titre: "Étude · Turnover des équipes", sitemap: true },
  { chemin: "/espace-api", titre: "Espace API", sitemap: true },
  { chemin: "/espace-api/docs", titre: "Documentation API", sitemap: true },
  { chemin: "/espace-api/donnees", titre: "Données de l'API", sitemap: true },
  { chemin: "/contact", titre: "Contact", sitemap: true },
  { chemin: "/notice/ads", titre: "Notice · publicité", sitemap: true },
  { chemin: "/informations-legales", titre: "Informations légales", verrou: "Pages obligatoires", dynamique: "mentions, CGU, confidentialité, cookies, licences", sitemap: true },
  { chemin: "/sitemap", titre: "Plan du site", sitemap: true },
  { chemin: "/connexion", titre: "Connexion", verrou: "Nécessaire aux comptes" },
  { chemin: "/mon-compte", titre: "Mon compte", verrou: "Nécessaire aux comptes" },
  { chemin: "/preferences", titre: "Préférences de communication", verrou: "Lien présent dans les emails" },
  { chemin: "/desinscription", titre: "Désinscription", verrou: "Lien présent dans les emails" },
];

export const cheminConnu = (c: string) => PAGES.some((p) => p.chemin === c && !p.verrou);

// Vrai si le chemin demandé tombe sous un chemin inactif (lui-même ou un parent).
export function estInactif(chemin: string, inactifs: Iterable<string>): boolean {
  const c = chemin.length > 1 ? chemin.replace(/\/+$/, "") : chemin;
  for (const i of inactifs) if (i !== "/" && (c === i || c.startsWith(`${i}/`))) return true;
  return false;
}

// Arbre d'affichage : profondeur d'après le chemin.
export const profondeur = (chemin: string) => (chemin === "/" ? 0 : chemin.split("/").length - 1);
