import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Méthode : comment DataParl' collecte et croise les données parlementaires",
  description: "Les étapes de DataParl' : sources officielles, synchronisation nocturne, compléments manuels vérifiés, indicateurs (VigiParl', MixiParl') et contrôle qualité : tout ce qui sépare une donnée brute d'une donnée utilisable.",
  alternates: { canonical: "/methode" },
  openGraph: {
    siteName: "DataParl'",
    title: "Méthode DataParl'",
    description: "Des publications officielles aux fiches publiées : collecte, croisement, vérification.",
    url: "https://www.dataparl.fr/methode",
    type: "article",
  },
};

// Page méthode générale : elle explique la chaîne de traitement commune à tout
// DataParl' (collecte → référentiel → croisement → publication), puis renvoie
// vers les méthodes détaillées de chaque indicateur et vers la liste des sources.

export default function MethodeDataParl() {
  return (
    <div className="methode">
      <p className="meta"><a href="/">DataParl&apos;</a></p>
      <h1>La <span className="surligne">méthode</span> DataParl&apos;</h1>
      <p className="lead">
        DataParl&apos; suit qui travaille pour qui au Parlement : collaborateurs parlementaires, mouvements
        d&apos;équipes, mandats et fonctions. Tout part de publications officielles, croisées chaque nuit
        puis complétées à la main quand l&apos;officiel est muet. Cette page décrit la chaîne complète :
        les méthodes de calcul de chaque indicateur ont leur propre page.
      </p>

      <h2 id="principes">Trois principes</h2>
      <ol>
        <li>
          <strong>L&apos;officiel d&apos;abord.</strong> Une donnée publiée par une institution parlementaire
          (Assemblée nationale, Sénat, Parlement européen) prime sur toute autre source. Nous ne publions
          rien qui contredise une publication officielle en cours de validité.
        </li>
        <li>
          <strong>Traçable.</strong> Chaque chiffre renvoie à sa publication d&apos;origine et à sa date
          d&apos;extraction : voir la <a href="/methode/sources">liste complète des sources</a>. Citer
          DataParl&apos;, c&apos;est citer les publications officielles derrière.
        </li>
        <li>
          <strong>Séparé du commentaire.</strong> Les fiches décrivent ; elles ne jugent pas. Un taux de
          renouvellement ou une biographie ne portent aucune appréciation politique.
        </li>
      </ol>

      <h2 id="chaine">La chaîne de traitement, de la source à la page</h2>
      <p>Chaque nuit, un pipeline en quatre étapes remet le site à jour :</p>
      <ol className="etapes-methode">
        <li>
          <p className="parcours-titre"><strong>1. Extraction</strong></p>
          <p className="meta">Les listes officielles sont relevées : collaborateurs (A.G.A.S. au Sénat, données ouvertes de l&apos;Assemblée), parlementaires, mandats, groupes et commissions. La date de la publication source est conservée : c&apos;est elle qui fait foi, pas la date du relevé.</p>
        </li>
        <li>
          <p className="parcours-titre"><strong>2. Référentiel</strong></p>
          <p className="meta">Les personnes sont identifiées une seule fois : un collaborateur qui change d&apos;élu garde le même identifiant, un député devenu sénateur garde le même dossier (ses deux fiches historiques sont rattachées au même parcours). C&apos;est ce croisement qui rend possibles les « transferts » d&apos;un élu à l&apos;autre et d&apos;une chambre à l&apos;autre.</p>
        </li>
        <li>
          <p className="parcours-titre"><strong>3. Compléments manuels</strong></p>
          <p className="meta">Ce que l&apos;officiel ne couvre pas (mandats locaux, fonctions partisanes, biographies) est rédigé à la main par l&apos;équipe, depuis l&apos;administration, sans jamais écraser une donnée synchronisée. Chaque complément porte sa source et son auteur ; les fiches concernées le signalent (« précisé par DataParl&apos; »).</p>
        </li>
        <li>
          <p className="parcours-titre"><strong>4. Publication</strong></p>
          <p className="meta">Les pages sont régénérées (au maximum toutes les heures), les indicateurs recalculés sur les données fraîches. Les erreurs détectées sont corrigées à la source et les changements de méthode sont datés et documentés en bas de chaque page concernée.</p>
        </li>
      </ol>

      <h2 id="indicateurs">Les indicateurs et leurs méthodes</h2>
      <p>
        Chaque outil de DataParl&apos; a sa propre page de méthode : populations retenues, formules,
        exclusions et limites.
      </p>
      <ul className="organes">
        <li><a href="/vigiparl/methode">Méthode VigiParl&apos;</a> <span className="meta">: le taux de renouvellement des équipes</span></li>
        <li><a href="/mixiparl/methode">Méthode MixiParl&apos;</a> <span className="meta">: la mixité femmes-hommes des équipes</span></li>
      </ul>

      <h2 id="limites">Limites assumées</h2>
      <ul>
        <li><strong>La date de publication n&apos;est pas la date réelle.</strong> Les listes officielles donnent rarement la date effective d&apos;un départ ou d&apos;une embauche : nous retenons la date de publication, et nous le disons.</li>
        <li><strong>L&apos;officiel peut être en retard.</strong> Après un scrutin, les groupes, commissions et fiches mettent des semaines à paraître : les pages affichent alors ce qui est publié, et marquent « à compléter » le reste plutôt que d&apos;inventer.</li>
        <li><strong>Les compléments manuels sont datés et sourcés.</strong> Une biographie rédigée par l&apos;équipe est signalée comme telle : elle n&apos;est jamais présentée comme une donnée officielle.</li>
      </ul>

      <h2 id="corrections">Corrections</h2>
      <p>
        Une erreur repérée dans une fiche ? Écrivez-nous via la <a href="/contact">page contact</a> en
        précisant la page et, si possible, la publication officielle qui contredit notre donnée : les
        corrections sont prioritaires et documentées.
      </p>

      <p className="meta" style={{ marginTop: 32 }}>
        Voir aussi : <a href="/methode/sources">la liste des sources</a>, <a href="/faq">les questions fréquentes</a>,{" "}
        <a href="/informations-legales/mentions-legales">les mentions légales</a>
      </p>
    </div>
  );
}
