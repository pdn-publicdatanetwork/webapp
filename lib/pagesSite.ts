// Pages du site proposées par la recherche globale. Sans dépendance (testé).
export type PageSite = { libelle: string; detail: string; href: string; mots: string };

export const PAGES_SITE: PageSite[] = [
  { libelle: "VigiParl'", detail: "Le renouvellement des équipes, élu par élu", href: "/vigiparl", mots: "vigiparl renouvellement turnover departs equipes classement" },
  { libelle: "MixiParl'", detail: "La mixité femmes-hommes des équipes", href: "/mixiparl", mots: "mixiparl mixite parite femmes hommes genre" },
  { libelle: "Mouvements", detail: "Rechercher dans les trois chambres", href: "/mouvements/parlement", mots: "mouvements arrivees departs transferts historique recherche" },
  { libelle: "Les mouvements du jour", detail: "Jour par jour, depuis 2015", href: "/daily", mots: "daily jour aujourd hui quotidien calendrier mouvements du jour" },
  { libelle: "Parlementaires", detail: "Chaque élu, son équipe et ses mandats", href: "/parlementaires", mots: "parlementaires elus deputes senateurs eurodeputes liste biographie bio" },
  { libelle: "Sénatoriales 2026", detail: "Les nouveaux sénateurs, département par département", href: "/senatoriales2026", mots: "senatoriales 2026 senateurs renouvellement scrutin election nouveaux sortants departements" },
  { libelle: "Groupes parlementaires", detail: "Les élus de chaque groupe, chambre par chambre", href: "/groupe", mots: "groupes politiques parlementaires senat assemblee rn lr ps lfi groupe fresnel" },
  { libelle: "Départements", detail: "Les élus par département", href: "/departement", mots: "departements elus gironde nord bouches rhone region circonscription" },
  { libelle: "Partis politiques", detail: "Tous les élus d'un parti, toutes chambres confondues", href: "/parti", mots: "partis politiques rn lr ps lfi modem elus toutes chambres" },
  { libelle: "Collaborateurs", detail: "Qui travaille pour quel élu", href: "/collab", mots: "collaborateurs assistants equipes collabs" },
  { libelle: "Alertes par email", detail: "Être prévenu(e) des mouvements", href: "/alertes", mots: "alertes email notification suivre abonnement" },
  { libelle: "Méthode", detail: "Comment DataParl' collecte et vérifie", href: "/methode", mots: "methode methodologie collecte verification pipeline officiel donnees" },
  { libelle: "Sources", detail: "Les publications officielles derrière chaque chiffre", href: "/methode/sources", mots: "sources publications officielles assemblee nationale senat agas licences citer" },
  { libelle: "Méthode VigiParl'", detail: "Comment le taux de renouvellement est calculé", href: "/vigiparl/methode", mots: "methode methodologie vigiparl calcul taux renouvellement" },
  { libelle: "Méthode MixiParl'", detail: "Comment la mixité est mesurée", href: "/mixiparl/methode", mots: "methode methodologie mixiparl genre parite calcul" },
  { libelle: "Le postulat MixiParl'", detail: "Pourquoi mesurer la mixité des équipes", href: "/mixiparl/postulat", mots: "postulat pourquoi mesure employeur parlementaires egalite professionnelle discrimination index rixain" },
  { libelle: "Presse & médias", detail: "Données et accès pour les rédactions", href: "/presse", mots: "presse medias journalistes redaction citer" },
  { libelle: "Questions fréquentes", detail: "FAQ", href: "/faq", mots: "faq questions aide" },
  { libelle: "Contact", detail: "Nous écrire", href: "/contact", mots: "contact ecrire message" },
];

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function pagesPour(saisie: string, max = 3): PageSite[] {
  const mots = norm(saisie).split(" ").filter(Boolean);
  if (!mots.length) return [];
  return PAGES_SITE.filter((p) => {
    const toks = norm(`${p.libelle} ${p.mots}`).split(" ");
    return mots.every((m) => toks.some((t) => t.startsWith(m)));
  }).slice(0, max);
}
