import type { Metadata } from "next";
import Link from "next/link";
import { groupesAvecComptes, type GroupeCompte } from "@/lib/collectifsData";
import { mandaturesExistantes, type MandatureExistante } from "@/lib/mandaturesData";
import { CHAMBRE_COURTE, slugCollectif } from "@/lib/collectifs";
import { agreger, partFemmes, pct, statsElus, tauxTurnover, type Agregat, type StatElu } from "@/lib/stats";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Groupes et partis au Parlement : toutes les fiches",
  description: "Tous les groupes parlementaires de l'Assemblée nationale, du Sénat et du Parlement européen : leurs élus, leurs équipes et leurs mouvements.",
  alternates: { canonical: "/groupe" },
};

// /groupe : l'index des fiches par groupe. Chaque groupe est une carte avec
// ses effectifs (élus, collaborateurs suivis, renouvellement, mixité) : la
// donnée remplace l'annuaire de liens bleus. Les groupes les plus fournis en
// élus passent en premier dans chaque chambre.
const NOMS: Record<string, string> = { assemblee: "Assemblée nationale", senat: "Sénat", europarl: "Parlement européen" };
const LOGOS: Record<string, string> = { assemblee: "/logos/assemblee-nationale.svg", senat: "/logos/senat.svg", europarl: "/logos/parlement-europeen.svg" };
const CHAMBRES: readonly string[] = ["assemblee", "senat", "europarl"];

export default async function IndexGroupes() {
  const [groupes, mandatures, stats] = await Promise.all([
    groupesAvecComptes().catch((): GroupeCompte[] => []),
    mandaturesExistantes().catch((): MandatureExistante[] => []),
    statsElus().catch((): StatElu[] => []),
  ]);
  const fr = (n: number) => n.toLocaleString("fr-FR");

  // Stats équipes par groupe : clé « chambre|sigle » (même clé que groupesAvecComptes).
  const equipes = new Map<string, Agregat>();
  for (const a of agreger(stats, (r) => r.chambre + "|" + r.elu_groupe)) equipes.set(a.cle, a);

  const parChambre: Record<string, GroupeCompte[]> = { assemblee: [], senat: [], europarl: [] };
  for (const g of groupes) (parChambre[g.chambre] ??= []).push(g);
  for (const gs of Object.values(parChambre)) gs.sort((a, b) => b.elus - a.elus || a.groupe.localeCompare(b.groupe));

  return (
    <>
      <h1>Groupes parlementaires</h1>
      <p className="lead">
        Une fiche par groupe politique de chaque chambre : ses élus, ses collaborateurs suivis par DataParl&apos;,
        et le renouvellement de ses équipes.
      </p>
      <p className="meta">Les partis toutes chambres confondues ont aussi leur fiche : <Link href="/parti">voir tous les partis</Link>.</p>

      {CHAMBRES.map((chambre) => {
        const gs = parChambre[chambre] ?? [];
        const mandats = mandatures.filter((m) => m.chambre === chambre);
        return (
          <section key={chambre}>
            <div className="chambre-entete">
              <img className="logo-org" src={LOGOS[chambre]} alt={NOMS[chambre]} height={26} />
              <h2>{NOMS[chambre]}</h2>
            </div>
            {gs.length === 0 ? <p className="meta">Aucun groupe synchronisé pour l&apos;instant.</p> : (
              <ul className="grille-groupes">
                {gs.map((g) => {
                  const agg = equipes.get(g.chambre + "|" + g.groupe);
                  return (
                    <li key={g.chambre + "-" + g.groupe}>
                      <a className="carte-groupe" href={`/groupe/${CHAMBRE_COURTE[g.chambre]}-${slugCollectif(g.groupe)}/`}>
                        <span className="badge-sigle">{g.groupe}</span>
                        <strong>{g.groupe_libelle || g.groupe}</strong>
                        <span className="carte-stats"><b>{fr(g.elus)}</b> élus{agg ? <> · <b>{fr(agg.effectif)}</b> collaborateurs</> : null}</span>
                        {agg && (
                          <span className="meta">Renouvellement 12 mois : {pct(tauxTurnover(agg), 1)} · femmes : {pct(partFemmes(agg), 0)}</span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            {mandats.length > 0 && (
              <p className="meta">
                {"Par mandature : "}
                {mandats.map((m, i) => (
                  <span key={m.slug}>
                    {i > 0 ? ", " : ""}
                    <a href={"/groupe/" + CHAMBRE_COURTE[chambre] + "/" + m.slug}>{m.libelle}</a>
                  </span>
                ))}
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
