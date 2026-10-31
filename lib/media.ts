// Photos des élus servies par DataParl' : media.dataparl.fr/<chambre>/<id>_<credit>_<taille>.png
// (aussi sous www.dataparl.fr/media/…). `credit` nomme le détenteur de l'image :
// an (Assemblée nationale), senat (Sénat), pe (Parlement européen), gouv
// (Gouvernement, d'après info.gouv.fr : le photographe est crédité sur la page).
// Sans dépendance (testé).
export const CODE_CHAMBRE: Record<string, "an" | "senat" | "pe" | "gouv"> = { assemblee: "an", senat: "senat", europarl: "pe", gouvernement: "gouv" };
export const CHAMBRE_DE_CODE: Record<string, "assemblee" | "senat" | "europarl" | "gouvernement"> = { an: "assemblee", senat: "senat", pe: "europarl", gouv: "gouvernement" };
export const CREDIT: Record<string, string> = { an: "Assemblée nationale", senat: "Sénat", pe: "Parlement européen", gouv: "Gouvernement (info.gouv.fr)" };
export const TAILLES = [96, 200, 400] as const;

export const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE ?? "https://media.dataparl.fr").replace(/\/$/, "");

// Institution détentrice et adresse où demander un accord (modification, recadrage).
export const INSTITUTION: Record<string, { libelle: string; contact: string; courriel?: string }> = {
  an: { libelle: "Assemblée nationale (direction de l'information multimédia)", contact: "dim@assemblee-nationale.fr", courriel: "dim@assemblee-nationale.fr" },
  senat: { libelle: "Sénat", contact: "l'adresse officielle fournie par le Sénat" },
  pe: { libelle: "Parlement européen", contact: "l'adresse officielle fournie par le Parlement européen" },
  gouv: { libelle: "info.gouv.fr (photographie officielle du Gouvernement)", contact: "le formulaire de contact de info.gouv.fr" },
};

export function cheminPhoto(chambre: string, slug: string, taille: (typeof TAILLES)[number] = 200): string | null {
  const c = CODE_CHAMBRE[chambre];
  if (!c || !slug) return null;
  return `${MEDIA_BASE}/${c}/${encodeURIComponent(slug)}_${c}_${taille}.png`;
}

export const photoAbsolue = (chambre: string, slug: string, taille: (typeof TAILLES)[number] = 400) => {
  const p = cheminPhoto(chambre, slug, taille);
  return p ? (p.startsWith("http") ? p : `https://www.dataparl.fr${p}`) : null;
};

// « sido_bruno01058x_senat_200.png » -> { id, credit, taille } (l'identifiant peut contenir des « _ »).
export function analyserFichier(fichier: string): { id: string; credit: string; taille: number } | null {
  const m = /^([\p{L}\p{N}_-]{1,80})_(an|senat|pe|gouv)_(\d{2,4})\.png$/u.exec(fichier);
  if (!m || !(TAILLES as readonly number[]).includes(Number(m[3]))) return null;
  return { id: m[1], credit: m[2], taille: Number(m[3]) };
}

