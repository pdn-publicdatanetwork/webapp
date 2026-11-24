// Indicateurs de mixité des équipes (sans dépendance, testé).
// Équipes éligibles aux indicateurs de mixité : 2 personnes ou plus, toutes de genre déterminé.
export function mixite(rows: { femmes: number; hommes: number; indetermines: number }[]) {
  const deuxPlus = rows.filter((r) => r.femmes + r.hommes + r.indetermines >= 2);
  const eligibles = deuxPlus.filter((r) => r.indetermines === 0);
  const paritaires = eligibles.filter((r) => { const p = r.femmes / (r.femmes + r.hommes); return p >= 0.4 && p <= 0.6; }).length;
  const nonMixtes = eligibles.filter((r) => r.femmes === 0 || r.hommes === 0).length;
  return { eligibles: eligibles.length, exclues: deuxPlus.length - eligibles.length, paritaires, nonMixtes };
}


// Taux de mixité d'une équipe : 100 % à 50/50, 0 % si l'équipe ne compte que
// des femmes ou que des hommes. tauxDeMixité = 1 − |2 × partDeFemmes − 1|.
export function tauxMixite(x: { femmes: number; hommes: number }): number | null {
  const n = x.femmes + x.hommes;
  return n > 0 ? 1 - Math.abs((2 * x.femmes) / n - 1) : null;
}

// Écart de genre d'une équipe : part de femmes moins part d'hommes. Positif si
// l'équipe compte plus de femmes que d'hommes, négatif dans le cas contraire,
// 0 à effectifs égaux, +1 ou −1 si l'équipe ne compte qu'un seul genre.
// Relation exacte avec le taux : taux de mixité = 1 − |écart de genre|.
export function ecartGenre(x: { femmes: number; hommes: number }): number | null {
  const n = x.femmes + x.hommes;
  return n > 0 ? (x.femmes - x.hommes) / n : null;
}

// L'écart de genre ne se moyenne jamais : des équipes très féminines et très
// masculines s'annuleraient dans un écart moyen proche de 0 alors qu'aucune
// n'est mixte. Pas de moyenne d'écart ici : les agrégats (chambres, groupes,
// familles) gardent la part de femmes, pondérée par personne.

// Écart de genre écrit en points : « +33,3 pts », « −50 pts », « 0 pt » à la parité.
export const ptsEcartGenre = (v: number | null) => {
  if (v === null) return "–";
  const s = (Math.abs(v) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return v > 0 ? `+${s} pts` : v < 0 ? `−${s} pts` : `0 pt`;
};

// Sens de l'écart de genre d'une équipe : « parité » à effectifs égaux, « majorité
// féminine » ou « majorité masculine » sinon ; une équipe d'un seul genre est
// signalée comme entièrement féminine ou entièrement masculine.
export function libelleMajorite(x: { femmes: number; hommes: number }): string | null {
  const n = x.femmes + x.hommes;
  if (!n) return null;
  if (x.femmes === x.hommes) return "parité";
  if (x.hommes === 0) return "équipe entièrement féminine";
  if (x.femmes === 0) return "équipe entièrement masculine";
  return x.femmes > x.hommes ? "majorité féminine" : "majorité masculine";
}

// Une équipe est éligible si elle compte 2 personnes ou plus, toutes de genre déterminé.
export const equipeEligible = (r: { femmes: number; hommes: number; indetermines: number }) =>
  r.femmes + r.hommes + r.indetermines >= 2 && r.indetermines === 0;

// Taux de mixité d'un ensemble (chambre, groupe, famille) : moyenne des taux de ses équipes éligibles.
export function mixiteMoyenne(rows: { femmes: number; hommes: number; indetermines: number }[]): { taux: number | null; equipes: number } {
  const t = rows.filter(equipeEligible).map((r) => tauxMixite(r) ?? 0);
  return { taux: t.length ? t.reduce((a, b) => a + b, 0) / t.length : null, equipes: t.length };
}
