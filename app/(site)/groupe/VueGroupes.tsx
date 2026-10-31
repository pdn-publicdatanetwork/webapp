"use client";
import { useState, type ReactNode } from "react";
import LogoGroupe from "./LogoGroupe";

// Vue interactive d'une chambre (/groupe/an, /groupe/senat, /groupe/pe) :
// hémicycle proportionnel, légende cliquable, résumé chiffré et cartes de
// groupes. Le survol d'un secteur, d'une pastille ou d'une carte met le groupe
// en lumière partout ailleurs (lien bidirectionnel) et un tooltip suit le
// curseur. Le composant ne porte que de l'affichage : chiffres, couleurs et
// adresses sont préformatés côté serveur (lib/stats est server-only).
// Le bouton « Télécharger l'image » exporte l'hémicycle et sa légende en PNG
// (fond crème, logo DataParl' et mention dataparl.fr intégrés, pour citer la
// source en réutilisant le graphique).

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

// Échappement XML pour le SVG exporté (noms de groupes avec & < >).
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Bornes angulaires : de 180° (gauche) à 0° (droite), proportionnelles aux
// effectifs ; les secteurs sont séparés par un interstice (pas de traits durs).
function bornesGroupes(groupes: GroupeVue[], total: number) {
  const bornes: { a1: number; a2: number; mid: number }[] = [];
  let depart = Math.PI;
  for (const g of groupes) {
    const amplitude = (g.elus / total) * Math.PI;
    const fin = depart + amplitude;
    bornes.push({ a1: depart, a2: fin, mid: (depart + fin) / 2 });
    depart = fin;
  }
  return bornes;
}

// SVG autonome de l'hémicycle + légende : composition prête à partager
// (fond crème, titre, marges équilibrées, logo DataParl' avec le bloc jaune
// derrière « Parl' », mention de la source et de la date). Retourne le XML
// et les dimensions pour le rendu canvas.
function svgExport(groupes: GroupeVue[], total: number, titre: string, dateMaj: string): { xml: string; l: number; h: number } {
  const bornes = bornesGroupes(groupes, total);
  const L = 1080;
  const CXE = 540, CYE = 430, RE = 310, RE_IN = 128;
  const polE = (r: number, a: number): [number, number] => [CXE + r * Math.cos(a), CYE + r * Math.sin(a)];
  const sect = (a1: number, a2: number) => {
    const [x1, y1] = polE(RE, a1), [x2, y2] = polE(RE, a2), [x3, y3] = polE(RE_IN, a2), [x4, y4] = polE(RE_IN, a1);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${RE} ${RE} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${RE_IN} ${RE_IN} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;
  };
  let corps = "";
  groupes.forEach((gr, i) => {
    const b = bornes[i];
    const ampl = ((b.a2 - b.a1) * 180) / Math.PI;
    corps += `<path d="${sect(b.a1 + ECART, b.a2 - ECART)}" fill="${gr.couleur}" stroke="#FFFDF5" stroke-width="1"/>`;
    if (gr.elus >= 35 && ampl >= 9) {
      const [tx, ty] = polE((RE + RE_IN) / 2, b.mid);
      const fill = texteSur(gr.couleur);
      corps += `<text x="${tx.toFixed(1)}" y="${(ty - 6).toFixed(1)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${fill}">${esc(gr.sigle)}</text>`;
      corps += `<text x="${tx.toFixed(1)}" y="${(ty + 12).toFixed(1)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${fill}" opacity="0.92">${gr.elus}</text>`;
    } else {
      const [ix, iy] = polE(RE + 2, b.mid);
      const [lx, ly] = polE(RE + 26, b.mid);
      const cosMid = Math.cos(b.mid);
      const ancre = cosMid > 0.35 ? "start" : cosMid < -0.35 ? "end" : "middle";
      const xT = ancre === "start" ? lx + 6 : ancre === "end" ? lx - 6 : lx;
      corps += `<line x1="${ix.toFixed(1)}" y1="${iy.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="#B9B4A5" stroke-width="1"/>`;
      corps += `<text x="${xT.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${ancre}" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#4A5670">${esc(gr.sigle + " " + gr.elus)}</text>`;
    }
  });
  // Légende : rangées de 5, pastille + sigle gras + effectif.
  let legende = "";
  groupes.forEach((gr, i) => {
    const col = i % 5, ligne = Math.floor(i / 5);
    const x = 110 + col * 190, y = 816 + ligne * 36;
    legende += `<rect x="${x}" y="${y - 12}" width="14" height="14" rx="3" fill="${gr.couleur}"/>`;
    legende += `<text x="${x + 24}" y="${y}" font-family="system-ui, sans-serif" font-size="14" fill="#071A41"><tspan font-weight="700">${esc(gr.sigle)}</tspan><tspan font-weight="400" fill="#4A5670"> ${gr.elus}</tspan></text>`;
  });
  const yPied = 816 + Math.ceil(groupes.length / 5) * 36 + 44;
  const H = yPied + 42;
  const mention = "dataparl.fr" + (dateMaj ? " ; données au " + esc(dateMaj) : "");
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}" viewBox="0 0 ${L} ${H}">
<rect width="${L}" height="${H}" fill="#FFFDF5"/>
<text x="${L / 2}" y="66" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-weight="700" fill="#071A41">${esc(titre)}</text>
<text x="${L / 2}" y="96" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#4A5670">${total} élus, ${groupes.length} groupes</text>
<g>${corps}</g>
${legende}
<text x="110" y="${yPied}" font-family="Georgia, serif" font-size="26" font-weight="700" fill="#071A41">Data</text>
<rect x="178" y="${yPied - 25}" width="86" height="33" fill="#FFD23F"/>
<text x="184" y="${yPied}" font-family="Georgia, serif" font-size="26" font-weight="700" fill="#071A41">Parl'</text>
<text x="${L - 110}" y="${yPied}" text-anchor="end" font-family="system-ui, sans-serif" font-size="14" fill="#4A5670">${mention}</text>
</svg>`;
  return { xml, l: L, h: H };
}

export default function VueGroupes({ groupes, dateMaj, resume, seg, titre }: {
  groupes: GroupeVue[]; dateMaj: string; resume: ReactNode; seg: string; titre: string;
}) {
  const [actif, setActif] = useState<number | null>(null);
  const [curseur, setCurseur] = useState<{ x: number; y: number } | null>(null);
  const [exporte, setExporte] = useState(false);
  const total = groupes.reduce((n, g) => n + g.elus, 0);
  if (total === 0) return null;
  const fr = (n: number) => n.toLocaleString("fr-FR");
  const bornes = bornesGroupes(groupes, total);

  const g = actif === null ? null : groupes[actif];
  const survol = (i: number) => ({
    onMouseEnter: () => setActif(i),
    onMouseLeave: () => setActif(null),
    onFocus: () => setActif(i),
    onBlur: () => setActif(null),
  });

  // Export PNG : le SVG autonome est dessiné sur un canvas 2x puis téléchargé.
  const telecharger = () => {
    const { xml, l, h } = svgExport(groupes, total, titre, dateMaj);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = l * 2; c.height = h * 2;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#FFFDF5";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = "hemicycle-" + seg + ".png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        setExporte(true);
        setTimeout(() => setExporte(false), 3000);
      }, "image/png");
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  return (
    <div className="vue-groupes">
      <button type="button" className="btn secondaire hemi-export" onClick={telecharger}>
        {exporte ? "Image téléchargée" : "Télécharger l'image"}
      </button>
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
              <LogoGroupe sigle={gr.sigle} logo={gr.logo} couleur={gr.couleur} />
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
