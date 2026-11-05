// Helpers de texte partagés entre la page de détail (server) et la liste +
// modal d'offre (client) : découpage de l'annonce, normalisation des
// conditions, extraction de l'e-mail de candidature. Sans dépendance
// à Next ou au serveur : utilisable des deux côtés.

export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Description d'annonce sans l'adresse e-mail de candidature, avec
// nettoyage de la ponctuation orpheline laissée par le retrait.
export const sansEmail = (t: string) =>
  t
    .replace(EMAIL_RE, "")
    .replace(/\s+à\s*[,;.]/g, ",")
    .replace(/\s*,\s*,/g, ",")
    .replace(/\s*:\s*[,;.]/g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();

export const CHAMBRE_NOM: Record<string, string> = {
  an: "Assemblée nationale",
  senat: "Sénat",
  pe: "Parlement européen",
};

export const dateFr = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

// Date relative : « il y a 2 jours ».
export const ilYA = (iso: string | null) => {
  if (!iso) return null;
  const j = Math.floor((Date.now() - new Date(iso + "T12:00:00Z").getTime()) / 86400000);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return "hier";
  if (j < 30) return "il y a " + j + " jours";
  if (j < 45) return "il y a 1 mois";
  return "il y a " + Math.floor(j / 30) + " mois";
};

export const nomElu = (o: { elu_prenom: string | null; elu_nom: string | null }) =>
  [o.elu_prenom, o.elu_nom].filter(Boolean).join(" ");

export const titreCourt = (t: string) => (t.length > 80 ? t.slice(0, 78) + "…" : t);

// Libellé du poste : on retire la mention « dans l'équipe du/de la … » des titres collectés,
// le titre affiché et le slug ne gardent que le poste.
export const titrePoste = (t: string) => {
  const nettoye = t.replace(/\s*dans\s+l['’]\s*équipes?\b.*/i, "").replace(/\s+/g, " ").trim();
  return nettoye.length >= 3 ? nettoye : t;
};

// Extrait : le chapeau de l'annonce, jusqu'à la première section.
export const extrait = (desc: string) => {
  if (!desc) return "";
  const coupe = desc.split(/\n(?=Vos missions|Profil recherché|Lieu|Rémunération|Pour candidater)/i)[0]
    .replace(/\s+/g, " ")
    .trim();
  const texte = coupe || desc.replace(/\s+/g, " ").trim();
  return texte.length > 190 ? texte.slice(0, 188) + "…" : texte;
};

// ── Découpage de la description en sections ─────────────────────────────────

export type Bloc = { titre: string; lignes: string[] };
const TITRES_SECTION =
  /^(Vos missions|Profil recherché|Lieu|Rémunération|Durée|Pour candidater|Process(?:us)? de recrutement|Informations pratiques)\s*:\s*(.*)$/i;
const MARQUEURS_INLINE =
  /\s+(?=(?:Vos missions|Profil recherché|Lieu|Rémunération|Durée|Pour candidater|Process(?:us)? de recrutement|Informations pratiques)\s*:)/gi;

export function decouper(desc: string): { chapeau: string[]; blocs: Bloc[] } {
  const chapeau: string[] = [];
  const blocs: Bloc[] = [];
  for (const ligne of desc.replace(MARQUEURS_INLINE, "\n").split(/\r?\n/)) {
    const m = ligne.trim().match(TITRES_SECTION);
    if (m) blocs.push({ titre: m[1], lignes: m[2] ? [m[2].trim()] : [] });
    else if (blocs.length) blocs[blocs.length - 1].lignes.push(ligne.trim());
    else if (ligne.trim()) chapeau.push(ligne.trim());
  }
  return { chapeau, blocs };
}

export const enPuces = (texte: string) =>
  texte
    .replace(/\s+/g, " ")
    .split(/(?<=[.);])\s+/)
    .map((s) => s.replace(/^[,;\s]+|[,;\s]+$/g, "").trim())
    .filter(Boolean);

// ── Normalisation des conditions ────────────────────────────────────────────

const CONTRATS = ["Stage", "CDD", "CDI", "Alternance"];
export function typeContrat(o: { type_poste?: string | null; description: string }): string {
  const src = ((o.type_poste ?? "") + " " + o.description).toLowerCase();
  for (const c of CONTRATS) if (src.includes(c.toLowerCase())) return c;
  return "Autre";
}
export { CONTRATS };

export function tempsTravail(desc: string): string | null {
  if (/temps\s+plein\s+(?:ou|et)\s+temps\s+partiel/i.test(desc)) return "Temps plein ou temps partiel";
  if (/temps\s+plein/i.test(desc)) return "Temps plein";
  if (/temps\s+partiel/i.test(desc)) return "Temps partiel";
  return null;
}

// Adresses institutionnelles normalisées.
const ADRESSES: [RegExp, string][] = [
  [/vaugirard/i, "15 rue de Vaugirard, 75006 Paris"],
  [/rue de l'universit[ée]|palais[- ]bourbon|assembl[ée]e nationale/i, "126 rue de l'Université, 75007 Paris"],
];
export function lieuNormalise(texte: string): string {
  const propre = texte.replace(/\s+/g, " ").replace(/^bureau\s+/i, "").replace(/[.,;\s]+$/, "").trim();
  for (const [motif, adresse] of ADRESSES) if (motif.test(propre)) return adresse;
  return propre;
}

// Ville principale d'une localisation d'offre : première partie avant virgule
// ou parenthèse, avec repli sur la seconde quand la première est une
// institution (Sénat, Assemblée nationale). Sert au SEO (titres, descriptions)
// et au JSON-LD (addressLocality).
export function villeDe(localisation: string | null): string | null {
  if (!localisation) return null;
  const segments = localisation.split(/[(,]/).map((x) => x.trim()).filter(Boolean);
  let s = segments[0] ?? null;
  if (s && /^(S[ée]nat|Assembl[ée]e nationale|Parlement europ[ée]en)$/i.test(s)) s = segments[1] ?? null;
  if (!s) return null;
  s = s.replace(/^Permanence (de |du |d')/i, "").replace(/^Bureau /i, "").trim();
  return s ? s.slice(0, 40) : null;
}

export function remuneration(texte: string): { type: string; montant: string | null; avantages: string[] } {
  const t = texte.replace(/\s+/g, " ").trim();
  const type = /gratification/i.test(t) ? "Gratification" : /salaire/i.test(t) ? "Salaire" : "Non précisé";
  const m = t.match(/(\d[\d\s]*(?:[.,]\d+)?)\s*(?:euros?|€)\s*(nets?|bruts?)?/i);
  const periode = /par\s+an|annuel/i.test(t) ? " / an" : /par\s+heure/i.test(t) ? " / heure" : " / mois";
  const montant = m
    ? m[1].replace(/[\s\u00a0]/g, " ").trim() + " €" + (m[2] ? " " + m[2].toLowerCase() : "") + periode
    : null;
  const avantages = t
    .split(/,\s*plus\b|\.\s*plus\b|,\s*avec\b|,\s*ainsi que\b/i)
    .slice(1)
    .map((a) => a.replace(/[\s.,;]+$/, "").trim())
    .filter(Boolean);
  return { type, montant, avantages };
}
