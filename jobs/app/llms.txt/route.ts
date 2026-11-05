import { offresPubliques } from "@/lib/firestore";
import { slugOffre } from "@/lib/jobs";
import { CHAMBRE_NOM, extrait, sansEmail, tempsTravail, titrePoste, typeContrat } from "@/lib/jobsTexte";
import { normaliser } from "@/lib/types";

export const dynamic = "force-dynamic";

// llms.txt : présentation du site pour les grands modèles de langage
// (standard llms.txt). Liste les pages utiles, l'API publique et les
// offres actives du moment avec leurs informations essentielles et un
// chapeau, pour qu'un assistant puisse répondre sans crawler chaque page.

export async function GET() {
  const offres = await offresPubliques().catch(() => []);
  const lignes: string[] = [
    "# DataParl' Jobs",
    "",
    "> Toutes les offres de collaborateur parlementaire en France : Assemblée nationale, Sénat,",
    "> Parlement européen. Collectées sur les sources officielles ou déposées directement par",
    "> les élus, puis relues. Gratuit, sans publicité, sans intermédiaire.",
    "",
    "Site : https://jobs.dataparl.fr",
    "",
    "## Pages",
    "",
    "- [Accueil et recherche d'offres](https://jobs.dataparl.fr/)",
    "- [CV Matching : associer un CV aux offres](https://jobs.dataparl.fr/matching)",
    "- [Déposer une offre (élus et cabinets)](https://jobs.dataparl.fr/proposer)",
    "- [Informations légales](https://jobs.dataparl.fr/informations-legales)",
    "",
    "## Données",
    "",
    "- [Contenu intégral des offres actives (llms-full.txt)](https://jobs.dataparl.fr/llms-full.txt) :",
    "  le texte complet de chaque annonce, sans les adresses e-mail.",
    "- [API publique des offres au format JSON](https://jobs.dataparl.fr/api/offres) :",
    "  toutes les offres actives (titre, élu, groupe, chambre, type de contrat, lieu,",
    "  dates, description sans les adresses e-mail, qui restent protégées).",
    "- Les adresses e-mail de candidature ne sont jamais exposées ici : elles sont",
    "  protégées par un compte et une vérification anti-robot sur le site.",
    "",
    "## Offres actives (" + offres.length + ")",
    "",
  ];
  for (const o of offres) {
    const n = normaliser(o);
    const elu = [n.elu_prenom, n.elu_nom].filter(Boolean).join(" ");
    const chambre = n.chambre ? CHAMBRE_NOM[n.chambre] ?? n.chambre : null;
    const contrat = typeContrat(n);
    const travail = tempsTravail(n.description);
    const infos = [
      elu ? "équipe de " + elu : null,
      [n.groupe_politique, chambre].filter(Boolean).join(", ") || null,
      contrat !== "Autre" ? contrat + (travail ? ", " + travail.toLowerCase() : "") : null,
      n.localisation,
      n.publie_le ? "publiée le " + n.publie_le : null,
    ].filter(Boolean).join(" ; ");
    lignes.push("- [" + titrePoste(n.titre) + "](https://jobs.dataparl.fr/offre/" + slugOffre(n) + ")" + (infos ? " : " + infos : "") + ".");
    const chapeau = sansEmail(extrait(n.description ?? ""));
    if (chapeau) lignes.push("  " + chapeau);
  }
  return new Response(lignes.join("\n") + "\n", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
