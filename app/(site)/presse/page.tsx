import type { Metadata } from "next";
import Marque from "@/app/_components/Marque";
import { compteAffectations, dataQuery } from "@/lib/data";
import FormulairePresse from "./FormulairePresse";

export const metadata: Metadata = {
  title: { absolute: "Presse & médias | DataParl'" },
  description: "Données quotidiennes sur les collaborateurs parlementaires : mouvements, taux de renouvellement, mixité. Accès et alertes pour les rédactions.",
  alternates: { canonical: "/presse" },
};
export const revalidate = 3600;

async function chiffres() {
  const [comptes, fiches, mouvements] = await Promise.all([
    compteAffectations().catch(() => ({} as Record<string, number>)),
    dataQuery<unknown>("collaborateurs", new URLSearchParams({ select: "collab_id", limit: "1" }), 3600).then((r) => r.total ?? 0).catch(() => 0),
    dataQuery<unknown>("mouvements", new URLSearchParams({ select: "id", limit: "1" }), 3600).then((r) => r.total ?? 0).catch(() => 0),
  ]);
  const enPoste = (comptes.assemblee ?? 0) + (comptes.senat ?? 0) + (comptes.europarl ?? 0);
  return { enPoste, fiches, mouvements };
}

const n = (x: number) => x.toLocaleString("fr-FR");

export default async function Presse() {
  const c = await chiffres();
  return (
    <>
      {/* Bandeau d'accueil presse : marine plein, chiffres du jour poses dessus. */}
      <section className="presse-hero">
      <h1>DataParl&apos; pour les <span className="surligne">rédactions</span></h1>
      <p className="lead">Savoir qui arrive, qui part et qui change d&apos;équipe, chaque matin, avant tout le monde.</p>
      <div className="chiffres">
        {c.enPoste > 0 && <div><strong>{n(c.enPoste)}</strong><span>collaborateurs suivis aujourd&apos;hui</span></div>}
        {c.fiches > 0 && <div><strong>{n(c.fiches)}</strong><span>parcours reconstitués depuis 2015</span></div>}
        {c.mouvements > 0 && <div><strong>{n(c.mouvements)}</strong><span>arrivées, départs et transferts recensés</span></div>}
        <div><strong>Chaque matin</strong><span>mise à jour d&apos;après les listes officielles</span></div>
      </div>
      </section>

      <h2>Ce que DataParl&apos; permet de raconter</h2>
      <div className="atouts colonnes-3">
        <div><strong>Le suivi politique</strong><span>Un conseiller qui quitte un député pour un ministre, une équipe qui se reconstitue après une élection partielle, un groupe qui recrute : les mouvements disent souvent ce que les déclarations taisent.</span></div>
        <div><strong>L&apos;enquête sur les équipes</strong><span>Qui a travaillé pour qui, et pendant combien de temps : le parcours d&apos;un collaborateur à travers l&apos;Assemblée, le Sénat et le Parlement européen depuis 2015.</span></div>
        <div><strong>Les départs en série</strong><span>Une équipe qui se vide en quelques semaines, un taux de renouvellement hors norme : VigiParl&apos; classe chaque élu, groupe par groupe.</span></div>
      </div>

      <h2>Ce que vous pouvez vérifier en 2 minutes</h2>
      <ol className="verifs">
        <li><strong>Qui a rejoint ou quitté une équipe aujourd&apos;hui ?</strong> La page du jour liste les mouvements publiés, chambre par chambre. <a href="/daily">Voir les mouvements jour par jour →</a></li>
        <li><strong>Quel élu renouvelle le plus ses collaborateurs ?</strong> Le classement par élu, groupe et famille politique, avec la méthode détaillée. <a href="/vigiparl">Ouvrir VigiParl&apos; →</a></li>
        <li><strong>Les équipes sont-elles paritaires ?</strong> La part de femmes par élu, groupe et chambre, et son évolution depuis 2016. <a href="/mixiparl">Ouvrir MixiParl&apos; →</a></li>
      </ol>

      <h2>Téléchargements presse</h2>
      <p>Gratuits, sur simple demande par email (formulaire ci-dessous) :</p>
      <ul>
        <li><strong>Le fichier CSV du jour</strong> : tous les mouvements publiés, avec chambre, élu, groupe et type ;</li>
        <li><strong>Les fiches VigiParl&apos; et MixiParl&apos;</strong> : les chiffres et graphiques du moment, prêts à citer ;</li>
        <li><strong>Le kit logo</strong> : DataParl&apos;, VigiParl&apos; et MixiParl&apos;.</li>
      </ul>
      <div className="kit-logos">
        <span className="logo-presse">Data<span className="surligne">Parl&apos;</span></span>
        <Marque prefixe="Vigi" couleur="vigi" />
        <Marque prefixe="Mixi" couleur="mixi" />
      </div>

      <h2>L&apos;offre rédaction</h2>
      <ul>
        <li><strong>Compte rédaction</strong> : les fiches collaborateurs sans vidéo publicitaire, pour les membres de la rédaction ;</li>
        <li><strong>Alertes étendues</strong> : autant d&apos;élus et de groupes suivis que nécessaire, sur plusieurs adresses ;</li>
        <li><strong>API</strong> : quota étendu sur demande, pour vos outils internes.</li>
      </ul>
      <p className="meta">L&apos;offre se met en place au cas par cas : écrivez-nous en précisant votre média.</p>

      <h2 id="contact">Écrire à la presse</h2>
      <p>Une demande de données, de précision ou d&apos;interview : <a href="mailto:presse@dataparl.fr">presse@dataparl.fr</a>. Réponse sous 48 heures ouvrées.</p>
      <FormulairePresse />

      <h2>Citer DataParl&apos;</h2>
      <blockquote className="citation">Selon DataParl&apos; (dataparl.fr), d&apos;après les publications officielles de l&apos;Assemblée nationale, du Sénat et du Parlement européen.</blockquote>
      <p>
        La base des mouvements et des affectations est diffusée sous licence <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>.
        Merci d&apos;indiquer la date des données (les chiffres évoluent chaque matin) et, en ligne, un lien vers la page citée.
        Détails : <a href="/informations-legales/licences">licences et réutilisation</a>. Méthodes : <a href="/vigiparl/methode">VigiParl&apos;</a> et <a href="/mixiparl/methode">MixiParl&apos;</a>.
      </p>
      <p className="meta"><a href="/presse/communiques">Communiqués de presse</a></p>
    </>
  );
}
