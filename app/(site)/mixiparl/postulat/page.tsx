import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Le postulat de MixiParl' : pourquoi mesurer la mixité des équipes parlementaires ?",
  description: "Parlementaires employeurs directs, cadre légal de l'égalité professionnelle, ce que MixiParl' ne mesure pas : les raisons de mesurer la mixité des équipes de collaborateurs parlementaires.",
  alternates: { canonical: "/mixiparl/postulat" },
};
export const revalidate = 3600;

export default function PostulatMixiParl() {
  return (
    <div className="methode">
      <p className="meta"><a href="/mixiparl">MixiParl&apos;</a></p>
      <h1>Pourquoi mesurer la <span className="surligne-mixi">mixité</span> des équipes parlementaires ?</h1>
      <div className="exemple">
        <strong>Le postulat en bref</strong>
        <p style={{ margin: "6px 0 0" }}>
          Les députés et les sénateurs sont des employeurs directs. Ils recrutent des collaborateurs sous contrat de droit privé,
          définissent leurs tâches et contrôlent leur exécution. MixiParl&apos; observe la composition femmes-hommes de ces équipes :
          une donnée d&apos;intérêt public, puisque l&apos;emploi est financé par un crédit public. MixiParl&apos; ne mesure pas une
          discrimination et ne repose pas sur une obligation légale de parité applicable aux équipes parlementaires.
        </p>
      </div>

      <h2 id="employeur-particulier">Un employeur particulier</h2>
      <p>
        L&apos;article 8 bis de l&apos;ordonnance n° 58-1100 du 17 novembre 1958 relative au fonctionnement des assemblées parlementaires
        dispose que les députés et les sénateurs peuvent employer, sous contrat de droit privé, des collaborateurs qui les assistent
        dans l&apos;exercice de leurs fonctions.
      </p>
      <p>
        Le même article prévoit que l&apos;élu définit les tâches confiées à ses collaborateurs et en contrôle l&apos;exécution. Les bureaux
        de l&apos;Assemblée nationale et du Sénat fixent les conditions générales d&apos;emploi des collaborateurs parlementaires, et un
        crédit est affecté à leur rémunération.
      </p>
      <p>
        Les collaborateurs parlementaires ne sont donc pas de simples auxiliaires symboliques du mandat. Ils exercent une activité
        salariée, dans le cadre d&apos;une relation de travail de droit privé, au service direct d&apos;un élu.
      </p>

      <h2 id="regles">Des règles que le Parlement a adoptées</h2>
      <p>
        Le Parlement participe à l&apos;élaboration des règles relatives à l&apos;égalité professionnelle entre les femmes et les hommes.
        Ces règles concernent principalement les employeurs, les entreprises et certaines instances de gouvernance ou de direction.
      </p>
      <p>
        Elles ne créent pas, en l&apos;état du droit, une obligation de parité applicable aux équipes de collaborateurs parlementaires.
        Mais elles dessinent un cadre public dans lequel la composition des équipes de travail, l&apos;égalité professionnelle et la
        représentation équilibrée des femmes et des hommes sont considérées comme des objets légitimes de mesure et de transparence.
      </p>

      <h3 id="index-egalite">L&apos;index de l&apos;égalité professionnelle</h3>
      <p>
        Depuis 2019 pour les entreprises de plus de 250 salariés, puis depuis 2020 pour celles d&apos;au moins 50, les entreprises
        concernées doivent calculer et publier chaque année, au plus tard le 1er mars, un index de l&apos;égalité professionnelle entre
        les femmes et les hommes.
      </p>
      <p>
        Cet index évalue plusieurs dimensions de l&apos;égalité professionnelle, notamment les écarts de rémunération, les augmentations
        individuelles, les promotions, les retours de congé maternité et la représentation des deux sexes parmi les dix plus hautes
        rémunérations.
      </p>
      <p>
        Une entreprise dont l&apos;index est inférieur à 75 points doit déterminer et publier des mesures correctives. À défaut de mise
        en conformité dans les délais impartis, elle peut être sanctionnée financièrement.
      </p>

      <h3 id="conseils">La représentation équilibrée dans les conseils</h3>
      <p>
        La loi n° 2011-103 du 27 janvier 2011 impose une représentation minimale de 40 % de chaque sexe dans les conseils
        d&apos;administration et les conseils de surveillance des sociétés visées par le dispositif.
      </p>
      <p>
        Cette règle concerne des organes de gouvernance. Elle ne concerne ni les équipes de collaborateurs parlementaires, ni les
        comités exécutifs ou comités de direction des entreprises.
      </p>

      <h3 id="rixain">Les objectifs de la loi Rixain</h3>
      <p>
        La loi n° 2021-1774 du 24 décembre 2021 visant à accélérer l&apos;égalité économique et professionnelle fixe des objectifs
        progressifs de représentation équilibrée pour les entreprises employant au moins 1 000 salariés pendant trois exercices
        consécutifs.
      </p>
      <p>
        Depuis le 1er mars 2026, chaque sexe doit représenter au moins 30 % des cadres dirigeants et des membres des instances
        dirigeantes (deux ensembles distincts). Au 1er mars 2029, ce seuil doit atteindre 40 % pour chacun de ces deux ensembles.
      </p>
      <p>
        Il s&apos;agit d&apos;objectifs de représentation minimale de chaque sexe, et non d&apos;une parité stricte de 50/50. La loi
        distingue les cadres dirigeants, définis notamment par le Code du travail, des membres des instances dirigeantes, qui assistent
        régulièrement la direction générale.
      </p>
      <p>
        Une règle, en revanche, s&apos;applique pleinement aux collaborateurs parlementaires : l&apos;interdiction de toute discrimination
        à l&apos;embauche et dans l&apos;emploi, notamment celle fondée sur le sexe, prévue par le Code du travail. Le Parlement
        l&apos;a votée, et elle lie tout employeur de droit privé, les parlementaires employeurs inclus. MixiParl&apos; n&apos;en
        évalue pas le respect : la composition d&apos;une équipe ne permet pas d&apos;établir l&apos;existence ou l&apos;absence
        d&apos;une discrimination.
      </p>

      <h2 id="pas-dit">Ce que MixiParl&apos; ne dit pas</h2>
      <p>
        MixiParl&apos; ne mesure pas le respect, par un parlementaire, d&apos;une obligation légale de parité. Aucune règle
        n&apos;impose à un député ou à un sénateur de recruter une équipe composée à 50 % de femmes et à 50 % d&apos;hommes.
      </p>
      <p>MixiParl&apos; ne mesure pas non plus :</p>
      <ul>
        <li>l&apos;existence d&apos;une discrimination à l&apos;embauche ;</li>
        <li>l&apos;égalité des rémunérations ;</li>
        <li>les conditions de travail ;</li>
        <li>la compétence, l&apos;expérience ou le mérite des collaborateurs ;</li>
        <li>les intentions d&apos;un élu lors d&apos;un recrutement ;</li>
        <li>la qualité du travail politique d&apos;une équipe.</li>
      </ul>
      <p>
        Une équipe exclusivement masculine ou exclusivement féminine ne démontre pas, à elle seule, une pratique discriminatoire.
        Inversement, une équipe proche de la parité ne démontre pas l&apos;absence de discrimination. La composition est une donnée
        observable ; elle ne permet pas, seule, d&apos;établir une intention ou une faute.
      </p>

      <h2 id="observe">Ce que MixiParl&apos; observe</h2>
      <p>
        MixiParl&apos; mesure la mixité des équipes de collaborateurs des députés et des sénateurs, à partir des publications
        officielles de l&apos;Assemblée nationale et du Sénat.
      </p>
      <p>
        L&apos;indicateur principal est le <strong>taux de mixité</strong> : 100 % pour une équipe composée pour moitié de femmes et pour
        moitié d&apos;hommes, 0 % pour une équipe composée d&apos;un seul genre. L&apos;<strong>écart de genre</strong> indique le sens
        du déséquilibre, et la <strong>part de femmes</strong> la composition réelle. Un élu comptant autant de collaboratrices que de
        collaborateurs affiche un écart nul.
      </p>
      <p>
        Les définitions complètes, les formules, les exemples et les limites statistiques sont publiés dans{" "}
        <a href="/mixiparl/methode">la méthode</a>.
      </p>

      <h2 id="pourquoi-mixite">Pourquoi la mixité, et non la seule part de femmes</h2>
      <p>
        La part de femmes est une information essentielle, mais elle ne suffit pas à décrire la mixité : une équipe 100 % féminine et
        une équipe 100 % masculine ont des parts de femmes très différentes, et aucune des deux n&apos;est mixte. Une équipe à 70 %
        de femmes et une équipe à 30 % affichent le même taux de mixité, 60 % : également éloignées de la parité, dans des directions
        opposées. C&apos;est pourquoi la part de femmes est affichée en complément du taux de mixité, jamais comme mesure de la mixité.
      </p>

      <h2 id="limites-bref">Les limites, en bref</h2>
      <p>
        Les équipes parlementaires sont petites : une équipe de trois personnes ne peut jamais être exactement paritaire (33 % ou
        67 % de femmes), d&apos;où la convention de 40 % à 60 %. À l&apos;Assemblée nationale, le genre est estimé à partir du
        prénom ; les personnes dont le genre ne peut pas être établi avec certitude sont exclues plutôt que classées arbitrairement,
        et leur nombre est publié. La composition observée dépend aussi de facteurs qui ne relèvent pas uniquement des choix
        individuels d&apos;un élu : vivier de candidatures, localisation du poste, temps de travail, rotation des équipes et
        calendrier électoral.
      </p>
      <p>
        Ces limites sont détaillées, avec leurs conséquences chiffrées, dans <a href="/mixiparl/methode">la méthode</a>.
      </p>

      <h2 id="interet-public">Un objet d&apos;intérêt public</h2>
      <p>
        Les collaborateurs parlementaires participent directement au fonctionnement de l&apos;activité parlementaire. Ils assistent
        les élus dans l&apos;exercice de leurs fonctions, dans des domaines qui peuvent inclure le suivi législatif, la communication,
        les relations avec les administrés, les relations institutionnelles ou l&apos;organisation du travail parlementaire.
      </p>
      <p>
        Leur emploi est financé par un crédit public affecté à cet effet. La composition des équipes qui bénéficient de ces moyens
        constitue donc une information d&apos;intérêt public, au même titre que d&apos;autres dimensions du fonctionnement des
        institutions.
      </p>
      <p>
        MixiParl&apos; ne cherche pas à noter les parlementaires. Il cherche à rendre observable une dimension de leur activité
        d&apos;employeurs, afin d&apos;alimenter un débat public fondé sur des données vérifiables.
      </p>

      <h2 id="positionnement">Le positionnement de DataParl&apos;</h2>
      <p>
        DataParl&apos; ne formule pas de jugement moral sur les choix de recrutement individuels. Il publie des données agrégées,
        documente sa méthode, indique ses sources et distingue ce que l&apos;indice mesure de ce qu&apos;il ne mesure pas.
      </p>
      <p>La question posée par MixiParl&apos; est simple :</p>
      <blockquote>
        <p>Les équipes de collaborateurs des parlementaires sont-elles mixtes, et comment évoluent-elles dans le temps ?</p>
      </blockquote>
      <p>
        La réponse n&apos;est ni une accusation, ni une sanction : c&apos;est une contribution factuelle à la transparence sur une
        réalité professionnelle qui se joue au cœur des institutions démocratiques.
      </p>
    </div>
  );
}
