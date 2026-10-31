import type { GroupeCompte } from "@/lib/collectifsData";
import type { MandatureExistante } from "@/lib/mandaturesData";
import { CHAMBRE_COURTE, slugCollectif } from "@/lib/collectifs";
import { partFemmes, pct, tauxTurnover, type Agregat } from "@/lib/stats";
import { couleurParti, NOM_CHAMBRE } from "@/lib/couleurs";
import { cheminLogoGroupe } from "@/lib/media";

// Section « groupes d'une chambre » de l'index /groupe : cartes riches dans
// le même style que les pages par chambre (pastille colorée ou logo pour
// l'Assemblée nationale), triées par nombre d'élus décroissant comme
// l'hémicycle des pages par chambre.
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
            const logo = cheminLogoGroupe(chambre, g.groupe);
            return (
              <li key={g.groupe}>
                <a
                  className="groupe-carte"
                  style={{ ["--c" as string]: couleurParti(g.groupe) }}
                  href={`/groupe/${CHAMBRE_COURTE[chambre]}-${slugCollectif(g.groupe)}/`}
                >
                  {logo
                    ? <img className="groupe-carte-logo" src={logo} alt="" width={42} height={42} loading="lazy" />
                    : <span className="groupe-pastille">{g.groupe}</span>}
                  <span className="groupe-carte-corps">
                    <strong>{g.groupe_libelle || g.groupe}</strong>
                    <span><b>{fr(g.elus)}</b> élus{agg ? <> ; <b>{fr(agg.effectif)}</b> collaborateurs</> : null}</span>
                    {agg && <span className="meta">Renouvellement 12 mois : {pct(tauxTurnover(agg), 1)} ; Femmes : {pct(partFemmes(agg), 0)}</span>}
                  </span>
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
