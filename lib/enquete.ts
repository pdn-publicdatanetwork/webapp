// Priorités du questionnaire « Ton avis sur DataParl' » (survey.dataparl.fr).
// La même liste sert au parcours (puces de l'étape priorités) et à la
// validation serveur de /api/enquete/repondre.
export const PRIORITES = [
  "Vitesse du site",
  "Recherche",
  "Profondeur des données",
  "Lisibilité des fiches",
  "Alertes e-mail",
  "Offre sans pub",
  "Documentation de l'API",
  "Jobs",
  "Autre chose",
] as const;
export type Priorite = (typeof PRIORITES)[number];
