// Alertes email : sélection des mouvements d'un abonnement et rendu du
// message (quotidien ou récapitulatif du lundi). Sans dépendance serveur,
// pour être testé et réutilisé par l'aperçu de la page /alertes.
import { CHAMBRE, CHAMBRE_LONG, TYPE, dateLongue, idParlementaire, nomAffiche, prenomNom } from "./format.ts";
import { esc } from "./gabarit.ts";
import { siglesDe } from "./familles.ts";

const SITE = "https://www.dataparl.fr";
const BLEU = "#164DFF";
const GRIS = "#4A5670";
const COULEUR_TYPE: Record<string, string> = { arrivee: "#1F8A4C", depart: "#C8102E", transfert: "#164DFF" };

export type MvtAlerte = {
  id: string; date_event: string; chambre: string; type: string;
  collab_cle: string; collab_nom: string; collab_prenom: string;
  elu_cle: string; elu_id: string; elu_nom: string; elu_groupe: string;
  elu_origine_cle?: string; elu_origine_id?: string; elu_origine_nom: string; elu_origine_groupe: string;
  fonction?: string;
};

export type Abonnement = {
  frequence: "quotidienne" | "hebdomadaire"; chambres: string[]; types: string[]; groupes: string[]; elus: string[];
};

// idsElus : identifiants et clés de nom des élus suivis (voir cleElus).
export function correspond(m: MvtAlerte, a: Abonnement, idsElus: Set<string>): boolean {
  if (!a.chambres.includes(m.chambre) || !a.types.includes(m.type)) return false;
  if (a.groupes.length) {
    const sigles = new Set(a.groupes.flatMap((g) => siglesDe(g, m.chambre)));
    if (!sigles.has(m.elu_groupe) && !sigles.has(m.elu_origine_groupe)) return false;
  }
  if (a.elus.length) {
    const ids = [m.elu_id, m.elu_cle, m.elu_origine_id ?? "", m.elu_origine_cle ?? ""].filter(Boolean);
    if (!ids.some((x) => idsElus.has(x))) return false;
  }
  return true;
}

const lien = (href: string, txt: string) => `<a href="${esc(href)}" style="color:${BLEU};text-decoration:none">${esc(txt)}</a>`;

function ligneHtml(m: MvtAlerte, avecDate: boolean): string {
  const qui = prenomNom(m.collab_prenom, m.collab_nom);
  const collab = m.collab_cle ? lien(`${SITE}/collab/k/${encodeURIComponent(m.collab_cle)}`, qui) : esc(qui);
  const ficheElu = `${SITE}/parlementaires/${encodeURIComponent(idParlementaire(m.chambre, m.elu_id, m.elu_cle, m.elu_nom))}`;
  const elu = `${lien(ficheElu, nomAffiche(m.elu_nom))}${m.elu_groupe ? ` (${esc(m.elu_groupe)})` : ""}`;
  const phrase = m.type === "arrivee" ? `${collab} rejoint l'équipe de ${elu}`
    : m.type === "depart" ? `${collab} quitte l'équipe de ${elu}`
      : `${collab} passe de l'équipe de ${esc(nomAffiche(m.elu_origine_nom))} à celle de ${elu}`;
  const badge = `<span style="display:inline-block;min-width:74px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.03em;color:${COULEUR_TYPE[m.type] ?? GRIS}">${esc(TYPE[m.type] ?? m.type)}</span>`;
  const meta = [CHAMBRE[m.chambre], avecDate ? dateLongue(m.date_event) : "", m.fonction ?? ""].filter(Boolean).join(", ");
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #E6E3D8;vertical-align:top">${badge}<br>${phrase}<div style="font-size:13px;color:${GRIS};margin-top:2px">${esc(meta)}</div></td></tr>`;
}

function ligneTexte(m: MvtAlerte): string {
  const qui = prenomNom(m.collab_prenom, m.collab_nom);
  const elu = `${nomAffiche(m.elu_nom)}${m.elu_groupe ? ` (${m.elu_groupe})` : ""}`;
  const p = m.type === "arrivee" ? `${qui} rejoint l'équipe de ${elu}`
    : m.type === "depart" ? `${qui} quitte l'équipe de ${elu}`
      : `${qui} passe de l'équipe de ${nomAffiche(m.elu_origine_nom)} à celle de ${elu}`;
  return `- ${TYPE[m.type] ?? m.type}, ${p} (${CHAMBRE[m.chambre]}, ${dateLongue(m.date_event)})`;
}

const pluriel = (n: number, s: string, p = `${s}s`) => `${n.toLocaleString("fr-FR")} ${n > 1 ? p : s}`;
export const MAX_LIGNES = 60;

// Corps du message. Quotidien : par chambre. Hebdomadaire : par groupe.
export function messageAlerte(mvts: MvtAlerte[], frequence: Abonnement["frequence"], jour: string): { sujet: string; titre: string; html: string; texte: string; edition: "Daily" | "Weekly" } {
  const n = mvts.length;
  const hebdo = frequence === "hebdomadaire";
  const titre = hebdo ? `Ta semaine au Parlement : ${pluriel(n, "mouvement")}` : `${pluriel(n, "nouveau mouvement", "nouveaux mouvements")} pour tes alertes`;
  const sujet = hebdo ? `DataParl' Weekly : ${pluriel(n, "mouvement")} cette semaine` : `DataParl' Daily : ${pluriel(n, "mouvement")} chez les collaborateurs parlementaires`;
  const affiches = mvts.slice(0, MAX_LIGNES);
  const cle = (m: MvtAlerte) => hebdo ? `${m.elu_groupe || "Sans groupe"}, ${CHAMBRE[m.chambre]}` : CHAMBRE_LONG[m.chambre] ?? m.chambre;
  const sections = new Map<string, MvtAlerte[]>();
  for (const m of affiches) sections.set(cle(m), [...(sections.get(cle(m)) ?? []), m]);
  const ordre = [...sections.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "fr"));
  const blocs = ordre.map(([t, ms]) =>
    `<h2 style="margin:22px 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:18px">${esc(t)} <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:normal;color:${GRIS}">${pluriel(ms.length, "mouvement")}</span></h2>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ms.map((m) => ligneHtml(m, hebdo)).join("")}</table>`).join("\n");
  const reste = n - affiches.length;
  const voir = hebdo ? `${SITE}/mouvements/parlement` : `${SITE}/daily/${jour}`;
  const html = [
    `<p style="margin:0 0 6px">${hebdo ? "Voici les mouvements de la semaine qui correspondent à tes alertes, rangés par groupe." : "Voici ce qui a bougé dans les équipes que tu suis, d'après les publications officielles du jour."}</p>`,
    blocs,
    reste > 0 ? `<p style="margin:16px 0 0;color:${GRIS}">Et ${pluriel(reste, "autre mouvement", "autres mouvements")}.</p>` : "",
    `<p style="margin:24px 0"><a href="${voir}" style="display:inline-block;background:#F0444F;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold">${hebdo ? "Voir tous les mouvements" : "Voir les mouvements du jour"}</a></p>`,
  ].join("\n");
  const texte = [titre, "", ...affiches.map(ligneTexte), reste > 0 ? `Et ${reste} autres.` : "", "", `Tout voir : ${voir}`].join("\n");
  return { sujet, titre, html, texte, edition: hebdo ? "Weekly" : "Daily" };
}

// Lundi de la semaine (AAAA-MM-JJ) d'une date AAAA-MM-JJ.
export function lundiDe(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function decaler(jour: string, jours: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

// Date du jour à Paris (AAAA-MM-JJ).
export function aujourdhuiParis(maintenant = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(maintenant);
}
