import type { Metadata } from "next";
import { PiedMethode, VersionMethode } from "@/app/_components/EnTeteMethode";
import { derniersJours } from "@/lib/daily";
import { CHAMBRE_LONG } from "@/lib/format";
import {
  agreger, dernieresExtractions, HISTORIQUE_METHODE, mixite, mixiteMoyenne, partFemmes, pct, statsAnnuelles, statsElus, statsMixiteAnnuelle,
  type StatAnnuelle, type StatElu, type StatMixiteAnnuelle,
} from "@/lib/stats";

export const metadata: Metadata = {
  title: "Méthode MixiParl' : la mixité des équipes",
  description: "Comment DataParl' mesure la mixité des équipes parlementaires : taux de mixité, écart de genre, détermination du genre, part de femmes, parité, exemples et limites.",
  alternates: { canonical: "/mixiparl/methode" },
};
export const revalidate = 3600;

const n = (x: number) => x.toLocaleString("fr-FR");
const CH = ["assemblee", "senat"] as const;

export default async function MethodeMixiParl() {
  const [rows, annees, mixAnnuelle, extractions, donnees] = await Promise.all([
    statsElus().catch(() => [] as StatElu[]), statsAnnuelles().catch(() => [] as StatAnnuelle[]),
    statsMixiteAnnuelle().catch(() => [] as StatMixiteAnnuelle[]), dernieresExtractions().catch(() => []),
    derniersJours(1).then((j) => j[0]?.date ?? null).catch(() => null),
  ]);
  const parChambre = Object.fromEntries(agreger(rows, (r) => r.chambre).map((a) => [a.cle, a]));
  const m = mixite(rows.filter((r) => r.chambre !== "europarl"));
  const mixDe = (a: StatAnnuelle) => mixAnnuelle.find((x) => x.chambre === a.chambre && x.an === a.an);
  const derniere = Math.max(0, ...annees.map((a) => a.an));
  const ex = annees.find((a) => a.chambre === "assemblee" && a.an === derniere);

  return (
    <div className="methode">
      <p className="meta"><a href="/mixiparl">MixiParl&apos;</a></p>
      <h1>Méthode <span className="surligne-mixi">MixiParl&apos;</span></h1>
      <VersionMethode donnees={donnees} historique={HISTORIQUE_METHODE.mixiparl} />
      <p className="lead">
        La question : <strong>les équipes parlementaires sont-elles mixtes ?</strong> L&apos;indicateur principal est le <strong>taux de mixité</strong> ;
        l&apos;<strong>écart de genre</strong> en indique le sens, la part de femmes, la parité et le nombre d&apos;équipes non mixtes le complètent.
        Pourquoi cette mesure a un sens, juridique et démocratique : voir la page <a href="/mixiparl/postulat">Le postulat</a>.
      </p>

      <h2 id="taux-de-mixite">Le taux de mixité</h2>
      <p>
        La part de femmes ne mesure pas la mixité : une équipe 100 % féminine n&apos;est pas plus mixte qu&apos;une équipe 100 % masculine.
        Le taux de mixité vaut 100 % pour une équipe à 50 % de femmes et 50 % d&apos;hommes, et 0 % pour une équipe composée d&apos;un seul genre.
      </p>
      <div className="formule">
        <p><code>Taux de mixité = 1 − |2 × part de femmes − 1|</code></p>
        <p>Calculé pour chaque équipe de <strong>2 personnes ou plus</strong>, dont tous les membres sont de genre déterminé.</p>
        <p>Pour une chambre, un groupe ou une famille : <strong>moyenne</strong> des taux de mixité de ses équipes. On ne mélange pas les effectifs : deux équipes non mixtes, l&apos;une de femmes, l&apos;autre d&apos;hommes, donnent 0 %, pas 100 %.</p>
      </div>
      <div className="exemple">
        <strong>Exemples</strong>
        <p style={{ margin: "6px 0 0" }}>
          50 % de femmes : 1 − |2 × 0,5 − 1| = <strong>100 %</strong> de mixité. 70 % de femmes : 1 − |1,4 − 1| = <strong>60 %</strong>.
          30 % de femmes : 1 − |0,6 − 1| = <strong>60 %</strong>. 100 % de femmes ou d&apos;hommes : 1 − 1 = <strong>0 %</strong>.
        </p>
      </div>
      {CH.filter((c) => parChambre[c]).map((c) => {
        const mm = mixiteMoyenne(rows.filter((r) => r.chambre === c));
        return <p key={c}>{CHAMBRE_LONG[c]} aujourd&apos;hui : <strong>{pct(mm.taux)}</strong> de mixité en moyenne, sur {n(mm.equipes)} équipes éligibles.</p>;
      })}
      <div className="exemple">
        <strong>Pourquoi pas l&apos;indice de Blau ?</strong>
        <p style={{ margin: "6px 0 0" }}>
          Il existe en recherche un indice de diversité très utilisé, l&apos;indice de Blau. MixiParl&apos; ne l&apos;utilise pas. Le taux de mixité
          appartient à la même famille et donne le même classement (même optimum, mêmes zéros), mais se lit directement : 100 % moins la
          valeur absolue de l&apos;écart en points. L&apos;indice de Blau, quadratique, attribue à une équipe de 2 femmes et 1 homme une valeur
          normalisée de 89 %, plus flatteuse et moins intuitive. Quiconque en a besoin le retrouve en une ligne, à partir de l&apos;écart :
          Blau normalisé = 1 − (écart en valeur absolue ÷ 100)².
        </p>
      </div>

      <h2 id="ecart-de-genre">L&apos;écart de genre</h2>
      <p>
        Le taux de mixité dit à quel point une équipe est équilibrée ; il ne dit pas dans quel sens elle penche. Une équipe de
        2 femmes et 1 homme et une équipe de 1 femme et 2 hommes affichent le même taux, 66,7 %. L&apos;écart de genre complète la mesure :
      </p>
      <div className="formule">
        <p><code>Écart de genre = part de femmes − part d&apos;hommes</code></p>
        <p>La part d&apos;hommes est le complément de la part de femmes (100 % moins la part de femmes).</p>
      </div>
      <ul>
        <li>0 : parité, autant de femmes que d&apos;hommes ;</li>
        <li>+33,3 points : majorité féminine (exemple : 2 femmes, 1 homme) ;</li>
        <li>−33,3 points : majorité masculine (exemple : 1 femme, 2 hommes) ;</li>
        <li>+100 ou −100 points : équipe composée d&apos;un seul genre.</li>
      </ul>
      <p>
        Il est affiché uniquement au niveau d&apos;une équipe, sur la fiche d&apos;un élu et dans les classements, avec un libellé :
        « parité » à effectifs égaux, « majorité féminine » ou « majorité masculine » sinon ; une équipe d&apos;un seul genre est
        signalée comme entièrement féminine ou entièrement masculine. Sur les cartes des familles, des groupes et des chambres,
        entre la part de femmes et l&apos;écart de genre, seule la part de femmes est indiquée : un écart moyen n&apos;aurait pas de sens
        comme mesure de mixité, une équipe 100 % féminine et une équipe 100 % masculine présentent chacune un écart de 100 points
        en valeur absolue, mais la moyenne de leurs écarts signés vaut 0 alors qu&apos;aucune des deux n&apos;est mixte.
      </p>
      <p>
        Relation exacte avec le taux : taux de mixité = 100 % moins la valeur absolue de l&apos;écart en points. Une équipe à 33,3 points
        de la parité affiche 66,7 % : les deux chiffres d&apos;une même fiche se déduisent l&apos;un de l&apos;autre.
      </p>

      <h2 id="genre">Comment le genre est déterminé</h2>
      <ul>
        <li><strong>Sénat</strong> : d&apos;après la civilité (M. ou Mme) publiée dans la liste officielle.</li>
        <li>
          <strong>Assemblée nationale</strong> : la liste officielle ne donne pas la civilité. Le genre est déduit du prénom, grâce à un
          dictionnaire de plus de 2 000 prénoms observés avec leur civilité dans les publications 2012-2024. Un prénom porté par les deux
          genres (Camille, Dominique, Claude…) ou inconnu reste <strong>indéterminé</strong>.
        </li>
        <li>
          Les personnes de genre indéterminé sont exclues du numérateur <em>et</em> du dénominateur.
          {CH.filter((c) => parChambre[c]).map((c) => {
            const a = parChambre[c];
            return <span key={c}> {CHAMBRE_LONG[c]} : genre déterminé pour {pct((a.femmes + a.hommes) / Math.max(1, a.effectif))} des collaborateurs actuels.</span>;
          })}
        </li>
        <li>
          Le genre déduit est conservé dans la base pour calculer ces statistiques. DataParl&apos; ne publie que des chiffres agrégés
          (par élu, groupe, chambre) ; sur une fiche ou un résultat de recherche, il sert seulement à accorder l&apos;intitulé
          (collaborateur ou collaboratrice).
        </li>
        <li>
          Trois statuts, donc : genre renseigné (civilité publiée), genre estimé (prénom) et genre indéterminé. La mesure repose sur
          ce que publient les institutions, jamais sur une identité de genre déclarée par les personnes.
        </li>
      </ul>

      <h2 id="part-femmes">La part de femmes</h2>
      <div className="formule">
        <p><code>Part de femmes = collaboratrices en poste ÷ collaborateurs de genre déterminé en poste</code></p>
        <p>Pour les séries annuelles, l&apos;effectif est pris au 1er janvier de chaque année ; pour les chiffres du jour, à la dernière mise à jour.</p>
      </div>
      {ex && (
        <div className="exemple">
          <strong>Exemple chiffré : Assemblée nationale, 1er janvier {ex.an}</strong>
          <p style={{ margin: "6px 0 0" }}>
            {n(ex.femmes)} femmes et {n(ex.hommes)} hommes de genre déterminé ({n(ex.effectif - ex.femmes - ex.hommes)} indéterminés, écartés) :
            {" "}{n(ex.femmes)} ÷ ({n(ex.femmes)} + {n(ex.hommes)}) = <strong>{pct(partFemmes(ex), 1)}</strong>.
          </p>
        </div>
      )}

      <h2 id="parite">La parité d&apos;une équipe</h2>
      <div className="formule">
        <p><code>Une équipe est à parité si sa part de femmes est comprise entre 40 % et 60 %, soit un taux de mixité de 80 % ou plus</code></p>
        <p>Calculé sur les équipes de <strong>2 personnes ou plus</strong>, dont tous les membres sont de genre déterminé.</p>
      </div>
      <p className="meta">
        Cas limite : une équipe de 2 n&apos;est à parité qu&apos;à 1 femme et 1 homme, une équipe de 3 ne l&apos;est jamais exactement
        (33 % ou 67 %) ; la fourchette de 40 % à 60 % ne nuance vraiment qu&apos;à partir de 5 membres.
      </p>
      <p className="meta">
        Cette fourchette est une convention de lecture, propre à MixiParl&apos; ; elle ne correspond à aucune définition légale de la
        parité applicable aux équipes parlementaires. Elle se lit aussi sur l&apos;écart : une équipe est dans la fourchette si son
        écart ne dépasse pas 20 points. Une équipe peut donc afficher une majorité féminine ou masculine et rester dans la fourchette
        de parité ; les deux indications ne se contredisent pas, la fourchette dit le niveau, le libellé dit le sens.
      </p>

      <h2 id="non-mixite">Les équipes non mixtes</h2>
      <div className="formule">
        <p><code>Une équipe de 2 personnes ou plus est non mixte si elle compte 100 % de femmes ou 100 % d&apos;hommes</code></p>
        <p>Comptage des équipes en poste à la dernière mise à jour, avec les mêmes règles d&apos;éligibilité que la parité.</p>
      </div>
      <p>
        Ces compteurs sont publiés à chaque mise à jour : équipes recensées, équipes éligibles et équipes écartées, avec la raison de
        l&apos;écart (moins de 2 personnes, ou au moins un membre de genre indéterminé). Le périmètre étant toujours affiché, chaque
        comparaison d&apos;une chambre ou d&apos;une année à l&apos;autre peut être vérifiée : une différence de périmètre est visible
        plutôt qu&apos;ignorée.
      </p>
      {m.eligibles > 0 && (
        <p>
          Aujourd&apos;hui : {n(m.eligibles)} équipes éligibles, dont {n(m.paritaires)} à parité ({pct(m.paritaires / m.eligibles)})
          et {n(m.nonMixtes)} non mixtes. {n(m.exclues)} équipes comptant au moins un membre de genre indéterminé sont écartées des deux indicateurs.
        </p>
      )}

      <h2 id="exemples">Exemples</h2>
      <div className="defile"><table className="stats">
        <thead><tr><th>Équipe (fictive)</th><th className="num">Part de femmes</th><th className="num">Taux de mixité</th><th className="num">Écart de genre</th><th>Parité</th><th>Non mixte</th></tr></thead>
        <tbody>
          <tr><td>3 femmes, 2 hommes</td><td className="num">60 %</td><td className="num">80 %</td><td className="num">+20 pts, majorité féminine</td><td>Oui</td><td>Non</td></tr>
          <tr><td>4 femmes, 4 hommes</td><td className="num">50 %</td><td className="num">100 %</td><td className="num">0 pt, parité</td><td>Oui</td><td>Non</td></tr>
          <tr><td>1 femme, 3 hommes</td><td className="num">25 %</td><td className="num">50 %</td><td className="num">−50 pts, majorité masculine</td><td>Non</td><td>Non</td></tr>
          <tr><td>3 femmes, 0 homme</td><td className="num">100 %</td><td className="num">0 %</td><td className="num">+100 pts, équipe entièrement féminine</td><td>Non</td><td>Oui</td></tr>
          <tr><td>1 personne</td><td className="num">–</td><td className="num">–</td><td className="num">–</td><td colSpan={2}>Hors périmètre (moins de 2 personnes)</td></tr>
          <tr><td>2 femmes, 1 homme, 1 « Camille »</td><td className="num">–</td><td className="num">–</td><td className="num">–</td><td colSpan={2}>Écartée (un genre indéterminé)</td></tr>
        </tbody>
      </table></div>

      <h2 id="limites">Limites</h2>
      <ul>
        <li>À l&apos;Assemblée, le genre est une déduction : un prénom peut être porté autrement que la majorité des cas observés.</li>
        <li>
          Les prénoms épicènes et rares restent indéterminés, ce qui écarte certaines équipes des indicateurs de parité. Une évolution
          de la mixité d&apos;une année sur l&apos;autre peut donc aussi refléter une évolution de la part des genres indéterminés : la
          table annuelle publie, pour chaque année, le nombre de collaborateurs de genre indéterminé, qui permet de suivre cette part.
        </li>
        <li>
          Le genre est binaire dans les publications officielles (civilité M. ou Mme) : la mesure l&apos;est donc aussi. Le genre mesuré
          est déduit de ces publications ; ce n&apos;est jamais une identité de genre déclarée par les personnes.
        </li>
        <li>Parlement européen : suivi en pause, pas de statistiques pour l&apos;instant.</li>
      </ul>

      {annees.length > 0 && (
        <>
          <h2 id="table-annuelle">La table annuelle</h2>
          <div className="defile">
            <table className="stats">
              <thead><tr><th>1er janvier</th><th>Chambre</th><th className="num">Équipes éligibles</th><th className="num">Taux de mixité moyen</th><th className="num">Femmes</th><th className="num">Hommes</th><th className="num">Indéterminés</th><th className="num">Part de femmes</th></tr></thead>
              <tbody>{annees.map((a) => (
                <tr key={`${a.chambre}-${a.an}`}><td>{a.an}</td><td>{CHAMBRE_LONG[a.chambre]}</td>
                  <td className="num">{mixDe(a)?.equipes ?? "–"}</td><td className="num">{pct(mixDe(a)?.mixite_moyenne ?? null, 1)}</td><td className="num">{n(a.femmes)}</td><td className="num">{n(a.hommes)}</td>
                  <td className="num">{n(a.effectif - a.femmes - a.hommes)}</td><td className="num">{pct(partFemmes(a), 1)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
      <PiedMethode historique={HISTORIQUE_METHODE.mixiparl} extractions={extractions} />
    </div>
  );
}
