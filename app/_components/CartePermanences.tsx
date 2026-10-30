"use client";
// Carte SVG des permanences parlementaires : contours des départements
// (lib/carteDepartements), marqueurs projetés (lib/carteProjection), zoom à la
// molette, pan au glisser, filtres par chambre et panneau de détail.
import { useEffect, useMemo, useRef, useState } from "react";
import { DEPARTEMENTS, VIEWBOX } from "@/lib/carteDepartements";
import { projeter } from "@/lib/carteProjection";
import type { Permanence } from "@/lib/permanences";

const CHAMBRES = [
  { c: "assemblee", court: "Députés", couleur: "#1d4ed8" },
  { c: "senat", court: "Sénateurs", couleur: "#b91c1c" },
  { c: "europarl", court: "Eurodéputés", couleur: "#15803d" },
] as const;

const [VX, VY, VL, VH] = VIEWBOX.split(" ").map(Number);
const MIN_LARGEUR = 60;
const COULEUR = Object.fromEntries(CHAMBRES.map(({ c, couleur }) => [c, couleur]));

export default function CartePermanences({ points, maj }: { points: Permanence[]; maj: string | null }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [actives, setActives] = useState<Record<string, boolean>>({ assemblee: true, senat: true, europarl: true });
  const [vue, setVue] = useState({ x: VX, y: VY, w: VL, h: VH });
  const [choisi, setChoisi] = useState<Permanence | null>(null);
  const [q, setQ] = useState("");
  const drag = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null);

  const compter = useMemo(() => {
    const c: Record<string, number> = {};
    points.forEach((p) => { c[p.c] = (c[p.c] ?? 0) + 1; });
    return c;
  }, [points]);

  const marqueurs = useMemo(() => points
    .filter((p) => actives[p.c] && (!q || `${p.n} ${p.v}`.toLowerCase().includes(q.toLowerCase())))
    .map((p) => ({ p, ...projeter(p.lon, p.lat) })), [points, actives, q]);

  // Zoom molette : listener non passif pour pouvoir preventDefault.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      setVue((v) => {
        const w = Math.min(VL, Math.max(MIN_LARGEUR, v.w * (e.deltaY > 0 ? 1.18 : 1 / 1.18)));
        const h = (w * VH) / VL;
        const px = v.x + ((e.clientX - rect.left) / rect.width) * v.w;
        const py = v.y + ((e.clientY - rect.top) / rect.height) * v.h;
        const x = Math.max(0, Math.min(VL - w, px - (px - v.x) * (w / v.w)));
        const y = Math.max(0, Math.min(VH - h, py - (py - v.y) * (h / v.h)));
        return { x, y, w, h };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoom = (facteur: number) => setVue((v) => {
    const w = Math.min(VL, Math.max(MIN_LARGEUR, v.w * facteur));
    const h = (w * VH) / VL;
    const x = Math.max(0, Math.min(VL - w, v.x + (v.w - w) / 2));
    const y = Math.max(0, Math.min(VH - h, v.y + (v.h - h) / 2));
    return { x, y, w, h };
  });

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", margin: "12px 0" }}>
        {CHAMBRES.map(({ c, court, couleur }) => (
          <label key={c} style={{ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={!!actives[c]} disabled={!compter[c]} onChange={(e) => setActives((a) => ({ ...a, [c]: e.target.checked }))} />
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: couleur, display: "inline-block" }} />
            {court} ({compter[c] ?? 0})
          </label>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer : nom ou ville" aria-label="Filtrer les permanences" style={{ padding: "2px 8px" }} />
        <button onClick={() => zoom(1 / 1.4)} aria-label="Zoomer">+</button>
        <button onClick={() => zoom(1.4)} aria-label="Dézoomer">−</button>
        <button onClick={() => setVue({ x: VX, y: VY, w: VL, h: VH })}>Vue initiale</button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`${vue.x} ${vue.y} ${vue.w} ${vue.h}`}
        role="img"
        aria-label="Carte de France des permanences parlementaires"
        style={{ width: "100%", aspectRatio: "1000 / 1061", touchAction: "none", cursor: "grab", background: "#eef3f8", borderRadius: 8 }}
        onPointerDown={(e) => { drag.current = { px: e.clientX, py: e.clientY, vx: vue.x, vy: vue.y }; (e.target as Element).setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const rect = svgRef.current!.getBoundingClientRect();
          const dx = ((e.clientX - d.px) / rect.width) * vue.w;
          const dy = ((e.clientY - d.py) / rect.height) * vue.h;
          setVue((v) => ({ ...v, x: Math.max(0, Math.min(VL - v.w, d.vx - dx)), y: Math.max(0, Math.min(VH - v.h, d.vy - dy)) }));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerLeave={() => { drag.current = null; }}
      >
        {DEPARTEMENTS.map((d) => (
          <path key={d.code} d={d.d} fill="#ffffff" stroke="#c4ccd6" strokeWidth={0.5} />
        ))}
        {marqueurs.map((m, i) => (
          <circle
            key={`${m.p.s}-${i}`}
            cx={m.x} cy={m.y}
            r={Math.max(1.8, vue.w / 420)}
            fill={COULEUR[m.p.c]}
            fillOpacity={0.8}
            stroke="#fff"
            strokeWidth={0.3}
            onClick={() => setChoisi(m.p)}
            style={{ cursor: "pointer" }}
          >
            <title>{`${m.p.n}, ${m.p.a}, ${m.p.v}`}</title>
          </circle>
        ))}
      </svg>
      {choisi ? (
        <div style={{ border: "1px solid #c4ccd6", borderRadius: 8, padding: "10px 14px", margin: "12px 0" }}>
          <strong><a href={`/parlementaires/${choisi.s}`}>{choisi.n}</a></strong>
          {" "}{choisi.g ? <span className="puce">{choisi.g}</span> : null}
          <div>{choisi.a}</div>
          <div>{choisi.v}</div>
        </div>
      ) : (
        <p className="meta">Cliquez sur un point pour afficher l&apos;adresse et le lien vers la fiche de l&apos;élu.</p>
      )}
      <p className="meta">{marqueurs.length.toLocaleString("fr-FR")} permanences affichées{maj ? ` : adresses collectées le ${maj}` : ""}.</p>
    </div>
  );
}
