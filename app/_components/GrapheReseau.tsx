"use client";
import { useEffect, useRef, useState } from "react";

// Graphe de réseau biparti : structures (tiers payants, prestataires) et
// eurodéputés, reliés par les contrats. Révèle d'un coup d'œil les structures
// en lien avec beaucoup d'élus et les interconnexions : un eurodéputé relié
// à plusieurs structures fait le pont entre elles. SVG pur, sans dépendance :
// positions initiales en cercle rendues côté serveur, puis simulation de
// forces (répulsion, ressorts, gravité centrale) dans le navigateur.

export type NoeudReseau = {
  id: string;
  label: string;
  type: "structure" | "elu";
  groupe?: string;
  poids?: number;   // degrés : nombre de liens du nœud
  href?: string;
};

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
const couleur = (n: NoeudReseau) =>
  n.type === "structure" ? "#b45309" : COULEURS[n.groupe ?? ""] || "#1E90FF";
const rayon = (n: NoeudReseau) =>
  n.type === "structure" ? Math.min(24, 9 + (n.poids ?? 1) * 1.6) : 9;
const court = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

type P = { x: number; y: number };

export default function GrapheReseau({
  noeuds,
  aretes,
}: {
  noeuds: NoeudReseau[];
  aretes: { source: string; target: string }[];
}) {
  const W = 1100, H = 720;
  const n = noeuds.length;
  const idx = new Map(noeuds.map((x, i) => [x.id, i] as [string, number]));

  const init = (): P[] => {
    const cx = W / 2, cy = H / 2;
    const structures = noeuds.filter((x) => x.type === "structure").length;
    const elus = n - structures;
    let iS = 0, iE = 0;
    return noeuds.map((x) => {
      if (x.type === "structure") {
        const a = (2 * Math.PI * iS++) / Math.max(1, structures);
        return { x: cx + 150 * Math.cos(a), y: cy + 110 * Math.sin(a) };
      }
      const a = (2 * Math.PI * iE++) / Math.max(1, elus);
      const r = 300;
      return { x: cx + r * Math.cos(a), y: cy + (r * 0.8) * Math.sin(a) };
    });
  };
  const [pts, setPts] = useState<P[]>(init);
  const tours = useRef(0);

  useEffect(() => {
    if (n === 0) return;
    tours.current = 0;
    let raf = 0;
    const pas = () => {
      setPts((anciens) => {
        const p = anciens.map((q) => ({ ...q }));
        const cx = W / 2, cy = H / 2;
        // Répulsion entre tous les nœuds.
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y;
            const d2 = Math.max(400, dx * dx + dy * dy);
            const d = Math.sqrt(d2);
            const f = Math.min(1.2, 2600 / d2);
            const fx = (dx / d) * f, fy = (dy / d) * f;
            p[i].x += fx; p[i].y += fy;
            p[j].x -= fx; p[j].y -= fy;
          }
        }
        // Ressorts le long des contrats structure–élu.
        for (const a of aretes) {
          const ia = idx.get(a.source), ib = idx.get(a.target);
          if (ia === undefined || ib === undefined) continue;
          const dx = p[ib].x - p[ia].x, dy = p[ib].y - p[ia].y;
          const d = Math.max(1, Math.hypot(dx, dy));
          const f = (d - 100) * 0.02;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          p[ia].x += fx; p[ia].y += fy;
          p[ib].x -= fx; p[ib].y -= fy;
        }
        // Gravité centrale + bornes.
        for (let i = 0; i < n; i++) {
          p[i].x += (cx - p[i].x) * 0.004;
          p[i].y += (cy - p[i].y) * 0.004;
          p[i].x = Math.min(W - 50, Math.max(50, p[i].x));
          p[i].y = Math.min(H - 30, Math.max(30, p[i].y));
        }
        return p;
      });
      tours.current += 1;
      if (tours.current < 350) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [n, aretes, idx]);

  const groupes = [...new Set(noeuds.filter((x) => x.type === "elu").map((x) => x.groupe).filter((g): g is string => !!g))];

  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", height: "auto" }} role="img"
        aria-label={"Réseau des structures et de leurs " + noeuds.filter((x) => x.type === "elu").length + " eurodéputés clients"}>
        {aretes.map((a, i) => {
          const ia = idx.get(a.source), ib = idx.get(a.target);
          if (ia === undefined || ib === undefined) return null;
          return <line key={"a-" + i} x1={pts[ia].x} y1={pts[ia].y} x2={pts[ib].x} y2={pts[ib].y} stroke="#cbd5e1" strokeWidth="1" />;
        })}
        {noeuds.map((x, i) => {
          const p = pts[i];
          const r = rayon(x);
          const c = couleur(x);
          const contenu = (
            <>
              <title>{x.label + (x.groupe ? ", " + x.groupe : "") + (x.poids ? ", " + x.poids + " lien(s)" : "")}</title>
              <circle cx={p.x} cy={p.y} r={r} fill={c} stroke="#fff" strokeWidth={x.type === "structure" ? 2 : 1.5} />
              {x.type === "structure" && (
                <text x={p.x} y={p.y + r + 13} textAnchor="middle" fontSize="10.5" fill="#1f2937" fontWeight="600">
                  {court(x.label, 26)}
                </text>
              )}
            </>
          );
          return x.href ? <a key={x.id} href={x.href}>{contenu}</a> : <g key={x.id}>{contenu}</g>;
        })}
      </svg>
      <figcaption className="meta" style={{ textAlign: "center" }}>
        <span style={{ marginLeft: "12px" }}>
          <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#b45309", marginRight: "4px", verticalAlign: "middle" }} />
          Structures
        </span>
        {groupes.map((g) => (
          <span key={g} style={{ marginLeft: "12px", whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: COULEURS[g] || "#1E90FF", marginRight: "4px", verticalAlign: "middle" }} />
            {g}
          </span>
        ))}
        <span className="meta" style={{ display: "block", marginTop: "6px" }}>
          Taille des nœuds = nombre de liens. Chaque nœud ouvre sa fiche (survol : détail).
        </span>
      </figcaption>
    </figure>
  );
}
