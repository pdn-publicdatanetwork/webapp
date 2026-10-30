import type { Metadata } from "next";
import Link from "next/link";
import { groupesExistants } from "@/lib/collectifsData";
import { mandaturesExistantes, type MandatureExistante } from "@/lib/mandaturesData";
import { CHAMBRE_COURTE, slugCollectif, type GroupeExistant } from "@/lib/collectifs";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Groupes et partis au Parlement : toutes les fiches",
  description: "Tous les groupes parlementaires de l'Assemblée nationale, du Sénat et du Parlement européen : leurs élus, leurs équipes et leurs mouvements.",
  alternates: { canonical: "/groupe" },
};

export default async function IndexGroupes() {
  const groupes = await groupesExistants().catch((): GroupeExistant[] => []);
  const mandatures = await mandaturesExistantes().catch((): MandatureExistante[] => []);
  const parChambre: Record<string, typeof groupes> = { assemblee: [], senat: [], europarl: [] };
  for (const g of groupes) (parChambre[g.chambre] ??= []).push(g);
  return (
    <>
      <h1>Groupes parlementaires</h1>
      <p className="lead">
        Une fiche par groupe politique de chaque chambre : qui en est membre, où siège chacun,
        et l&apos;équipe de collaborateurs de chaque élu : suivie par DataParl&apos;.
      </p>
      <p className="meta">Les partis toutes chambres confondues ont aussi leur fiche : <Link href="/parti">voir tous les partis</Link>.</p>
      {Object.entries(parChambre).map(([chambre, gs]) => (
        <section key={chambre}>
          <h2>{chambre === "assemblee" ? "Assemblée nationale" : chambre === "senat" ? "Sénat" : "Parlement européen"}</h2>
          {gs.length === 0 ? <p className="meta">Aucun groupe synchronisé pour l&apos;instant.</p> : (
            <ul className="liste-deps">
              {gs.map((g) => (
                <li key={`${g.chambre}-${g.groupe}`}>
                  <a href={`/groupe/${CHAMBRE_COURTE[g.chambre]}-${slugCollectif(g.groupe)}/`}>
                    Groupe {g.groupe_libelle || g.groupe}
                  </a>
                  <span className="meta">, {g.groupe}</span>
                </li>
              ))}
            </ul>
          )}
          {mandatures.filter((m) => m.chambre === chambre).length > 0 && (
            <p className="meta">
              {"Par mandature : "}
              {mandatures.filter((m) => m.chambre === chambre).map((m, i) => (
                <span key={m.slug}>
                  {i > 0 ? ", " : ""}
                  <a href={"/groupe/" + CHAMBRE_COURTE[chambre] + "/" + m.slug}>{m.libelle}</a>
                </span>
              ))}
            </p>
          )}
        </section>
      ))}
    </>
  );
}
