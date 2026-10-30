// Familles politiques : correspondance des groupes entre Sénat, Assemblée
// nationale et Parlement européen. Les groupes changent de nom et de sigle au
// fil des législatures : on ajoute ici chaque nouveau sigle (avec ses dates)
// sans rien casser, les anciens restent reconnus pour l'historique.
// Sans dépendance (partagé serveur / navigateur, testé).

export type Chambre = "assemblee" | "senat" | "europarl";

export type GroupeChambre = {
  chambre: Chambre;
  sigle: string; // tel qu'il apparaît dans les données
  libelle: string;
  depuis?: string; // année ou date
  jusqua?: string;
};

export type Famille = { code: string; libelle: string; groupes: GroupeChambre[] };

const g = (chambre: Chambre, sigle: string, libelle: string, depuis?: string, jusqua?: string): GroupeChambre =>
  ({ chambre, sigle, libelle, depuis, jusqua });

export const FAMILLES: Famille[] = [
  { code: "LFI", libelle: "Insoumis", groupes: [
    g("assemblee", "LFI-NFP", "La France insoumise - Nouveau Front Populaire", "2024"),
    g("assemblee", "LFI-NUPES", "La France insoumise - NUPES", "2022", "2024"),
    g("assemblee", "LFI", "La France insoumise", "2017", "2022"),
    g("assemblee", "FI", "La France insoumise", "2017", "2022"),
    g("assemblee", "LFI - NUPES", "La France insoumise - NUPES", "2022", "2024"),
    g("europarl", "GUE/NGL", "La Gauche (The Left)"),
  ] },
  { code: "COM", libelle: "Communistes et gauche démocrate", groupes: [
    g("assemblee", "GDR", "Gauche démocrate et républicaine"),
    g("assemblee", "GDR-NUPES", "Gauche démocrate et républicaine - NUPES", "2022", "2024"),
    g("assemblee", "GDR - NUPES", "Gauche démocrate et républicaine - NUPES", "2022", "2024"),
    g("senat", "CRCE-K", "Communiste Républicain Citoyen et Écologiste - Kanaky", "2023"),
    g("senat", "CRCE", "Communiste républicain citoyen et écologiste", "2017", "2023"),
    g("senat", "CRC", "Communiste républicain et citoyen", undefined, "2017"),
  ] },
  { code: "SOC", libelle: "Socialistes", groupes: [
    g("assemblee", "SOC", "Socialistes et apparentés"),
    g("assemblee", "NG", "Nouvelle Gauche", "2017", "2018"),
    g("assemblee", "SRC", "Socialiste, républicain et citoyen", undefined, "2016"),
    g("assemblee", "S.R.C.", "Socialiste, radical, citoyen et divers gauche", undefined, "2012"),
    g("assemblee", "SER", "Socialistes et apparentés", "2012", "2017"),
    g("senat", "SER", "Socialiste, Écologiste et Républicain", "2020"),
    g("senat", "SOCR", "Socialiste et républicain", "2017", "2020"),
    g("senat", "SOC", "Socialiste", undefined, "2017"),
    g("europarl", "S&D", "Socialistes et démocrates"),
  ] },
  { code: "ECO", libelle: "Écologistes", groupes: [
    g("assemblee", "EcoS", "Écologiste et Social", "2024"),
    g("assemblee", "ECOLO", "Écologiste", "2022", "2024"),
    g("assemblee", "Ecolo", "Écologiste - NUPES", "2022", "2024"),
    g("assemblee", "Ecolo - NUPES", "Écologiste - NUPES", "2022", "2024"),
    g("assemblee", "EDS", "Écologie Démocratie Solidarité", "2020", "2021"),
    g("senat", "ECO", "Écologiste", "2012", "2017"),
    g("senat", "GEST", "Écologiste - Solidarité et Territoires", "2020"),
    g("senat", "ECOLO", "Écologiste", "2012", "2017"),
    g("europarl", "Verts/ALE", "Les Verts / Alliance libre européenne"),
  ] },
  { code: "REN", libelle: "Renaissance et apparentés", groupes: [
    g("assemblee", "EPR", "Ensemble pour la République", "2024"),
    g("assemblee", "RE", "Renaissance", "2022", "2024"),
    g("assemblee", "LREM", "La République en Marche", "2017", "2022"),
    g("assemblee", "LaREM", "La République en Marche", "2017", "2022"),
    g("senat", "RDPI", "Rassemblement des démocrates, progressistes et indépendants", "2020"),
    g("senat", "LREM", "La République En Marche", "2017", "2020"),
    g("europarl", "Renew", "Renew Europe", "2019"),
    g("europarl", "ALDE", "Alliance des démocrates et des libéraux pour l'Europe", undefined, "2019"),
  ] },
  { code: "DEM", libelle: "Démocrates (MoDem)", groupes: [
    g("assemblee", "Dem", "Les Démocrates", "2022"),
    g("assemblee", "DEM", "Démocrate", "2022"),
    g("assemblee", "MODEM", "Mouvement démocrate et apparentés", "2017", "2022"),
  ] },
  { code: "HOR", libelle: "Horizons et Indépendants", groupes: [
    g("assemblee", "HOR", "Horizons & Indépendants", "2022"),
    g("assemblee", "Agir-E", "Agir ensemble", "2019", "2022"),
    g("assemblee", "Agir ens", "Agir ensemble", "2019", "2022"),
    g("senat", "RTLI", "Les Indépendants - République et Territoires", "2017"),
    g("senat", "INDEP", "Les Indépendants - République et Territoires", "2017"),
  ] },
  { code: "CEN", libelle: "Centristes", groupes: [
    g("senat", "UC", "Union Centriste"),
    g("assemblee", "UDI-I", "UDI et Indépendants", "2018", "2022"),
    g("assemblee", "UAI", "UDI, Agir et Indépendants", "2017", "2018"),
    g("assemblee", "UDI", "Union des démocrates et indépendants", "2012", "2017"),
    g("assemblee", "UDI-AGIR", "UDI, Agir et Indépendants", "2017", "2018"),
    g("assemblee", "LC", "Les Constructifs", "2017", "2018"),
    g("assemblee", "NC", "Nouveau Centre", undefined, "2012"),
    g("assemblee", "UDF", "Union pour la démocratie française", undefined, "2007"),
  ] },
  { code: "LR", libelle: "Droite républicaine", groupes: [
    g("assemblee", "DR", "Droite Républicaine", "2024"),
    g("assemblee", "LR", "Les Républicains", "2015", "2024"),
    g("assemblee", "UMP", "Union pour un mouvement populaire", undefined, "2015"),
    g("assemblee", "Les Républicains", "Les Républicains", "2015", "2017"),
    g("assemblee", "Rassemblement-UMP", "Rassemblement-UMP", "2012", "2013"),
    g("senat", "RPR", "Rassemblement pour la République", undefined, "2002"),
    g("senat", "RI", "Républicains et indépendants", undefined, "2002"),
    g("senat", "LR", "Les Républicains"),
    g("senat", "UMP", "Union pour un mouvement populaire", undefined, "2015"),
    g("europarl", "PPE", "Parti populaire européen"),
  ] },
  { code: "LIOT", libelle: "Libertés et territoires", groupes: [
    g("assemblee", "LIOT", "Libertés, Indépendants, Outre-mer et Territoires", "2020"),
    g("assemblee", "LT", "Libertés et Territoires", "2018", "2020"),
  ] },
  { code: "RAD", libelle: "Radicaux", groupes: [
    g("senat", "RDSE", "Rassemblement Démocratique et Social Européen"),
    g("assemblee", "RRDP", "Radical, républicain, démocrate et progressiste", "2012", "2017"),
  ] },
  { code: "UDR", libelle: "Union des droites", groupes: [
    g("assemblee", "UDR", "Union des droites pour la République", "2024"),
  ] },
  { code: "RN", libelle: "Rassemblement national", groupes: [
    g("assemblee", "RN", "Rassemblement National", "2022"),
    g("europarl", "PfE", "Patriotes pour l'Europe", "2024"),
    g("europarl", "ID", "Identité et démocratie", "2019", "2024"),
    g("europarl", "ENL", "Europe des nations et des libertés", "2015", "2019"),
    g("europarl", "EFDD", "Europe de la liberté et de la démocratie directe", "2014", "2019"),
  ] },
  { code: "ECR", libelle: "Conservateurs et réformistes", groupes: [
    g("europarl", "ECR", "Conservateurs et réformistes européens"),
  ] },
  { code: "ESN", libelle: "Europe des nations souveraines", groupes: [
    g("europarl", "ESN", "Europe des nations souveraines", "2024"),
  ] },
  { code: "NI", libelle: "Non-inscrits", groupes: [
    g("assemblee", "NI", "Non inscrits"),
    g("senat", "NI", "Réunion administrative des sénateurs ne figurant sur la liste d'aucun groupe"),
    g("senat", "RASNAG", "Réunion administrative des sénateurs ne figurant sur la liste d'aucun groupe"),
    g("europarl", "NI", "Non-inscrits"),
  ] },
];