// Seuls les sites officiels sont lus.
export function sourceAutorisee(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ["www.assemblee-nationale.fr", "www2.assemblee-nationale.fr", "www.senat.fr", "www.europarl.europa.eu", "www.info.gouv.fr"].includes(u.hostname);
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// Logos des groupes parlementaires : media.dataparl.fr/groupes/<sigle>-<chambre>-<législature>.png
// Ex. dem-an-XVIIe.png (groupe Dem, Assemblée nationale, XVIIe législature).
// Source des logos de l'AN : Datan (datan.fr), qui les publie par législature.
// ---------------------------------------------------------------------------

// Législature courante par chambre (numéro et forme romaine pour l'URL).
export const LEGISLATURES: Record<string, { num: number; romain: string }> = {
  assemblee: { num: 17, romain: "XVIIe" },
};

// Sigles des groupes AN (référentiel DataParl') → code du logo publié par Datan.
export const LOGOS_GROUPES: Record<string, string> = {
  Dem: "DEM", DR: "DR", EPR: "EPR", EcoS: "ECOS", GDR: "GDR", HOR: "HOR",
  "LFI-NFP": "LFI-NFP", LIOT: "LIOT", NI: "NI", RN: "RN", SOC: "SOC", UDR: "UDR",
};

// Adresse du logo source chez Datan, pour un groupe d'une chambre (si publié).
export function logoSource(chambre: string, sigle: string): string | null {
  if (chambre !== "assemblee") return null;
  const code = Object.entries(LOGOS_GROUPES).find(([s]) => s.toLowerCase() === (sigle ?? "").toLowerCase())?.[1];
  return code ? `https://datan.fr/assets/imgs/groupes/${LEGISLATURES.assemblee.num}/${code}.png` : null;
}

// URL du logo servi par DataParl' : media.dataparl.fr/groupes/dem-an-XVIIe.png
// Sigles des groupes Sénat et Parlement européen dont un logo peut être
// servi par DataParl' : media.dataparl.fr/groupes/<sigle>-<chambre>.png
// (sans mandature). La page retombe sur une pastille colorée si le fichier
// n'existe pas encore.
export const LOGOS_GROUPES_SENAT: readonly string[] = [
  "CRC", "CRCE-K", "RDSE", "RDPI", "ECOS", "GEST", "UC", "UNT", "INDEP", "IRT",
  "SOC", "PS", "LR", "RN", "RN-UDR", "UDR", "NI",
];
// Logos des groupes du Sénat embarqués dans la webapp, servis par
// /media/logos-groupes/<fichier> (modules base64, sans stockage externe).
// Source : pages Wikipedia des groupes, miniatures 200px.
export const LOGOS_GROUPES_SENAT_EMBARQUES: Record<string, string> = {
  SOC: "soc-senat.png",
  LR: "lr-senat.png",
  RDSE: "rdse-senat.png",
  PS: "ps-senat.png",
  "CRCE-K": "crce-k-senat.jpg",
  ECOS: "ecos-senat.jpg",
};

export const LOGOS_GROUPES_PE: readonly string[] = [
  "PPE", "S&D", "Renew", "PfE", "GUE/NGL", "ECR", "ESN", "Verts/ALE", "Verts", "NI",
];

export function cheminLogoGroupe(chambre: string, sigle: string): string | null {
  const s = (sigle ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!s) return null;
  if (chambre === "assemblee") {
    const leg = LEGISLATURES[chambre];
    return leg && logoSource(chambre, sigle)
      ? `${MEDIA_BASE}/groupes/${s}-${CODE_CHAMBRE[chambre]}-${leg.romain}.png`
      : null;
  }
  if (chambre === "senat") {
    const embarque = Object.entries(LOGOS_GROUPES_SENAT_EMBARQUES).find(([s]) => s.toLowerCase() === (sigle ?? "").toLowerCase());
    if (embarque) return `/media/logos-groupes/${embarque[1]}`;
  }
  const connus = chambre === "senat" ? LOGOS_GROUPES_SENAT : chambre === "europarl" ? LOGOS_GROUPES_PE : null;
  return connus && connus.some((x) => x.toLowerCase() === (sigle ?? "").toLowerCase())
    ? `${MEDIA_BASE}/groupes/${s}-${CODE_CHAMBRE[chambre]}.png`
    : null;
}

// « dem-an-XVIIe.png » -> { sigle: "dem", chambre: "assemblee", romain: "XVIIe" }
export function analyserLogoGroupe(fichier: string): { sigle: string; chambre: string; romain: string } | null {
  const m = /^([a-z0-9-]{1,20})-(an|senat|pe)-([IVXLC]+)e\.png$/.exec(fichier);
  if (!m) return null;
  const chambre = CHAMBRE_DE_CODE[m[2]];
  if (!chambre) return null;
  const leg = LEGISLATURES[chambre];
  if (!leg || m[3] !== leg.romain.replace(/e$/, "")) return null;
  return { sigle: m[1], chambre, romain: m[3] };
}
