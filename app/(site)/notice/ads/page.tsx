import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Publicité sur DataParl'",
  description:
    "Pourquoi DataParl' affiche des annonces Google, ce que le service coûte et où va l'argent des revenus publicitaires.",
  alternates: { canonical: "/notice/ads" },
};
export const revalidate = 86400;

export default function NoticeAds() {
  return (
    <div className="etroit">
      <h1>Publicité sur <span className="surligne">DataParl&apos;</span></h1>
      <p className="lead">
        DataParl&apos; affiche des annonces Google (AdSense) afin de couvrir ses coûts d&apos;exploitation et de
        financer son développement.
      </p>

      <h2>Frais d&apos;exploitation</h2>
      <table>
        <thead>
          <tr><th scope="col">Poste</th><th scope="col">Coût</th></tr>
        </thead>
        <tbody>
          <tr><td>Hébergement</td><td>20 € par mois</td></tr>
          <tr><td>Bases de données</td><td>10 € par mois</td></tr>
          <tr><td>Nom de domaine</td><td>15 € par an</td></tr>
        </tbody>
      </table>
      <p className="meta">
        Le fonctionnement du service représente ainsi un coût annuel d&apos;environ 375 €.
      </p>

      <h2>Affectation des revenus</h2>
      <p>
        L&apos;intégralité des revenus publicitaires est réinvestie dans l&apos;amélioration du service :
        prise en charge des frais d&apos;hébergement, de bases de données et de nom de domaine, puis
        développement de nouvelles fonctionnalités.
      </p>

      <h2>Nos engagements</h2>
      <ul>
        <li><strong>Aucune publicité partisane</strong> : les annonces à caractère politique sont exclues via les paramètres de filtrage de Google.</li>
        <li><strong>Aucune revente de données nominatives</strong> à des fins de ciblage publicitaire.</li>
        <li><strong>Contenu inchangé</strong> : les données demeurent librement accessibles sous licence ODbL, et les alertes par courriel ne comportent pas de publicité.</li>
        <li><strong>Libre choix de l&apos;utilisateur</strong> : la publicité est désactivée par défaut. Elle n&apos;est activée qu&apos;avec le consentement exprès dans le bandeau cookies, et ce consentement est révocable à tout moment.</li>
      </ul>

      <h2>Nous contacter</h2>
      <p>Une question sur la publicité affichée ? <a href="/contact">Écrivez-nous</a>.</p>
    </div>
  );
}
