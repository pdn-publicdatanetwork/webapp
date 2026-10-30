// Signature email d'un membre de l'équipe. Sans dépendance (testé).
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type Profil = { prenom: string; nom: string; poste: string; email: string };

export const nomComplet = (p: Pick<Profil, "prenom" | "nom">) => [p.prenom.trim(), p.nom.trim()].filter(Boolean).join(" ");

export function signatureHtml(p: Profil): string {
  const qui = nomComplet(p) || p.email;
  return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#071A41">
  <tr>
    <td style="padding-right:14px;border-right:3px solid #FFD23F;vertical-align:middle">
      <a href="https://www.dataparl.fr" style="text-decoration:none;color:#071A41"><span style="font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:20px;line-height:1;color:#071A41">Data<span style="background:#FFD23F;padding:0 2px">Parl'</span></span></a>
    </td>
    <td style="padding-left:14px">
      <div style="font-weight:bold;font-size:15px">${esc(qui)}</div>
      ${p.poste.trim() ? `<div style="color:#4A5670">${esc(p.poste.trim())}, DataParl'</div>` : `<div style="color:#4A5670">DataParl'</div>`}
      <div style="margin-top:6px"><a href="mailto:${esc(p.email)}" style="color:#164DFF;text-decoration:none">${esc(p.email)}</a>, <a href="https://www.dataparl.fr" style="color:#164DFF;text-decoration:none;font-weight:bold">dataparl.fr</a></div>
    </td>
  </tr>
</table>`;
}

export function signatureTexte(p: Profil): string {
  return [nomComplet(p) || p.email, p.poste.trim() ? `${p.poste.trim()}, DataParl'` : "DataParl'", `${p.email}, https://www.dataparl.fr`].join("\n");
}
