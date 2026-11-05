import { offresPubliques } from "@/lib/firestore";
import { slugOffre } from "@/lib/jobs";
import { CHAMBRE_NOM, nomElu, sansEmail, titrePoste, typeContrat } from "@/lib/jobsTexte";
import { normaliser } from "@/lib/types";

export const dynamic = "force-dynamic";

// llms-full.txt : contenu intégral des offres actives, complément de
// llms.txt pour les grands modèles de langage. Les adresses e-mail de
// candidature ne sont JAMAIS exposées (protégées par un compte et une
// vérification anti-robot sur le site).

export async function GET() {
  const offres = await offresPubliques().catch(() => []);
  const parties: string[] = [
    "# DataParl' Jobs : offres actives du moment",
    "",
    "> Contenu intégral des " + offres.length + " offre(s) de collaborateur parlementaire en cours sur",
    "> DataParl' Jobs (https://jobs.dataparl.fr), au format llms-full.txt (complément de",
    "> https://jobs.dataparl.fr/llms.txt). Les adresses e-mail de candidature sont retirées :",
    "> elles sont visibles sur le site après création de compte et vérification anti-robot.",
    "",
  ];
  for (const o of offres) {
    const n = normaliser(o);
    const elu = nomElu(n);
    const chambre = n.chambre ? CHAMBRE_NOM[n.chambre] ?? n.chambre : null;
    const description = sansEmail(n.description ?? "");
    const infos = [
      elu ? "élu : " + elu : null,
      n.groupe_politique ? "groupe : " + n.groupe_politique : null,
      chambre ? "chambre : " + chambre : null,
      "contrat : " + typeContrat(n),
      n.localisation ? "lieu : " + n.localisation : null,
      n.publie_le ? "publiée le : " + n.publie_le : null,
    ].filter(Boolean).join(" ; ");
    parties.push(
      "## " + titrePoste(n.titre) + (elu ? " - " + elu : ""),
      "",
      "URL : https://jobs.dataparl.fr/offre/" + slugOffre(n),
      infos,
      "",
      description,
      ""
    );
  }
  return new Response(parties.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
