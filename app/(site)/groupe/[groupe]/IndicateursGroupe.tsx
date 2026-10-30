import { connection } from "next/server";
import { CHAMBRE_LONG } from "@/lib/format";
import { agreger, equipeEligible, mixiteMoyenne, partFemmes, pct, statsElus, tauxTurnover } from "@/lib/stats";

// Indicateurs citables d'un groupe parlementaire : mixité et renouvellement des
// équipes de collaborateurs, en tête de page sous forme d'un paragraphe factuel
// daté (extrait repris tel quel par les moteurs de recherche et les IA) et de
// données structurées schema.org (Dataset).

export default async function IndicateursGroupe({ chambre, sigle }: { chambre: string; sigle: string }) {
  await connection(); // date du jour fiable, rendu à la demande (cache 1 h)
  const rows = (await statsElus().catch(() => []))
    .filter((r) => r.chambre === chambre && r.elu_groupe === sigle && r.effectif > 0);
  if (rows.length < 1) return null;

  const a = agreger(rows, () => sigle)[0];
  const avecEquipe = rows.filter(equipeEligible);
  const mix = mixiteMoyenne(avecEquipe);
  const femmes = partFemmes({ femmes: a.femmes, hommes: a.hommes });
  const turnover = tauxTurnover(a);
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  const phrase = `Les équipes de collaborateurs des élus du groupe ${sigle} à la ${CHAMBRE_LONG[chambre]} comptent ${a.effectif} collaborateurs, à ${pct(femmes)} de femmes ; le taux de mixité moyen de ces équipes est de ${mix.taux !== null ? pct(mix.taux) : "–"} et leur renouvellement de ${pct(turnover)} sur 12 mois (données officielles, au ${date}, source : DataParl').`;

  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Mixité et renouvellement des équipes parlementaires du groupe ${sigle} (${CHAMBRE_LONG[chambre]})`,
    description: phrase,
    url: "https://www.dataparl.fr/groupe/",
    creator: { "@type": "Organization", name: "DataParl'", url: "https://www.dataparl.fr" },
    dateModified: new Date().toISOString().slice(0, 10),
    spatialCoverage: "France",
    variableMeasured: [
      { "@type": "PropertyValue", name: "Collaborateurs des équipes du groupe", value: a.effectif },
      { "@type": "PropertyValue", name: "Part de femmes", value: femmes !== null ? Math.round(femmes * 100) : null },
      { "@type": "PropertyValue", name: "Taux de mixité moyen", value: mix.taux !== null ? Math.round(mix.taux * 100) : null },
      { "@type": "PropertyValue", name: "Taux de renouvellement sur 12 mois", value: turnover !== null ? Math.round(turnover * 100) : null },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset).replace(/</g, "\u003c") }} />
      <h2>Mixité et renouvellement des équipes</h2>
      <p className="lead" style={{ marginBottom: 0 }}>{phrase}</p>
      <div className="chiffres paires">
        <div>
          <strong style={{ color: "var(--mixi, #7c4dff)" }}>{pct(femmes)}</strong>
          <span>de femmes parmi les {a.effectif} collaborateurs des {a.elus} élus</span>
        </div>
        <div>
          <strong style={{ color: "var(--vigi, #C8102E)" }}>{pct(turnover)}</strong>
          <span>renouvellement des équipes sur 12 mois ({a.departs_12m} départ{a.departs_12m > 1 ? "s" : ""})</span>
        </div>
      </div>
      <p className="meta">
        Calcul détaillé et classement : <a href="/mixiparl">MixiParl&rsquo;</a>, <a href="/vigiparl">VigiParl&rsquo;</a>
        {", "}méthodes : <a href="/mixiparl/methode">mixité</a>, <a href="/vigiparl/methode">renouvellement</a>
      </p>
    </>
  );
}
