import { offresPubliques } from "@/lib/firestore";
import { slugOffre } from "@/lib/jobs";
import { nomElu, titrePoste, typeContrat } from "@/lib/jobsTexte";
import { normaliser } from "@/lib/types";

export const dynamic = "force-dynamic";

// Flux RSS des offres actives : source de publication pour Buffer
// (comptes X et Bluesky de DataParl'). Buffer publie chaque nouvel item.

const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const offres = await offresPubliques().catch(() => []);
  const items = offres
    .map((o) => {
      const n = normaliser(o);
      const slug = slugOffre(n);
      const elu = nomElu(n);
      const lien = "https://jobs.dataparl.fr/offre/" + slug;
      const description =
        "Nouvelle offre de " + (elu || "l'équipe parlementaire") + " : " + titrePoste(n.titre) +
        (n.localisation ? ", " + n.localisation : "") + ". " + typeContrat(n) +
        ". Voir l'ensemble de l'offre et postuler via DataParl' Jobs.";
      return (
        "<item><title>" + echapper(n.titre) + "</title><link>" + lien + "</link><guid>" + lien + "</guid>" +
        "<description>" + echapper(description) + "</description>" +
        (n.publie_le ? "<pubDate>" + new Date(n.publie_le + "T12:00:00Z").toUTCString() + "</pubDate>" : "") +
        "</item>"
      );
    })
    .join("");
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss version="2.0"><channel><title>DataParl' + "'" + ' Jobs : les offres du Parlement</title>' +
    "<link>https://jobs.dataparl.fr</link>" +
    "<description>Toutes les offres de collaborateur parlementaire : Assemblée nationale, Sénat, Parlement européen.</description>" +
    items +
    "</channel></rss>";
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
