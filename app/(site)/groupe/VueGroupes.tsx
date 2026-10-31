"use client";
import { useState, type ReactNode } from "react";

// Vue interactive d'une chambre (/groupe/an, /groupe/senat, /groupe/pe) :
// hémicycle proportionnel, légende cliquable, résumé chiffré et cartes de
// groupes. Le survol d'un secteur, d'une pastille ou d'une carte met le groupe
// en lumière partout ailleurs (lien bidirectionnel) et un tooltip suit le
// curseur. Le composant ne porte que de l'affichage : chiffres, couleurs et
// adresses sont préformatés côté serveur (lib/stats est server-only).

export type GroupeVue = {
  sigle: string; libelle: string; elus: number; collaborateurs: string;
  renouvellement: string; femmes: string; couleur: string; href: string;
  logo: string | null;
};

const CX = 280, CY = 272, R = 210, R_IN = 86, ECART = 0.006;
const pol = (r: number, a: number): [number, number] => [CX + r * Math.cos(a), CY + r * Math.sin(a)];

function secteur(a1: number, a2: number): string {
  const [x1, y1] = pol(R, a1), [x2, y2] = pol(R, a2), [x3, y3] = pol(R_IN, a2), [x4, y4] = pol(R_IN, a1);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${R_IN} ${R_IN} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;
}

// Texte lisible sur un fond clair : navy ; sur un fond foncé : crème.
function texteSur(couleur: string): string {
  const h = couleur.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#071A41" : "#FFFDF5";
}

export default function VueGroupes({ groupes, dateMaj, resume }: { groupes: GroupeVue[]; dateMaj: string; resume: ReactNode }) {
  const [actif, setActif] = useState<number | null>(null);
  const [curseur, setCurseur] = useState<{ x: number; y: number } | null>(null);
  const total = groupes.reduce((n, g) => n + g.elus, 0);
  if (total === 0) return null;
  const fr = (n: number) => n.toLocaleString("fr-FR");

  // Bornes angulaires : de 180° (gauche) à 0° (droite), proportionnelles aux
  // effectifs ; les secteurs sont séparés par un interstice (pas de traits durs).
  const bornes: { a1: number; a2: number; mid: number }[] = [];
  let depart = Math.PI;
  for (const g of groupes) {
    const amplitude = (g.elus / total) * Math.PI;
    const fin = depart + amplitude;
    bornes.push({ a1: depart, a2: fin, mid: (depart + fin) / 2 });
    depart = fin;
  }

  const g = actif === null ? null : groupes[actif];
  const survol = (i: number) => ({
    onMouseEnter: () => setActif(i),
    onMouseLeave: () => setActif(null),
    onFocus: () => setActif(i),
    onBlur: () => setActif(null),
  });

  return (
    <div className="vue-groupes">
      <svg
        className={"hemi-svg" + (actif !== null ? " dim" : "")}
        viewBox="0 0 560 300"
        role="img"
        aria-label={`Hémicycle : ${fr(total)} élus répartis entre ${groupes.length} groupes, du plus grand au plus petit.`}
      >
        {groupes.map((gr, i) => {
          const b = bornes[i];
          return (
            <a key={gr.sigle} href={gr.href} aria-label={`${gr.libelle} : ${gr.elus} élus`} {...survol(i)}
              onMouseMove={(e) => setCurseur({ x: e.clientX, y: e.clientY })}
            >
              <path d={secteur(b.a1 + ECART, b.a2 - ECART)} fill={gr.couleur} className={actif === i ? "surbrillance" : ""}>
                <title>{gr.libelle + " : " + gr.elus + " élus ; " + gr.collaborateurs + " collaborateurs"}</title>
              </path>
            </a>
          );
        })}
        {groupes.map((gr, i) => {
          const b = bornes[i];
          const amplitudeDeg = ((b.a2 - b.a1) * 180) / Math.PI;
          const fill = texteSur(gr.couleur);
          if (gr.elus >= 35 && amplitudeDeg >= 9) {
            const [tx, ty] = pol((R + R_IN) / 2, b.mid);
            return (
              <text key={gr.sigle} x={tx} y={ty} textAnchor="middle" className="hemi-texte" fill={fill}>
                <tspan x={tx} dy="-0.35em">{gr.sigle}</tspan>
                <tspan x={tx} dy="1.15em" className="hemi-effectif">{gr.elus}</tspan>
              </text>
            );
          }
          const [ix, iy] = pol(R + 2, b.mid);
          const [lx, ly] = pol(R + 20, b.mid);
          const cosMid = Math.cos(b.mid);
          const ancre = cosMid > 0.35 ? "start" : cosMid < -0.35 ? "end" : "middle";
          const yTexte = ancre === "middle" ? ly - 6 : ly;
          return (
            <g key={gr.sigle}>
              <line x1={ix} y1={iy} x2={lx} y2={ly} className="hemi-filet" />
              <text x={ancre === "start" ? lx + 4 : ancre === "end" ? lx - 4 : lx} y={yTexte} textAnchor={ancre} className="hemi-texte-ext">
                {gr.sigle + " " + gr.elus}
              </text>
            </g>
          );
        })}
      </svg>

      <ul className="hemi-legende">
        {groupes.map((gr, i) => (
          <li key={gr.sigle}>
            <a href={gr.href} className={"hemi-pastille" + (actif === i ? " active" : "")} {...survol(i)}>
              <span className="point" style={{ ["--c" as string]: gr.couleur }} />
              <b>{gr.sigle}</b> {gr.elus}
            </a>
          </li>
        ))}
      </ul>
      <p className="meta hemi-total">
        {fr(total)} élus ; {groupes.length} groupes. Données au {dateMaj}.
      </p>

      {resume}

      <ul className="grille-groupes">
        {groupes.map((gr, i) => (
          <li key={gr.sigle}>
            <a
              className={"groupe-carte" + (actif === i ? " active" : "")}
              style={{ ["--c" as string]: gr.couleur }}
              href={gr.href}
              {...survol(i)}
            >
              {gr.logo
                ? <img className="groupe-carte-logo" src={gr.logo} alt="" width={42} height={42} loading="lazy" />
                : <span className="groupe-pastille">{gr.sigle}</span>}
              <span className="groupe-carte-corps">
                <strong>{gr.libelle}</strong>
                <span><b>{fr(gr.elus)}</b> élus ; <b>{gr.collaborateurs}</b> collaborateurs</span>
                <span className="meta">Renouvellement 12 mois : {gr.renouvellement} ; Femmes : {gr.femmes}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      {g && curseur && (
        <div className="hemi-tooltip visible" style={{
          left: Math.min(curseur.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 280) + "px",
          top: Math.max(6, Math.min(curseur.y - 40, (typeof window !== "undefined" ? window.innerHeight : 800) - 130)) + "px",
        }}>
          <div className="hemi-tooltip-nom">{g.libelle}</div>
          <div><b>{fr(g.elus)}</b> élus ; <b>{g.collaborateurs}</b> collaborateurs</div>
          <div className="meta">Renouvellement 12 mois : {g.renouvellement} ; Femmes : {g.femmes}</div>
          <div className="hemi-tooltip-lien">Voir la fiche</div>
        </div>
      )}
    </div>
  );
}
