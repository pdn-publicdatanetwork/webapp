"use client";
import { useState } from "react";

// Hémicycle proportionnel de l'Assemblée nationale (/groupe/an) : arcs
// proportionnels aux effectifs de chaque groupe, couleurs usuelles de la
// charte passées en prop, sigle + effectif dans les grands secteurs, panneau
// au survol et légende complète. Le composant ne porte que de l'affichage :
// tous les chiffres sont préformatés côté serveur (lib/stats est server-only).

export type GroupeHemicycle = {
  sigle: string; libelle: string; elus: number; collaborateurs: string;
  renouvellement: string; femmes: string; couleur: string; href: string;
};

const CX = 230, CY = 246, R = 221, R_IN = 108;
const pol = (r: number, deg: number): [number, number] => [CX + r * Math.cos((deg * Math.PI) / 180), CY - r * Math.sin((deg * Math.PI) / 180)];

function secteur(a1: number, a2: number): string {
  const [x1, y1] = pol(R, a1), [x2, y2] = pol(R, a2), [x3, y3] = pol(R_IN, a2), [x4, y4] = pol(R_IN, a1);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${R_IN} ${R_IN} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;
}

// Texte lisible sur un fond clair (jaunes) : navy ; sur un fond foncé : crème.
function texteSur(couleur: string): string {
  const h = couleur.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#071A41" : "#FFFDF5";
}

export default function Hemicycle({ groupes }: { groupes: GroupeHemicycle[] }) {
  const [actif, setActif] = useState<number | null>(null);
  const total = groupes.reduce((n, g) => n + g.elus, 0);
  if (total === 0) return null;

  // Bornes angulaires : de 180° (gauche de l'hémicycle) à 0°, proportionnelles aux effectifs.
  const bornes: { a1: number; a2: number; mid: number }[] = [];
  let curseur = 180;
  for (const g of groupes) {
    const a2 = curseur - (g.elus / total) * 180;
    bornes.push({ a1: curseur, a2, mid: (curseur + a2) / 2 });
    curseur = a2;
  }
  const fr = (n: number) => n.toLocaleString("fr-FR");
  const g = actif === null ? null : groupes[actif];

  return (
    <div className="hemicycle">
      <svg viewBox="0 0 460 250" role="img" aria-label={`Hémicycle : ${fr(total)} élus répartis entre ${groupes.length} groupes, du plus grand au plus petit.`}>
        {groupes.map((gr, i) => {
          const b = bornes[i];
          return (
            <a key={gr.sigle} href={gr.href} aria-label={`${gr.libelle} : ${gr.elus} élus`}>
              <path
                d={secteur(b.a1, b.a2)}
                fill={gr.couleur}
                className={actif === i ? "actif" : ""}
                onMouseEnter={() => setActif(i)}
                onMouseLeave={() => setActif(null)}
                onFocus={() => setActif(i)}
                onBlur={() => setActif(null)}
              >
                <title>{gr.libelle + " : " + gr.elus + " élus, " + gr.collaborateurs + " collaborateurs suivis"}</title>
              </path>
            </a>
          );
        })}
        {groupes.map((gr, i) => {
          const b = bornes[i];
          const span = b.a1 - b.a2;
          if (span < 13) return null;
          const [tx, ty] = pol((R + R_IN) / 2, b.mid);
          const fill = texteSur(gr.couleur);
          return (
            <text key={gr.sigle} x={tx} y={ty - 3} textAnchor="middle" fill={fill} className="hemi-texte">
              {gr.sigle}
            </text>
          );
        })}
        {groupes.map((gr, i) => {
          const b = bornes[i];
          if (b.a1 - b.a2 < 18) return null;
          const [tx, ty] = pol((R + R_IN) / 2, b.mid);
          const fill = texteSur(gr.couleur);
          return (
            <text key={gr.sigle + "-n"} x={tx} y={ty + 11} textAnchor="middle" fill={fill} className="hemi-texte">
              {gr.elus}
            </text>
          );
        })}
      </svg>
      <div className="hemi-panel">
        {g ? (
          <>
            <span className="hemi-nom">{g.libelle} <span className="badge-sigle">{g.sigle}</span></span>
            <span><b>{fr(g.elus)}</b> élus ; <b>{g.collaborateurs}</b> collaborateurs suivis</span>
            <span className="meta">Renouvellement 12 mois : {g.renouvellement} ; part de femmes : {g.femmes}</span>
            <a className="btn secondaire" href={g.href}>Voir la fiche du groupe</a>
          </>
        ) : (
          <span className="meta">Survolez un secteur pour le détail d&apos;un groupe ; cliquez pour ouvrir sa fiche. La légende ci-dessous et les cartes restituent tout le contenu sans souris.</span>
        )}
      </div>
      <ul className="hemi-legende">
        {groupes.map((gr) => (
          <li key={gr.sigle}><span className="point" style={{ ["--c" as string]: gr.couleur }} />{gr.sigle} : {gr.elus}</li>
        ))}
      </ul>
    </div>
  );
}
