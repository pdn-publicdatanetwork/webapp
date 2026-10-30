"use client";

// Carte cliquable et zoomable : les départements métropolitains (contours de
// lib/carteDepartements.ts) en bleu lorsqu'ils sont renouvelés aux sénatoriales
// 2026, et le bandeau outre-mer (lib/carteOutreMer.ts) : DROM et COM dessinés
// sous la métropole : bleus et cliquables quand ils sont renouvelés, gris
// sinon. Les Français de l'étranger restent listés sous la carte.
import { useState } from "react";
import { DEPARTEMENTS } from "@/lib/carteDepartements";
import { OUTRE_MER_CARTE } from "@/lib/carteOutreMer";

export type DonneesDep = { n: number; s: number };

// Vue totale : métropole (0 0 1000 1061) + bandeau outre-mer dessous.
const VIEW_TOTAL = { x: 0, y: 0, l: 1000, h: 1400 };
const FACTEUR = 1.35;
const MIN = 90; // zoom max ~11x
// Vue initiale : métropole + outre-mer entiers avec une marge confortable
// (la vue « plein cadre » était trop zoomée à l'arrivée sur la page).
const MARGE = 90;
const INITIAL = { x: -MARGE, y: -MARGE, l: VIEW_TOTAL.l + 2 * MARGE, h: VIEW_TOTAL.h + 2 * MARGE };
const MAX = INITIAL.l * 1.1; // dézoom léger au-delà de la vue initiale

function zoomer(v: { x: number; y: number; l: number; h: number }, sens: 1 | -1) {
  const l = sens > 0 ? Math.max(MIN, v.l / FACTEUR) : Math.min(MAX, v.l * FACTEUR);
  const h = l * (VIEW_TOTAL.h / VIEW_TOTAL.l);
  const cx = v.x + v.l / 2;
  const cy = v.y + v.h / 2;
  return { x: cx - l / 2, y: cy - h / 2, l, h };
}

export default function Carte({ parSlug, om }: { parSlug: Record<string, DonneesDep>; om: { nom: string; slug: string; n: number }[] }) {
  const [vue, setVue] = useState(INITIAL);

  return (
    <figure className="carte-fr" style={{ margin: 0 }}>
      <div
        className="carte-outils"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 0 10px", padding: "0 6px" }}
      >
        <button type="button" className="secondaire" style={{ margin: 0, padding: "5px 12px", fontSize: "0.85rem" }} onClick={() => setVue((v) => zoomer(v, 1))} aria-label="Zoomer sur la carte">
          Zoom +
        </button>
        <button type="button" className="secondaire" style={{ margin: 0, padding: "5px 12px", fontSize: "0.85rem" }} onClick={() => setVue((v) => zoomer(v, -1))} aria-label="Dézoomer la carte">
          Zoom −
        </button>
        <button type="button" className="secondaire" style={{ margin: 0, padding: "5px 12px", fontSize: "0.85rem" }} onClick={() => setVue(INITIAL)} aria-label="Réinitialiser le zoom de la carte">
          Réinitialiser
        </button>
        <span className="meta" style={{ fontSize: "0.78rem" }}>métropole et outre-mer sur la même carte</span>
      </div>
      <svg
        viewBox={`${vue.x} ${vue.y} ${vue.l} ${vue.h}`}
        role="group"
        aria-label="Carte des départements français renouvelés aux sénatoriales 2026, métropole et outre-mer"
      >
        {DEPARTEMENTS.map((d) => {
          const data = parSlug[d.slug];
          const renouvelle = (data?.n ?? 0) > 0;
          const label = `${d.nom}${renouvelle ? ` : ${data!.n} nouveau${data!.n > 1 ? "x" : ""} sénateur${data!.n > 1 ? "s" : ""}` : ""}`;
          return (
            <a key={d.code} href={renouvelle ? `/senatoriales2026/${d.slug}` : undefined} aria-label={label || d.nom}>
              <path
                className={`dep${renouvelle ? " renouvele" : ""}`}
                d={d.d}
                role="img"
                aria-hidden="true"
              >
                <title>{label || `${d.nom} : pas de renouvellement en 2026`}</title>
              </path>
            </a>
          );
        })}
        {/* Bandeau outre-mer : DROM et COM, dessinés sous la métropole. */}
        {OUTRE_MER_CARTE.map((t) => {
          const data = t.slug ? parSlug[t.slug] : undefined;
          const renouvelle = (data?.n ?? 0) > 0;
          const label = renouvelle
            ? `${t.nom} : ${data!.n} nouveau${data!.n > 1 ? "x" : ""} sénateur${data!.n > 1 ? "s" : ""}`
            : `${t.nom} : pas de renouvellement en 2026`;
          const forme = (
            <g transform={`translate(${t.x},${t.y}) scale(${t.s})`}>
              <path className={`dep om${renouvelle ? " renouvele" : ""}`} d={t.d} role="img" aria-hidden="true">
                <title>{label}</title>
              </path>
              <text className="om-label" x="50" y={t.cy} textAnchor="middle">{t.court}</text>
            </g>
          );
          return renouvelle ? (
            <a key={t.code} href={`/senatoriales2026/${t.slug}`} aria-label={label}>{forme}</a>
          ) : (
            <g key={t.code} role="img" aria-label={label}>{forme}</g>
          );
        })}
      </svg>
      {om.length > 0 && (
        <figcaption>
          <p className="meta" style={{ margin: "8px 0 4px" }}>Outre-mer et Français de l&apos;étranger :</p>
          <ul className="doms">
            {om.map((o) => (
              <li key={o.slug} className="dom">
                {o.n > 0 ? (
                  <a href={`/senatoriales2026/${o.slug}`}>
                    <span className="dom-nom">{o.nom}</span>
                    <span className="dom-badge">{o.n} nouveau{o.n > 1 ? "x" : ""} sénateur{o.n > 1 ? "s" : ""}</span>
                  </a>
                ) : (
                  <>
                    <span className="dom-nom">{o.nom}</span>
                    <span className="dom-badge dom-zero">pas de renouvellement en 2026</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </figcaption>
      )}
    </figure>
  );
}
