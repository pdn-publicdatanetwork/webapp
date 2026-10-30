import { NextResponse, type NextRequest } from "next/server";
import { structures } from "@/lib/structures";

// Export SVG du réseau structures-eurodéputés, servi sur
// media.dataparl.fr/assets/pe/reseau (chemin autorisé dans proxy.ts ;
// l'extension .svg redirige vers la même ressource, et l'ancien chemin
// /assets/collab-reseau redirige en 308). Généré côté serveur à partir
// des affectations du Parlement européen : structures sur un cercle
// intérieur, eurodéputés sur une ellipse extérieure, logo DataParl' en
// tête et légende des groupes politiques en pied.
// ?telecharger force le téléchargement (Content-Disposition).

export const revalidate = 3600;

const COULEUR_STRUCTURE = "#b45309";
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

const APOS = String.fromCharCode(8217); // apostrophe typographique
const echappe = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const court = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "\u2026" : s);
const nb = (x: number) => String(x).replace(".", ",");

export async function GET(req: NextRequest) {
  const [tp, pr] = await Promise.all([
    structures("Tiers payant"),
    structures("Prestataire de services spécialisé"),
  ]);

  // Fusion par structure (une même société peut être à la fois tiers payant
  // chez un élu et prestataire chez un autre) : même logique que la page.
  type S = { cle: string; nom: string; types: string[]; clients: { elu_id: string; elu_nom: string; elu_groupe: string }[] };
  const parCle = new Map<string, S>();
  const ajouter = (liste: Awaited<ReturnType<typeof structures>>, type: string) => {
    for (const s of liste) {
      const e = parCle.get(s.cle);
      if (e) {
        if (!e.types.includes(type)) e.types.push(type);
        e.clients.push(...s.clients);
        continue;
      }
      parCle.set(s.cle, { cle: s.cle, nom: s.nom, types: [type], clients: [...s.clients] });
    }
  };
  ajouter(tp, "Tiers payant");
  ajouter(pr, "Prestataire");
  const toutes = [...parCle.values()].sort((a, b) => b.clients.length - a.clients.length);

  // Eurodéputés (dédupliqués) et arêtes structure-élu.
  const elus = new Map<string, { elu_nom: string; elu_groupe: string; contrats: number }>();
  const aretes: { source: string; target: string }[] = [];
  for (const s of toutes) {
    for (const c of s.clients) {
      const e = elus.get(c.elu_id);
      if (e) e.contrats += 1;
      else elus.set(c.elu_id, { elu_nom: c.elu_nom, elu_groupe: c.elu_groupe, contrats: 1 });
      aretes.push({ source: s.cle, target: c.elu_id });
    }
  }

  // Positions : structures sur un cercle intérieur, élus sur une ellipse
  // extérieure (déterministe, même logique que le rendu initial de la page).
  const W = 1500, H = 1000;
  const cx = W / 2, cy = H / 2 + 30;
  const pos = new Map<string, { x: number; y: number }>();
  const nbS = Math.max(1, toutes.length), nbE = Math.max(1, elus.size);
  let iS = 0, iE = 0;
  for (const s of toutes) {
    const a = (2 * Math.PI * iS++) / nbS - Math.PI / 2;
    pos.set(s.cle, { x: cx + 270 * Math.cos(a), y: cy + 250 * Math.sin(a) });
  }
  for (const [id] of elus) {
    const a = (2 * Math.PI * iE++) / nbE - Math.PI / 2;
    pos.set(id, { x: cx + 640 * Math.cos(a), y: cy + 400 * Math.sin(a) });
  }

  const p: string[] = [];
  p.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" font-family="system-ui, -apple-system, sans-serif">');
  p.push('<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>');
  // Logo DataParl' : « Data » bleu nuit puis badge jaune « Parl' », mesurés
  // pour ne jamais se chevaucher ni être coupés par le bord.
  p.push('<text x="48" y="72" font-size="44" font-weight="700" fill="#14224e" letter-spacing="1">Data</text>');
  p.push('<rect x="158" y="38" width="102" height="46" rx="7" fill="#FFD23F"/>');
  p.push('<text x="172" y="72" font-size="44" font-weight="700" fill="#071A41">Parl' + APOS + '</text>');
  p.push('<text x="48" y="112" font-size="17" fill="#475569">Le réseau des tiers payants et prestataires des eurodéputés français : ' + nb(toutes.length) + ' structures, ' + nb(elus.size) + ' eurodéputés, ' + nb(aretes.length) + ' contrats, dataparl.fr</text>');
  // Arêtes puis nœuds.
  for (const a of aretes) {
    const s = pos.get(a.source), e = pos.get(a.target);
    if (!s || !e) continue;
    p.push('<line x1="' + nb(s.x) + '" y1="' + nb(s.y) + '" x2="' + nb(e.x) + '" y2="' + nb(e.y) + '" stroke="#cbd5e1" stroke-width="1"/>');
  }
  for (const [id, e] of elus) {
    const q = pos.get(id);
    if (!q) continue;
    const c = COULEURS[e.elu_groupe] || "#1E90FF";
    const cote = q.x >= cx ? 1 : -1;
    p.push('<circle cx="' + nb(q.x) + '" cy="' + nb(q.y) + '" r="10" fill="' + c + '" stroke="#fff" stroke-width="1.5"/>');
    p.push('<text x="' + nb(q.x + cote * 15) + '" y="' + nb(q.y + 4) + '" text-anchor="' + (cote === 1 ? "start" : "end") + '" font-size="11" fill="#334155">' + echappe(court(e.elu_nom, 24)) + '</text>');
  }
  for (const s of toutes) {
    const q = pos.get(s.cle);
    if (!q) continue;
    const r = Math.min(26, 10 + s.clients.length * 1.5);
    p.push('<circle cx="' + nb(q.x) + '" cy="' + nb(q.y) + '" r="' + nb(r) + '" fill="' + COULEUR_STRUCTURE + '" stroke="#fff" stroke-width="2"/>');
    p.push('<text x="' + nb(q.x) + '" y="' + nb(q.y + r + 15) + '" text-anchor="middle" font-size="11.5" font-weight="600" fill="#1f2937">' + echappe(court(s.nom, 28)) + '</text>');
  }
  // Légende : structures + groupes politiques présents.
  const groupes = [...new Set([...elus.values()].map((e) => e.elu_groupe).filter(Boolean))];
  let lx = 48;
  const legendeY = H - 44;
  p.push('<circle cx="' + nb(lx + 7) + '" cy="' + nb(legendeY) + '" r="7" fill="' + COULEUR_STRUCTURE + '"/>');
  p.push('<text x="' + nb(lx + 20) + '" y="' + nb(legendeY + 5) + '" font-size="14" fill="#1f2937">Structures</text>');
  lx += 20 + "Structures".length * 8 + 28;
  for (const g of groupes) {
    p.push('<circle cx="' + nb(lx + 7) + '" cy="' + nb(legendeY) + '" r="7" fill="' + (COULEURS[g] || "#1E90FF") + '"/>');
    p.push('<text x="' + nb(lx + 20) + '" y="' + nb(legendeY + 5) + '" font-size="14" fill="#1f2937">' + echappe(g) + '</text>');
    lx += 20 + echappe(g).length * 8 + 28;
  }
  p.push('<text x="' + nb(W - 48) + '" y="' + nb(legendeY + 5) + '" text-anchor="end" font-size="12" fill="#64748b">Taille des nœuds = nombre de liens, source : DataParl' + APOS + ' (dataparl.fr), données ouvertes</text>');
  p.push("</svg>");
  const svg = p.join("\n");

  const entetes: Record<string, string> = {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  };
  if (req.nextUrl.searchParams.has("telecharger")) {
    entetes["Content-Disposition"] = 'attachment; filename="collab-reseau-dataparl.svg"';
  }
  return new NextResponse(svg, { headers: entetes });
}
