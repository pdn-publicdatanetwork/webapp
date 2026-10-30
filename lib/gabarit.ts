// Gabarit commun à tous les emails envoyés depuis @dataparl.fr
// (transactionnels, réponses de la webmail, accusés de réception).
// HTML de messagerie : tableaux et styles en ligne. Sans dépendance (testé).
// Habillage « data-journalistique » : fond crème très clair, carte blanche
// sans ombre, titre sans-serif navy, boutons navy (cf. lib/mail.ts). Les
// blocs jaunes (badge, fiche) sont posés par les appelants.

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const SITE = "https://www.dataparl.fr";
const BLEU = "#164DFF";
const ENCRE = "#0F172A";
const GRIS = "#475569";
const LIGNE = "#E2E8F0";
const FOND = "#FAF8F5";
const JAUNE = "#FFD23F";

// Réseaux officiels (mêmes URL que la page « À propos »), affichés dans le
// pied des mails « DataParl' Daily ». Logos en PNG hébergés (/media/logos/…) :
// Gmail et Outlook ignorent le SVG dans les emails ; le PNG passe partout,
// avec le nom du réseau en texte alternatif si les images sont bloquées.
const RESEAUX_DAILY = [
  { href: "https://x.com/DataParl_fr", nom: "X", logo: `${SITE}/media/logos/x.png` },
  { href: "https://bsky.app/profile/dataparl.fr", nom: "Bluesky", logo: `${SITE}/media/logos/bluesky.png` },
  { href: "https://t.me/dataparl_daily", nom: "Telegram", logo: `${SITE}/media/logos/telegram.png` },
];

export type Gabarit = {
  titre: string;
  corpsHtml: string;
  lireUrl?: string | null; // version en ligne (mail.dataparl.fr/lire/<jeton>)
  pied?: string; // mention sous la carte (désinscription, raison de l'envoi)
  edition?: "Daily" | "Weekly"; // alertes : logo « DataParl' Daily / Weekly » sur bloc bleu nuit
  adressage?: { date: string; pour?: string }; // AAAA-MM-JJ et « Prénom NOM »
};

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// « 01 Octobre 2026 »
export function dateAdressage(jour: string): string {
  const [a, m, j] = jour.split("-");
  return `${j} ${MOIS[Number(m) - 1] ?? ""} ${a}`;
}

// « À l'attention de Jean DUPONT », « À l'attention d'Émilie DURAND » (voyelle ou h).
export function attention(pour: string): string {
  const p = pour.trim();
  const initiale = p.normalize("NFD").replace(/\p{M}/gu, "").charAt(0).toLowerCase();
  return `À l'attention ${"aeiouyh".includes(initiale) && initiale ? "d'" : "de "}${p}`;
}

// « prénom nom » -> « Prénom NOM » (le dernier mot, particules comprises, en capitales).
export function prenomNomAdresse(prenom: string, nom: string): string {
  const cap = (x: string) => x.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
  return [cap(prenom.trim()), nom.trim().toUpperCase()].filter(Boolean).join(" ");
}

export function gabarit({ titre, corpsHtml, lireUrl, pied, edition, adressage }: Gabarit): string {
  const lien = (href: string, txt: string) => `<a href="${href}" style="color:${BLEU};text-decoration:none">${txt}</a>`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(titre)}</title></head>
