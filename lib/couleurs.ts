// Couleurs des chambres et des partis / groupes politiques, pour les petites
// pastilles des fiches. Teintes usuelles de la presse française : indicatives,
// jamais officielles ; un sigle inconnu retombe sur un gris neutre. Module
// pur (sans « server-only »), testé dans lib/couleurs.test.ts.

// Chambres : Sénat en rouge, Assemblée nationale en bleu, Parlement européen
// en bleu européen (le drapeau de l'UE, #003399).
export const COULEUR_CHAMBRE: Record<string, string> = {
  assemblee: "#164DFF",
  senat: "#D71920",
  europarl: "#003399",
};

export const NOM_CHAMBRE: Record<string, string> = {
  assemblee: "Assemblée nationale", senat: "Sénat", europarl: "Parlement européen",
};

export const COULEUR_NEUTRE = "#8A8F98";

// Partis et groupes parlementaires (sigles du référentiel, en majuscules).
// Les sigles à casse significative (« Divers centre », « Nouvelle Énergie »)
// sont rangés à part, en dessous.
export const COULEUR_PARTI: Record<string, string> = {
  // Métropole
  RN: "#002B5C",            // Rassemblement national : bleu marine
  "RN-UDR": "#002B5C",      // groupe RN-UDR au Sénat : même famille
  UDR: "#0E4C9A",           // Union des droites pour la République
  LR: "#0066CC",            // Les Républicains
  "LR/DVD": "#0066CC",
  PS: "#FF8080",            // Parti socialiste : rose
  SOC: "#FF8080",           // Socialistes (Sénat) : rose
  SER: "#FF8080",           // Socialistes, écologistes et républicains : rose
  RDSE: "#E76FB5",          // Rassemblement démocratique et social européen : rose radical
  LFI: "#E30613",           // La France insoumise : rouge
  "LFI-NFP": "#E30613",
  NFP: "#E30613",
  PCF: "#B01218",           // Parti communiste : rouge sombre
  CRC: "#B01218",           // Communiste, républicain, citoyen et écologiste (Sénat)
  "CRCE-K": "#B01218",
  GDR: "#A6192E",           // Gauche démocrate et républicaine
  EELV: "#00A95C",          // Les Écologistes : vert
  ECOS: "#00A95C",          // Écologiste (Sénat) : vert
  RE: "#F9A52A",            // Renaissance : orange
  ENS: "#F9A52A",           // Ensemble
  MODEM: "#FBB03B",         // MoDem : orange
  HOR: "#0092C3",           // Horizon : bleu clair
  UDI: "#009FE3",
  RDPI: "#F19E38",          // Rassemblement des démocrates... : orange radical
  UC: "#0EA5E9",            // Union des centristes (Sénat) : bleu clair
  IRT: "#0E9AA7",           // Les Indépendants – République et Territoires : sarcelle
  INDEP: "#0E9AA7",
  GEST: "#6B5B95",          // teinte violette (pas de couleur usuelle connue)
  NI: "#8A8F98",            // Non-inscrits : gris neutre
  DVC: "#E6C700",           // Divers centre : jaune
  DVD: "#4D94DB",           // Divers droite : bleu clair
  DVG: "#F78FA7",           // Divers gauche : rose clair
  // Parlement européen
  PPE: "#3399FF",           // Parti populaire européen : bleu
  "S&D": "#E9445F",         // Socialistes et démocrates : rose-rouge
  PSE: "#E9445F",
  RENEW: "#FFD400",         // Renew Europe : jaune
  VERTS: "#00A650",         // Les Verts / Alliance libre européenne
  ALE: "#00A650",
  ECR: "#1B3E8C",           // Conservateurs et réformistes européens
  ESN: "#0A2D5C",           // Europe des nations souveraines
  PFE: "#002B5C",           // Patriotes pour l'Europe : bleu marine
  GUE: "#B01218",           // Gauche unie européenne / GUE-NGL
  "GUE/NGL": "#B01218",
  // Sigles à casse significative
  "Divers centre": "#E6C700",
  "Divers gauche": "#F78FA7",
  "Nouvelle Énergie": "#F2668B",
};

export function couleurParti(sigle: string): string {
  if (!sigle) return COULEUR_NEUTRE;
  return COULEUR_PARTI[sigle] ?? COULEUR_PARTI[sigle.toUpperCase()] ?? COULEUR_NEUTRE;
}

export function couleurChambre(chambre: string): string {
  return COULEUR_CHAMBRE[chambre] ?? COULEUR_NEUTRE;
}
