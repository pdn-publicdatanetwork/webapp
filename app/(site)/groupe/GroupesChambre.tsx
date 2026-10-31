import type { GroupeCompte } from "@/lib/collectifsData";
import type { MandatureExistante } from "@/lib/mandaturesData";
import { CHAMBRE_COURTE, slugCollectif } from "@/lib/collectifs";
import { partFemmes, pct, tauxTurnover, type Agregat } from "@/lib/stats";
import { NOM_CHAMBRE } from "@/lib/couleurs";

// Section « groupes d'une chambre » : cartes riches (élus, collaborateurs
// suivis, renouvellement 12 mois, part de femmes) et liens par mandature.
// Partagée entre l'index /groupe (trois sections, en-tête h2) et les pages
// par chambre (/groupe/an, /groupe/senat, /groupe/pe, sans en-tête).
const LOGOS: Record<string, string> = { assemblee: "/logos/assemblee-nationale.svg", senat: "/logos/senat.svg", europarl: "/logos/parlement-europeen.svg" };
const fr = (n: number) => n.toLocaleString("fr-FR");

export default function GroupesChambre({ chambre, groupes, equipes, mandatures, avecTitre }: {
  chambre: string;
  groupes: GroupeCompte[];
  equipes: Map<string, Agregat>;
  mandatures: MandatureExistante[];
  avecTitre?: boolean;
}) {
  return (
    <section>
      {avecTitre && (
        <div className="chambre-entete">
          <img className="logo-org" src={LOGOS[chambre] ?? ""} alt={NOM_CHAMBRE[chambre] ?? ""} height={26} loading="lazy" />
          <h2>{NOM_CHAMBRE[chambre]}</h2>
        </div>
      )}
      {groupes.length === 0 ? <p className="meta">Aucun groupe synchronisé pour l&apos;instant.</p> : (
        <ul className="grille-groupes">
          {groupes.map((g) => {
            const agg = equipes.get(chambre + "|" + g.groupe);
            return (
              <li key={g.groupe}>
                <a className="carte-groupe" href={`/groupe/${CHAMBRE_COURTE[chambre]}-${slugCollectif(g.groupe)}/`}>
                  <span className="badge-sigle">{g.groupe}</span>
                  <strong>{g.groupe_libelle || g.groupe}</strong>
                  <span className="carte-stats"><b>{fr(g.elus)}</b> élus{agg ? <> ; <b>{fr(agg.effectif)}</b> collaborateurs suivis</> : null}</span>
                  {agg && <span className="meta">Renouvellement 12 mois : {pct(tauxTurnover(agg), 1)} ; part de femmes : {pct(partFemmes(agg), 0)}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {mandatures.length > 0 && (
        <p className="meta">
          {"Par mandature : "}
          {mandatures.map((m, i) => (
            <span key={m.slug}>
              {i > 0 ? ", " : ""}
              <a href={"/groupe/" + CHAMBRE_COURTE[chambre] + "/" + m.slug}>{m.libelle}</a>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
