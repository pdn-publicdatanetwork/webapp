import { offresPubliques } from "@/lib/firestore";
import { slugOffre } from "@/lib/jobs";
import { EMAIL_RE } from "@/lib/jobsTexte";
import { normaliser } from "@/lib/types";

export const dynamic = "force-dynamic";

// API publique : toutes les offres actives au format JSON. Les adresses
// e-mail de candidature ne sont JAMAIS exposées (protégées par la
// vérification anti-robot côté site).

export async function GET() {
  const offres = await offresPubliques().catch(() => []);
  return Response.json({
    site: "https://jobs.dataparl.fr",
    total: offres.length,
    offres: offres.map((o) => {
      const n = normaliser(o);
      const slug = slugOffre(n);
      return {
        id: n.id,
        slug,
        url: "https://jobs.dataparl.fr/offre/" + slug,
        titre: n.titre,
        elu: [n.elu_prenom, n.elu_nom].filter(Boolean).join(" ") || null,
        groupe_politique: n.groupe_politique,
        chambre: n.chambre,
        type_poste: n.type_poste,
        localisation: n.localisation,
        publie_le: n.publie_le,
        expire_le: n.expire_le,
        source: n.source_connector,
        description: String(o.description ?? "")
          .replace(EMAIL_RE, "")
          .replace(/\s+/g, " ")
          .trim(),
      };
    }),
  });
}
