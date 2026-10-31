import { CHAMBRE_LONG } from "@/lib/format";
import { dataQueryTout } from "@/lib/data";
import { CHAMBRE_COURTE } from "@/lib/collectifs";
import TableauCollabs, { type LigneCollab } from "./TableauCollabs";

// Trombinoscope des collaborateurs d'une chambre : la planche de tous les
// collaborateurs en poste, avec initiales, élu employeur et fonction.
// Recherche, filtre par initiale, tri et groupement par élu côté navigateur ;
// les cartes sont rendues côté serveur pour rester indexables. L'intitulé
// reprend les mots des publications officielles (« Trombinoscope des
// collaborateurs de Sénateur », « Liste des collaborateurs par député »).
type Periode = { collab_id: string; elu_id: string; elu_nom: string; fonction: string };
type Collab = { collab_id: string; nom: string; prenom: string; slug: string | null };
const AU: Record<string, string> = { assemblee: "à l'Assemblée nationale", senat: "au Sénat", europarl: "au Parlement européen" };
const TITRE: Record<string, string> = {
  assemblee: "Trombinoscope des collaborateurs de député",
  senat: "Trombinoscope des collaborateurs de Sénateur",
  europarl: "Trombinoscope des collaborateurs de député européen",
};
const PAR: Record<string, string> = { assemblee: "par député", senat: "par sénateur", europarl: "par député européen" };

export default async function TrombinoChambre({ chambre }: { chambre: "assemblee" | "senat" | "europarl" }) {
  const seg = CHAMBRE_COURTE[chambre];
  const [rows, collabs] = await Promise.all([
    dataQueryTout<Periode>("periodes",
      new URLSearchParams({ select: "collab_id,elu_id,elu_nom,fonction", chambre: "eq." + chambre, en_cours: "eq.true", order: "elu_nom.asc" }),
      3600).catch((): Periode[] => []),
    dataQueryTout<Collab>("collaborateurs",
      new URLSearchParams({ select: "collab_id,nom,prenom,slug" }),
      3600).catch((): Collab[] => []),
  ]);
  const noms = new Map(collabs.map((c) => [c.collab_id, [c.prenom, c.nom].filter(Boolean).join(" ")]));
  // Lien vers la fiche individuelle de chaque collaborateur (y compris
  // les assistants rattachés au groupement, qui ont une fiche comme les
  // autres collaborateurs).
  const slugs = new Map(collabs.filter((c) => c.slug).map((c) => [c.collab_id, "/collab/" + c.slug]));
  // Déduplication : une ligne par personne, employeur et fonction (les
  // périodes d'un même collaborateur peuvent exister en plusieurs
  // exemplaires). Les assistants « (groupement) » sont rattachés au groupe
  // politique, pas à un élu individuel.
  const vus = new Set<string>();
  const lignes: LigneCollab[] = rows
    .filter((r) => {
      const cle = r.collab_id + "|" + r.elu_id + "|" + r.fonction;
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    })
    .map((r) => ({
      nom: noms.get(r.collab_id) ?? "",
      elu: r.elu_nom || (/groupement/i.test(r.fonction) ? "groupe politique (groupement)" : "–"),
      fonction: r.fonction || "",
      href: slugs.get(r.collab_id),
    }))
    .filter((r) => r.nom !== "");
  const maj = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const total = lignes.length;

  return (
    <>
      <p className="meta"><a href={"/collab/" + seg}>&larr; Collaborateurs {CHAMBRE_LONG[chambre]}</a>, <a href="/collab">&larr; Tous les collaborateurs</a></p>
      <h1>{TITRE[chambre]}</h1>
      <p className="lead">
        {total.toLocaleString("fr-FR")} collaborateurs parlementaires en poste {AU[chambre]} : la planche complète,
        avec initiales, élu employeur et fonction. Filtre par lettre, recherche et groupement par élu
        ci-dessous. Mise à jour quotidienne, page générée le {maj}.
      </p>
      {total === 0 ? (
        chambre === "europarl" ? (
          <p className="lead">
            Le trombinoscope des collaborateurs des eurodéputés français sera publié dès la reprise complète des
            affectations (assistants accrédités, locaux et groupements). En attendant :{" "}
            <a href="/collab/pe/tiers-payants">tiers payants</a>, <a href="/collab/pe/prestataires">prestataires</a>{" "}
            et <a href="/collab/pe/reseau">le réseau des collaborateurs</a>.
          </p>
        ) : (
          <p className="meta">Aucun collaborateur en poste enregistré pour cette chambre pour l&apos;instant.</p>
        )
      ) : (
        <TableauCollabs rows={lignes} mode="trombi" />
      )}
      <p className="meta">
        {"Version tableau détaillée : "}
        <a href={"/collab/" + seg + "/liste"}>{"liste des collaborateurs " + PAR[chambre]}</a>
        {", "}
        <a href="https://media.dataparl.fr/sheets/liste_collab_dataparl">DataParl&apos; Sheets</a>.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: TITRE[chambre],
            description: "Trombinoscope des collaborateurs parlementaires en poste " + AU[chambre] + " : initiales, élu employeur et fonction, mis à jour quotidiennement.",
            url: "https://www.dataparl.fr/collab/" + seg + "/trombinoscope",
            creator: { "@type": "Organization", name: "DataParl'", url: "https://www.dataparl.fr" },
            isAccessibleForFree: true,
          }),
        }}
      />
    </>
  );
}
