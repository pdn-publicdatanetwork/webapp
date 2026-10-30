import { CHAMBRE_LONG } from "@/lib/format";
import { dataQueryTout } from "@/lib/data";
import { CHAMBRE_COURTE } from "@/lib/collectifs";
import TableauCollabs, { type LigneCollab } from "./TableauCollabs";

// La liste référence des collaborateurs en poste d'une chambre : nom du
// collaborateur, élu employeur et fonction. Le tableau est interactif
// (recherche, filtre par initiale, tri, groupement par élu, pagination) ;
// les lignes sont rendues côté serveur pour rester indexables.
type Periode = { collab_id: string; elu_id: string; elu_nom: string; fonction: string };
type Collab = { collab_id: string; nom: string; prenom: string };
const AU: Record<string, string> = { assemblee: "à l'Assemblée nationale", senat: "au Sénat", europarl: "au Parlement européen" };
const PAR: Record<string, string> = { assemblee: "par député", senat: "par sénateur", europarl: "par député européen" };
const SOURCE: Record<string, string> = {
  assemblee: "les listes officielles publiées par l'Assemblée nationale",
  senat: "les listes officielles publiées par le Sénat",
  europarl: "les listes d'accréditation des collaborateurs suivies par DataParl' au Parlement européen",
};

export default async function ListeChambre({ chambre, page: _page }: { chambre: "assemblee" | "senat" | "europarl"; page: number }) {
  const seg = CHAMBRE_COURTE[chambre];
  const maj = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const [rows, collabs] = await Promise.all([
    dataQueryTout<Periode>("periodes",
      new URLSearchParams({ select: "collab_id,elu_id,elu_nom,fonction", chambre: "eq." + chambre, en_cours: "eq.true", order: "elu_nom.asc" }),
      3600).catch((): Periode[] => []),
    dataQueryTout<Collab>("collaborateurs",
      new URLSearchParams({ select: "collab_id,nom,prenom" }),
      3600).catch((): Collab[] => []),
  ]);
  const noms = new Map(collabs.map((c) => [c.collab_id, [c.prenom, c.nom].filter(Boolean).join(" ")]));
  const lignes: LigneCollab[] = rows
    .map((r) => ({ nom: noms.get(r.collab_id) ?? "", elu: r.elu_nom, fonction: r.fonction || "" }))
    .filter((r) => r.nom !== "");

  const total = lignes.length;

  return (
    <>
      <p className="meta"><a href={"/collab/" + seg}>&larr; Collaborateurs {CHAMBRE_LONG[chambre]}</a>, <a href="/collab">&larr; Tous les collaborateurs</a></p>
      <h1>{"La liste des collaborateurs " + PAR[chambre]}</h1>
      <p className="lead">
        {total.toLocaleString("fr-FR")} collaborateurs parlementaires en poste {AU[chambre]}, avec le nom de chacun,
        l&apos;élu employeur et la fonction, d&apos;après les données suivies quotidiennement par DataParl&apos;.
      </p>
      {total === 0 ? (
        chambre === "europarl" ? (
          <p className="lead">
            Les listes de collaborateurs du Parlement européen (assistants accrédités, locaux et groupements des
            eurodéputés français) sont en cours de reprise : la collecte quotidienne via les accréditations a repris,
            et les affectations seront bientôt visibles ici. En attendant, les pages déjà publiées :{" "}
            <a href="/collab/pe/tiers-payants">tiers payants</a>, <a href="/collab/pe/prestataires">prestataires de services</a>{" "}
            et <a href="/collab/pe/reseau">le réseau des collaborateurs</a>. L&apos;historique 2015-2026 est en cours de
            reconstitution via les archives : <a href="/methode">voir la méthode</a>.
          </p>
        ) : (
          <p className="meta">Aucun collaborateur en poste enregistré pour cette chambre pour l&apos;instant.</p>
        )
      ) : (
        <TableauCollabs rows={lignes} mode="table" />
      )}
      <p className="meta">
        {"Liste établie à partir de " + SOURCE[chambre] + ", mise à jour quotidiennement, page générée le " + maj + ". "}
        <a href={"/collab/" + seg + "/trombinoscope"}>{"Voir aussi le trombinoscope des collaborateurs"}</a>
        {", version tableur détaillée : "}
        <a href="https://media.dataparl.fr/sheets/liste_collab_dataparl">DataParl&apos; Sheets</a>.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "Liste des collaborateurs " + PAR[chambre],
            description: "Liste référence des collaborateurs parlementaires en poste " + AU[chambre] + " : nom, élu employeur et fonction, mise à jour quotidienne.",
            url: "https://www.dataparl.fr/collab/" + seg + "/liste",
            creator: { "@type": "Organization", name: "DataParl'", url: "https://www.dataparl.fr" },
            isAccessibleForFree: true,
          }),
        }}
      />
    </>
  );
}
