import type { Metadata } from "next";
import Link from "next/link";
import { groupesAvecComptes, type GroupeCompte } from "@/lib/collectifsData";
import { mandaturesExistantes, type MandatureExistante } from "@/lib/mandaturesData";
import { agreger, statsElus, type Agregat, type StatElu } from "@/lib/stats";
import GroupesChambre from "./GroupesChambre";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Groupes et partis au Parlement : toutes les fiches",
  description: "Tous les groupes parlementaires de l'Assemblée nationale, du Sénat et du Parlement européen : leurs élus, leurs équipes et leurs mouvements.",
  alternates: { canonical: "/groupe" },
};

// /groupe : l'index des fiches par groupe. Chaque groupe est une carte avec
// ses effectifs (élus, collaborateurs suivis, renouvellement, mixité). Les
// groupes les plus fournis en élus passent en premier dans chaque chambre.
// Chaque section est aussi disponible en page dédiée : /groupe/an, /groupe/senat, /groupe/pe.
const CHAMBRES: readonly string[] = ["assemblee", "senat", "europarl"];

export default async function IndexGroupes() {
  const [groupes, mandatures, stats] = await Promise.all([
    groupesAvecComptes().catch((): GroupeCompte[] => []),
    mandaturesExistantes().catch((): MandatureExistante[] => []),
    statsElus().catch((): StatElu[] => []),
  ]);

  // Stats équipes par groupe : clé « chambre|sigle » (même clé que groupesAvecComptes).
  const equipes = new Map<string, Agregat>();
  for (const a of agreger(stats, (r) => r.chambre + "|" + r.elu_groupe)) equipes.set(a.cle, a);

  return (
    <>
      <h1>Groupes parlementaires</h1>
      <p className="lead">
        Une fiche par groupe politique de chaque chambre : ses élus, ses collaborateurs suivis par DataParl&apos;,
        et le renouvellement de ses équipes.
      </p>
      <p className="meta">
        Les partis toutes chambres confondues ont aussi leur fiche : <Link href="/parti">voir tous les partis</Link>.
        Par chambre : <Link href="/groupe/an">Assemblée nationale</Link>, <Link href="/groupe/senat">Sénat</Link>, <Link href="/groupe/pe">Parlement européen</Link>.
      </p>
      {CHAMBRES.map((chambre) => (
        <GroupesChambre
          key={chambre}
          chambre={chambre}
          groupes={groupes.filter((g) => g.chambre === chambre).sort((a, b) => b.elus - a.elus || a.groupe.localeCompare(b.groupe))}
          equipes={equipes}
          mandatures={mandatures.filter((m) => m.chambre === chambre)}
          avecTitre
        />
      ))}
    </>
  );
}
