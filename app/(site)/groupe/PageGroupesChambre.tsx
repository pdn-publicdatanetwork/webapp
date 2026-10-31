import Link from "next/link";
import { groupesAvecComptes, type GroupeCompte } from "@/lib/collectifsData";
import { mandaturesExistantes, type MandatureExistante } from "@/lib/mandaturesData";
import { agreger, partFemmes, pct, statsElus, tauxTurnover, type Agregat, type StatElu } from "@/lib/stats";
import { couleurParti, NOM_CHAMBRE } from "@/lib/couleurs";
import { CHAMBRE_COURTE, slugCollectif } from "@/lib/collectifs";
import GroupesChambre from "./GroupesChambre";
import Hemicycle from "./Hemicycle";

// Pages « groupes d'une chambre » (/groupe/an, /groupe/senat, /groupe/pe) :
// la même section que sur /groupe, dédiée à une seule chambre, avec un
// hémicycle proportionnel pour l'Assemblée nationale. Les adresses existaient
// mais répondaient « Groupe introuvable » : elles deviennent des pages utiles.
export default async function PageGroupesChambre({ chambre }: { chambre: string }) {
  const [groupes, mandatures, stats] = await Promise.all([
    groupesAvecComptes().catch((): GroupeCompte[] => []),
    mandaturesExistantes().catch((): MandatureExistante[] => []),
    statsElus().catch((): StatElu[] => []),
  ]);
  const gs = groupes.filter((g) => g.chambre === chambre).sort((a, b) => b.elus - a.elus || a.groupe.localeCompare(b.groupe));
  const equipes = new Map<string, Agregat>();
  for (const a of agreger(stats.filter((r) => r.chambre === chambre), (r) => r.elu_groupe)) equipes.set(a.cle, a);
  const mandats = mandatures.filter((m) => m.chambre === chambre);

  // Hémicycle (Assemblée nationale uniquement) : chiffres préformatés ici,
  // le composant client ne fait que de l'affichage.
  const hemicycle = chambre === "assemblee" ? gs.map((g) => {
    const agg = equipes.get(g.groupe);
    return {
      sigle: g.groupe,
      libelle: g.groupe_libelle || g.groupe,
      elus: g.elus,
      collaborateurs: agg ? agg.effectif.toLocaleString("fr-FR") : "0",
      renouvellement: agg ? pct(tauxTurnover(agg), 1) : "–",
      femmes: agg ? pct(partFemmes(agg), 0) : "–",
      couleur: couleurParti(g.groupe),
      href: `/groupe/${CHAMBRE_COURTE[chambre]}-${slugCollectif(g.groupe)}/`,
    };
  }) : null;

  return (
    <>
      <h1>Groupes parlementaires : {NOM_CHAMBRE[chambre]}</h1>
      <p className="lead">
        Les groupes politiques de {NOM_CHAMBRE[chambre].startsWith("A") || NOM_CHAMBRE[chambre].startsWith("E") || NOM_CHAMBRE[chambre].startsWith("I") ? "l'" : "du "}
        {NOM_CHAMBRE[chambre]} : pour chacun, ses élus, ses collaborateurs suivis par DataParl&apos; et le renouvellement de ses équipes.
      </p>
      <p className="meta">
        <Link href="/groupe">Voir tous les groupes</Link>, toutes chambres confondues ;{" "}
        <Link href="/parti">voir tous les partis</Link>.
      </p>

      {hemicycle && hemicycle.length > 0 && (
        <>
          <h2>L&apos;hémicycle en un coup d&apos;œil</h2>
          <Hemicycle groupes={hemicycle} />
        </>
      )}

      <h2>Les groupes, l&apos;un après l&apos;autre</h2>
      <GroupesChambre chambre={chambre} groupes={gs} equipes={equipes} mandatures={mandats} />

      <p className="meta">
        {"Autres chambres : "}
        {(["assemblee", "senat", "europarl"] as const).filter((c) => c !== chambre).map((c, i) => (
          <span key={c}>
            {i > 0 ? ", " : ""}
            <Link href={"/groupe/" + CHAMBRE_COURTE[c]}>{NOM_CHAMBRE[c]}</Link>
          </span>
        ))}
        .
      </p>
    </>
  );
}