<body style="margin:0;padding:0;background:${FOND};font-family:-apple-system,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;color:${ENCRE}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FOND}"><tr><td align="center" style="padding:20px 16px 40px">
${lireUrl ? `<p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:${GRIS}">Si cet email ne s'affiche pas correctement, <a href="${esc(lireUrl)}" style="color:${BLEU}">consulte-le en ligne</a>.</p>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${LIGNE};border-radius:12px;border-collapse:separate">
${edition ? `<tr><td style="padding:20px 32px;border-bottom:3px solid ${JAUNE}">
<span style="font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:21px;color:${ENCRE}">Data<span style="background:${JAUNE};padding:0 3px 0 1px">Parl'</span></span>
<span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:normal;font-size:18px;color:${GRIS}">&nbsp;${edition}</span>
</td></tr>` : `<tr><td style="padding:20px 32px;border-bottom:1px solid ${LIGNE}">
<span style="font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:21px;color:${ENCRE}">Data<span style="background:${JAUNE};padding:0 3px 0 1px">Parl'</span></span>
</td></tr>`}
${adressage ? `<tr><td style="padding:18px 32px 0;font-size:14px;line-height:1.5;color:${GRIS}">${esc(dateAdressage(adressage.date))}${adressage.pour ? `<br><span style="color:${ENCRE}">${esc(attention(adressage.pour))}</span>` : ""}</td></tr>` : ""}
<tr><td style="padding:28px 32px 32px;font-size:16px;line-height:1.6;color:${ENCRE}">
<h1 style="margin:0 0 16px;font-size:23px;line-height:1.25;font-weight:700;color:${ENCRE}">${esc(titre)}</h1>
${corpsHtml}
</td></tr>
<tr><td style="padding:16px 32px 22px;border-top:1px solid ${LIGNE};background:${FOND};border-radius:0 0 12px 12px;font-size:13px;text-align:center">
<span style="color:${GRIS}">DataParl&apos; ·</span> ${lien(`${SITE}/`, "www.dataparl.fr")}
${edition === "Daily" ? `<br><span style="color:${GRIS}">Suivre :</span> ${RESEAUX_DAILY.map((r) => `<a href="${r.href}" style="color:${BLEU};text-decoration:none" title="${r.nom}"><img src="${r.logo}" alt="${r.nom}" width="18" height="18" style="display:inline-block;vertical-align:middle;border:0;outline:none;text-decoration:none" /></a>`).join(` <span style="color:${GRIS}">·</span> `)}` : ""}
</td></tr>
</table>
${pied ? `<p style="max-width:600px;margin:16px auto 0;font-size:12px;line-height:1.5;color:${GRIS}">${pied}</p>` : ""}
</td></tr></table>
</body></html>`;
}

// Liens Markdown : [texte](https://…) ou [texte](mailto:…), après échappement.
const LIEN_MD = /\[([^\]\[]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g;
export function liensHtml(l: string): string {
  return l.replace(LIEN_MD, (_, texte: string, href: string) =>
    `<a href="${href}" style="color:${BLEU};text-decoration:underline">${texte}</a>`);
}

// Emphases Markdown : **gras**, *italique* — après échappement et liens.
const GRAS = /\*\*([^*\n]+)\*\*/g;
const ITALIQUE = /\*([^*\n]+)\*/g;
export function miseEnforme(l: string): string {
  return liensHtml(l).replace(GRAS, "<strong>$1</strong>").replace(ITALIQUE, "<em>$1</em>");
}

// Texte brut vers HTML : échappé, paragraphes, listes « - », lignes citées
// (« > »), liens et emphases Markdown.
export function texteVersHtml(t: string): string {
  const blocs = t.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return blocs.map((b) => {
    const lignes = b.split("\n");
    if (lignes.every((l) => l.startsWith(">"))) {
      const cite = lignes.map((l) => miseEnforme(esc(l.replace(/^>\s?/, "")))).join("<br>");
      return `<blockquote style="margin:0 0 16px;padding:0 0 0 12px;border-left:3px solid ${LIGNE};color:${GRIS}">${cite}</blockquote>`;
    }
    if (lignes.every((l) => l.startsWith("- "))) {
      const items = lignes.map((l) => `<li style="margin:0 0 6px">${miseEnforme(esc(l.slice(2)))}</li>`).join("");
      return `<ul style="margin:0 0 16px;padding:0 0 0 22px">${items}</ul>`;
    }
    return `<p style="margin:0 0 16px">${lignes.map((l) => miseEnforme(esc(l))).join("<br>")}</p>`;
  }).join("\n");
}