export const NOM_CHAMBRE: Record<Chambre, string> = { assemblee: "AN", senat: "Sénat", europarl: "PE" };

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9/&]+/g, " ").trim();

// Famille d'un sigle de groupe dans une chambre (ou null si inconnu).
export function familleDe(chambre: string, sigle: string): Famille | null {
  if (!sigle) return null;
  const s = norm(sigle);
  return FAMILLES.find((f) => f.groupes.some((x) => x.chambre === chambre && norm(x.sigle) === s)) ?? null;
}

// Sigles couverts par une valeur de filtre : un code de famille (« ECO »)
// donne tous ses groupes ; un sigle (« GEST ») donne ce seul groupe.
export function siglesDe(valeur: string, chambre?: string): string[] {
  const f = FAMILLES.find((x) => x.code === valeur);
  if (f) return [...new Set(f.groupes.filter((x) => !chambre || x.chambre === chambre).map((x) => x.sigle))];
  return [valeur];
}

// Résumé lisible : « GEST au Sénat, EcoS à l'AN, Verts/ALE au PE » (groupes actuels).
export function resume(f: Famille): string {
  const actuels = f.groupes.filter((x) => !x.jusqua);
  const parChambre = (["senat", "assemblee", "europarl"] as Chambre[])
    .map((c) => actuels.find((x) => x.chambre === c))
    .filter((x): x is GroupeChambre => !!x);
  return parChambre.map((x) => `${x.sigle} ${x.chambre === "senat" ? "au Sénat" : x.chambre === "assemblee" ? "à l'AN" : "au PE"}`).join(", ");
}

