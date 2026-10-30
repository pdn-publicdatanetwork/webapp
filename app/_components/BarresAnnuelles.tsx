// Petit graphique en barres (une série, une chambre) : une barre par année,
// la dernière année (en cours) en teinte atténuée. Survol : valeur exacte.
type Point = { an: number; valeur: number | null; detail?: string };

export default function BarresAnnuelles({ points, couleur, titre, format, max, enCours }: {
  points: Point[]; couleur: string; titre: string; format: (v: number) => string; max?: number; enCours?: number;
}) {
  const L = 520, H = 180, G = 46, B = 22, pad = 8;
  const vals = points.map((p) => p.valeur ?? 0);
  const haut = max ?? Math.max(0.0001, ...vals) * 1.15;
  const largeur = (L - G) / Math.max(1, points.length);
  const y = (v: number) => H - B - (v / haut) * (H - B - pad);
  const graduations = [0, haut / 2, haut].map((v) => ({ v, y: y(v) }));
  return (
    <figure className="graphique">
      <figcaption>{titre}</figcaption>
      <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={titre} style={{ width: "100%", height: "auto", maxWidth: L }}>
        {graduations.map((g, i) => (
          <g key={i}>
            <line x1={G} x2={L} y1={g.y} y2={g.y} stroke="var(--line)" strokeWidth={1} />
            <text x={G - 6} y={g.y + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{format(g.v)}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const v = p.valeur ?? 0;
          const x = G + i * largeur + largeur * 0.18;
          const w = largeur * 0.64;
          const h = Math.max(0, H - B - y(v));
          const partiel = enCours === p.an;
          return (
            <g key={p.an}>
              <title>{`${p.an}${partiel ? " (année en cours)" : ""} : ${p.valeur === null ? "–" : format(v)}${p.detail ? `, ${p.detail}` : ""}`}</title>
              <rect x={G + i * largeur} y={pad} width={largeur} height={H - B - pad} fill="transparent" />
              {p.valeur !== null && <path d={`M${x},${H - B} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${w - 8} q4,0 4,4 v${Math.max(0, h - 4)} z`} fill={couleur} opacity={partiel ? 0.45 : 1} />}
              <text x={x + w / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{String(p.an).slice(2)}</text>
              {i === points.length - 1 && p.valeur !== null && (
                <text x={x + w / 2} y={y(v) - 6} textAnchor="middle" fontSize="11" fill="var(--ink)">{format(v)}</text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
