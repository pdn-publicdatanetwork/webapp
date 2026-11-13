import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nos engagements",
  description:
    "Données libres (ODbL), publicité contextuelle sans traceur, communications opt-in, données nominatives jamais revendues : tout ce que DataParl' garantit, visiteur, inscrit ou abonné.",
  alternates: { canonical: "/nos-engagements" },
};
export const revalidate = 86400;

const ENGAGEMENTS: { titre: string; texte: ReactNode }[] = [
  {
    titre: "La donnée reste libre",
    texte: (
      <>
        Les jeux de données sont publiés sur data.gouv.fr sous <strong>licence ODbL</strong> :
        libre réutilisation avec mention. On ne vend jamais l&apos;accès à la donnée ni aux
        enrichissements : fiches, historique des mandatures, mouvements JORF, archives. La{" "}
        <a href="/methode">méthode</a> est publiée en détail et datée.
      </>
    ),
  },
  {
    titre: "Aucun traceur publicitaire",
    texte: (
      <>
        La publicité est <strong>contextuelle uniquement</strong> : aucun cookie publicitaire,
        aucune annonce personnalisée, aucun profil. Vos lectures ne servent jamais à vous cibler,
        même gratuit. Un bloc par page de contenu, jamais en plein écran, jamais de publicité
        politique.
      </>
    ),
  },
  {
    titre: "Vos données personnelles ne sont jamais revendues",
    texte: (
      <>
        Ni vendues, ni louées, ni partagées à des annonceurs. Les traitements sont décrits dans
        les <a href="/informations-legales">Informations légales</a>, et votre compte reste vôtre :
        export et suppression à tout moment depuis <a href="/mon-compte">Mon espace</a>.
      </>
    ),
  },
  {
    titre: "Chaque communication a son interrupteur",
    texte: (
      <>
        <a href="/alertes">Alertes</a>, newsletter : tout s&apos;active et se coupe librement,
        fonction par fonction, dans <a href="/mon-compte">Mon espace</a>. Rien n&apos;est accepté
        d&apos;avance, et la veille par e-mail restera toujours gratuite.
      </>
    ),
  },
  {
    titre: "La publicité finance l&apos;accès libre",
    texte: (
      <>
        C&apos;est elle qui finance l&apos;accès libre au site, l&apos;hébergement, la collecte
        quotidienne et l&apos;infrastructure qui reconstitue le Parlement chaque jour.
        L&apos;abonnement sans publicité la remplace, à hauteur de 3 € par mois.
      </>
    ),
  },
  {
    titre: "Votre choix vous suit, sans redemande",
    texte: (
      <>
        Que vous visitiez le site ou que vous vous connectiez (e-mail, Google, GitHub), votre
        choix d&apos;accès vaut pour votre compte DataParl&apos;. Il est retirable à tout moment
        depuis <a href="/mon-compte">Mon espace</a>.
      </>
    ),
  },
];

export default function NosEngagements() {
  return (
    <div className="etroit">
      <h1>Nos <span className="surligne">engagements</span></h1>
      <p className="lead">
        DataParl&apos; reconstitue le Parlement chaque jour et publie tout ce qu&apos;il collecte.
        Voici ce que nous garantissons, que vous soyez visiteur, inscrit ou abonné.
      </p>

      {ENGAGEMENTS.map((e) => (
        <section key={e.titre}>
          <h2>{e.titre}</h2>
          <p>{e.texte}</p>
        </section>
      ))}

      <h2>Le Sans pub, 3 € par mois</h2>
      <p>
        Zéro publicité, zéro traceur, aucun partenaire annonceur, résiliable à tout moment depuis
        la rubrique <a href="/mon-compte/achats">Achats de Mon espace</a>. Pour les détails
        (éditeur, hébergement, traitements), lisez les{" "}
        <a href="/informations-legales">Informations légales</a>.
      </p>
    </div>
  );
}
