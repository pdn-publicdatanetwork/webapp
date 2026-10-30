"use client";
import { useEffect, useRef, useState } from "react";

// Graphe relationnel (force graph) : un nœud central (la structure) relié
// à ses eurodéputés clients, colorés par groupe politique. SVG pur, sans
// dépendance : les positions de départ (cercle) sont rendues côté serveur,
// puis une simulation légère (répulsion + ressorts) les répartit dans le
// navigateur. Chaque nœud peut ouvrir une fiche DataParl'.

export type NoeudGraphe = { id: string; label: string; groupe?: string; href?: string };

const COULEURS: Record<string, string> = {
  "PfE": "#1e3a8a",
  "PPE": "#2563eb",
  "S&D": "#dc2626",
  "Renew": "#f59e0b",
  "ECR": "#0ea5e9",
  "GUE/NGL": "#7c3aed",
  "Verts/ALE": "#16a34a",
  "ESN": "#334155",
  "NI": "#94a3b8",
};
const couleur = (g?: string) => COULEURS[g ?? ""] || "#1E90FF";
const court = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

type Point = { x: number; y: number };

export default function GrapheRelations({
  centre,
  noeuds,
}: {
  centre: { id: string; label: string };
  noeuds: NoeudGraphe[];
}) {
  const W = 900;
  const n = noeuds.length;
  const H = n <= 8 ? 420 : n <= 24 ? 540 : 640;
  const R = Math.min(320, 130 + n * 7);

  const init = (): Point[] => {
    const cx = W / 2, cy = H / 2;
    const pts: Point[] = [{ x: cx, y: cy }];
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / Math.max(1, n) - Math.PI / 2;
      pts.push({ x: cx + R * Math.cos(a), y: cy + R * 0.72 * Math.sin(a) });
    }
    return pts;
  };
  const [pts, setPts] = useState<Point[]>(init);
  const tours = useRef(0);

  useEffect(() => {
    if (n === 0) return;
    tours.current = 0;
    let raf = 0;
    const pas = () => {
      setPts((anciens) => {
        const p = anciens.map((q) => ({ ...q }));
        const cx = W / 2, cy = H / 2;
        p[0].x += (cx - p[0].x) * 0.2;
        p[0].y += (cy - p[0].y) * 0.2;
        for (let i = 1; i <= n; i++) {
          for (let j = 1; j <= n; j++) {
            if (i === j) continue;
            const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y;
            const d2 = Math.max(25, dx * dx + dy * dy);
            const d = Math.sqrt(d2);
            const f = Math.min(0.6, 900 / d2);
            p[i].x += (dx / d) * f;
            p[i].y += (dy / d) * f;
          }
          const dx = p[i].x - p[0].x, dy = p[i].y - p[0].y;
          const d = Math.max(20, Math.hypot(dx, dy));
          const f = (d - R) * 0.012;
          p[i].x -= (dx / d) * f;
          p[i].y -= (dy / d) * f;
          p[i].x = Math.min(W - 80, Math.max(80, p[i].x));
          p[i].y = Math.min(H - 46, Math.max(46, p[i].y));
        }
        return p;
      });
      tours.current += 1;
      if (tours.current < 200) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [n, R, H]);

  const groupes = [...new Set(noeuds.map((x) => x.groupe).filter((g): g is string => !!g))];

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={"0 0 " + W + " " + H}
        style={{ width: "100%", height: "auto" }}
        role="img"
        aria-label={"Graphe relationnel : " + centre.label + " et ses " + n + " eurodéputé" + (n > 1 ? "s" : "") + " client" + (n > 1 ? "s" : "")}
      >
        {noeuds.map((x, i) => {
          const p = pts[i + 1];
          return (
            <line key={"l-" + x.id} x1={pts[0].x} y1={pts[0].y} x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth="1.5" />
          );
        })}
        <g>
          <title>{centre.label}</title>
          <circle cx={pts[0].x} cy={pts[0].y} r="30" fill="#b45309" stroke="#fff" strokeWidth="2" />
          <text x={pts[0].x} y={pts[0].y + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">
            {court(centre.label, 12)}
          </text>
          <text x={pts[0].x} y={pts[0].y + 50} textAnchor="middle" fontSize="13" fill="#1f2937" fontWeight="700">
            {court(centre.label, 30)}
          </text>
        </g>
        {noeuds.map((x, i) => {
          const p = pts[i + 1];
          const contenu = (
            <>
              <title>{x.label + (x.groupe ? ", " + x.groupe : "")}</title>
              <circle cx={p.x} cy={p.y} r="15" fill={couleur(x.groupe)} stroke="#fff" strokeWidth="2" />
              <text x={p.x} y={p.y + 31} textAnchor="middle" fontSize="11" fill="#334155">
                {court(x.label, 22)}
              </text>
            </>
          );
          return x.href ? (
            <a key={x.id} href={x.href}>{contenu}</a>
          ) : (
            <g key={x.id}>{contenu}</g>
          );
        })}
      </svg>
      {groupes.length > 0 && (
        <figcaption className="meta" style={{ textAlign: "center" }}>
          {groupes.map((g) => (
            <span key={g} style={{ marginLeft: "12px", whiteSpace: "nowrap" }}>
              <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: couleur(g), marginRight: "4px", verticalAlign: "middle" }} />
              {g}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
