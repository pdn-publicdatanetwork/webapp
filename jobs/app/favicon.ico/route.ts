// /favicon.ico : monogramme Sigma-apostrophe servi sur tous les domaines et sous-domaines
// (exclu du proxy, ce handler répond partout). La déclinaison dépend de l'hôte :
//   www. jobs. link. webmail.        blanc sur bleu encre  #071A41
//   api. media. survey. raw. drive.   bleu encre sur blanc #FFFFFF
//   admin. mail.                     blanc sur rouge      #C8102F
// Tracé typographique (Georgia, gras) : même rendu que apple-icon.
const SVG = (fond: string, encre: string, bord?: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${fond}"${bord ? ` stroke="${bord}" stroke-width="3"` : ""}/>
  <text x="33" y="46" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="700" fill="${encre}">&#931;&#39;</text>
</svg>`;

export async function GET(req: Request) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const variant =
    host.startsWith("api.") || host.startsWith("media.") || host.startsWith("survey.") || host.startsWith("raw.") || host.startsWith("drive.")
      ? SVG("#FFFFFF", "#071A41", "#071A41")
      : host.startsWith("admin.") || host.startsWith("mail.")
        ? SVG("#C8102F", "#FFFFFF")
        : SVG("#071A41", "#FFFFFF");
  return new Response(variant, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
