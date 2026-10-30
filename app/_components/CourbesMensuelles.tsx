// Courbes SVG maison pour l'historique mensuel des pages d'indicateurs
// (/vigiparl/<id>, /mixiparl/<id>). Aucune dépendance, aucun JavaScript :
// le SVG est rendu côté serveur. Sans antislash dans ce fichier.

export type Point = { mois: string; valeur: number | null };

const L = 720; // largeur du viewBox
const H = 240; // hauteur utile
const MARGE_G = 42;
const MARGE_B = 26;

const label = (mois: string): string => {
  const [a, m] = mois.split("-");
  return `${m}/${a.slice(2)}`;
};

function ligne(valeurs: (number | null)[], max: number, n: number): string {
  const pas = n > 1 ? (L - MARGE_G - 8) / (n - 1) : 0;
  const y = (v: number) => H - MARGE_B - (Math.max(0, Math.min(v, max)) / max) * (H - MARGE_B - 12);
  let d = "";
  let ouvert = false;
  valeurs.forEach((v, i) => {
    if (v === null || Number.isNaN(v)) { ouvert = false; return; }
    const x = MARGE_G + i * pas;
    const yy = y(v);
    d += `${ouvert ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)} `;
    ouvert = true;
  });
  return d.trim();
}

export function CourbeMensuelle({
  titre, points, couleur, max, format, legende,
}: {
  titre: string;
  points: Point[];
  couleur: string;
  max: number; // borne haute de l'axe (le plancher est toujours 0)
  format: (v: number) => string;
  legende?: string;
}) {
  if (points.length < 2) return <p className="meta">{titre} : pas encore assez de mois de suivi.</p>;
  const n = points.length;
  const valeurs = points.map((p) => p.valeur);
  const d = ligne(valeurs, max, n);
  const pas = n > 1 ? (L - MARGE_G - 8) / (n - 1) : 0;
  // Repères de mois : premier, milieu, dernier.
  const reperes = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  const grille = [0, 0.5, 1].map((t) => H - MARGE_B - t * (H - MARGE_B - 12));
  return (
    <figure className="histo">
      <figcaption>{titre}{legende ? <span className="meta">, {legende}</span> : null}</figcaption>
      <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`${titre}, mois par mois`}>
        {/* Axe : trois niveaux (0, milieu, max) */}
        {grille.map((y, i) => (
          <g key={i}>
            <line x1={MARGE_G} y1={y} x2={L - 8} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={MARGE_G - 6} y={y + 4} textAnchor="end" className="axe">{format(i === 0 ? 0 : i === 1 ? max / 2 : max)}</text>
          </g>
        ))}
        {/* Courbe + aire légère dessous */}
        <path d={`${d} L${(MARGE_G + (n - 1) * pas).toFixed(1)},${H - MARGE_B} L${MARGE_G},${H - MARGE_B} Z`} fill={couleur} opacity=".12" />
        <path d={d} fill="none" stroke={couleur} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {reperes.map((i) => (
          <text key={i} x={MARGE_G + i * pas} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="axe">{label(points[i].mois)}</text>
        ))}
      </svg>
    </figure>
  );
}

export function BarresMensuelles({
  titre, points,
}: {
  titre: string;
  points: { mois: string; arrivees: number; departs: number }[];
}) {
  if (points.length < 2) return null;
  const n = points.length;
  const pas = (L - MARGE_G - 8) / n;
  const max = Math.max(1, ...points.map((p) => Math.max(p.arrivees, p.departs)));
  const y = (v: number) => H - MARGE_B - (v / max) * (H - MARGE_B - 12);
  const reperes = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <figure className="histo">
      <figcaption>{titre}<span className="meta">, <span className="ok">■</span> arrivées <span className="meta">■</span> départs (max {max}/mois)</span></figcaption>
      <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`${titre}, mois par mois`}>
        <line x1={MARGE_G} y1={H - MARGE_B} x2={L - 8} y2={H - MARGE_B} stroke="var(--line)" />
        {points.map((p, i) => {
          const x = MARGE_G + i * pas + pas * 0.15;
          const w = Math.max(1.5, pas * 0.3);
          return (
            <g key={p.mois}>
              {p.arrivees > 0 && <rect x={x} y={y(p.arrivees)} width={w} height={H - MARGE_B - y(p.arrivees)} fill="var(--bleu)" opacity=".85" />}
              {p.departs > 0 && <rect x={x + w + 1} y={y(p.departs)} width={w} height={H - MARGE_B - y(p.departs)} fill="#c2410c" opacity=".8" />}
            </g>
          );
        })}
        {reperes.map((i) => (
          <text key={i} x={MARGE_G + i * pas + pas / 2} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="axe">{label(points[i].mois)}</text>
        ))}
      </svg>
    </figure>
  );
}