export type Suggestion = { valeur: string; libelle: string; detail: string; famille: string };

// Autocomplétion : « GEST », « verts », « écolo » ou « ECO » proposent la
// famille ECO, puis les groupes correspondants.
export function suggererGroupes(saisie: string, max = 8): Suggestion[] {
  const q = norm(saisie);
  if (!q) return FAMILLES.map((f) => ({ valeur: f.code, libelle: `${f.code}, ${f.libelle}`, detail: resume(f), famille: f.code }));
  // Score : sigle ou code exact (3), début du code, du libellé ou d'un sigle (2),
  // mot d'un libellé de groupe (1). Les familles les mieux classées d'abord.
  const score = (f: Famille) => {
    const exact = norm(f.code) === q || f.groupes.some((x) => norm(x.sigle) === q);
    const debut = [f.code, f.libelle, ...f.groupes.map((x) => x.sigle)].some((x) => norm(x).startsWith(q));
    const mot = [f.libelle, ...f.groupes.map((x) => x.libelle)].some((x) => norm(x).split(" ").some((m) => m.startsWith(q)));
    return exact ? 3 : debut ? 2 : mot ? 1 : 0;
  };
  const out: Suggestion[] = [];
  const classees = FAMILLES.map((f) => ({ f, s: score(f) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  for (const { f } of classees) {
    out.push({ valeur: f.code, libelle: `${f.code}, ${f.libelle}`, detail: resume(f), famille: f.code });
    for (const x of f.groupes) {
      const n = norm(x.sigle);
      if ((n.startsWith(q) || norm(x.libelle).split(" ").some((m) => m.startsWith(q))) && !out.some((o) => o.valeur === x.sigle)) {
        out.push({ valeur: x.sigle, libelle: `${x.sigle} (${NOM_CHAMBRE[x.chambre]})`, detail: x.libelle + (x.jusqua ? `, jusqu'en ${x.jusqua}` : ""), famille: f.code });
      }
    }
  }
  return out.slice(0, max);
}
