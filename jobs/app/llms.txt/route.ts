import { offresPubliques } from "@/lib/firestore";
import { slugOffre } from "@/lib/jobs";
import { normaliser } from "@/lib/types";

export const dynamic = "force-dynamic";

// llms.txt : présentation du site pour les grands modèles de langage
// (standard llms.txt). Liste les pages utiles, l'API publique et les
// offres actives du moment.

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
    "- [API publique des offres au format JSON](https://jobs.dataparl.fr/api/offres) :",
    "  toutes les offres actives (titre, élu, groupe, chambre, type de contrat, lieu,",
    "  dates, description sans les adresses e-mail, qui restent protégées).",
    "",
    "## Offres actives (" + offres.length + ")",
    "",
  ];
  for (const o of offres) {
    const n = normaliser(o);
    const elu = [n.elu_prenom, n.elu_nom].filter(Boolean).join(" ");
    const lieux = [n.localisation, n.type_poste].filter(Boolean).join(", ");
    lignes.push(
      "- [" + n.titre + (elu ? " (" + elu + ")" : "") + "](https://jobs.dataparl.fr/offre/" + slugOffre(n) + ")" +
        (lieux ? " : " + lieux : "")
    );
  }
  return new Response(lignes.join("\n") + "\n", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
