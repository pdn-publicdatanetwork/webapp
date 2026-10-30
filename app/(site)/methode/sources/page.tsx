import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sources : les publications officielles utilisées par DataParl'",
  description: "La liste des sources de DataParl' : publications parlementaires et électorales, contenu utilisé, fréquence de relevé et licence. Chaque chiffre du site renvoie à l'une de ces sources.",
  alternates: { canonical: "/methode/sources" },
  openGraph: {
    siteName: "DataParl'",
    title: "Sources : DataParl'",
    description: "Les publications officielles derrière chaque chiffre de DataParl'.",
    url: "https://www.dataparl.fr/methode/sources",
    type: "article",
  },
};

type Source = {
  nom: string;
  href: string;
  contenu: string;
  frequence: string;
  licence: string;
};

// Les sources de DataParl', groupées par famille. Chaque donnée publiée sur le
// site provient de l'une de ces publications officielles (ou est un complément
// manuel signalé comme tel).

const PARLEMENTAIRES: Source[] = [
  {
    nom: "Assemblée nationale : données ouvertes (data.assemblee-nationale.fr)",
    href: "https://data.assemblee-nationale.fr/",
    contenu: "Députés, mandats, groupes et commissions ; identifiants officiels (PA…)",
    frequence: "quotidien",
    licence: "réutilisation libre (licences ouvertes de l'AN)",
  },
  {
    nom: "Sénat : data.senat.fr et senat.fr",
    href: "https://data.senat.fr/",
    contenu: "Sénateurs, mandats, groupes et commissions ; pages individuelles senat.fr",
    frequence: "quotidien",
    licence: "réutilisation libre (licences ouvertes du Sénat)",
  },
  {
    nom: "Parlement européen",
    href: "https://www.europarl.europa.eu/meps/fr/full-list",
    contenu: "Députés européens, mandats, groupes et commissions",
    frequence: "quotidien",
    licence: "réutilisation libre",
  },
];

const COLLABORATEURS: Source[] = [
  {
    nom: "Assemblée nationale : liste des collaborateurs des députés",
    href: "https://www2.assemblee-nationale.fr/qui/fiche_deputes",
    contenu: "Collaborateurs parlementaires par député (fonction, période)",
    frequence: "quotidien (relève la date de publication)",
    licence: "document administratif public",
  },
  {
    nom: "Sénat : A.G.A.S. (liste des collaborateurs par sénateur)",
    href: "https://www.senat.fr/senateurs/collaborateurs.html",
    contenu: "Collaborateurs parlementaires par sénateur (fonction, période)",
    frequence: "quotidien (relève la date de publication)",
    licence: "document administratif public",
  },
  {
    nom: "Archives des listes officielles",
    href: "https://www.dataparl.fr/mouvements",
    contenu: "Historique des publications pour retracer les arrivées et départs passés",
    frequence: "à chaque publication",
    licence: "non précisée",
  },
];

const ELECTIONS: Source[] = [
  {
    nom: "Ministère de l'Intérieur : résultats des élections",
    href: "https://www.resultats-elections.interieur.gouv.fr/",
    contenu: "Résultats officiels des scrutins (sénatoriales 2026, législatives…), listes des élus",
    frequence: "à chaque scrutin",
    licence: "réutilisation libre",
  },
  {
    nom: "Journal officiel (JO République française : Légifrance)",
    href: "https://www.legifrance.gouv.fr/",
    contenu: "Nominations, décrets, compositions officielles (gouvernement, cabinets)",
    frequence: "à chaque publication",
    licence: "réutilisation libre",
  },
];

const COMPLEMENTS: Source[] = [
  {
    nom: "Sites institutionnels des élus (pages senat.fr, assemblee-nationale.fr, sites personnels)",
    href: "https://www.dataparl.fr/parlementaires",
    contenu: "Pages officielles et présence en ligne citées dans les fiches et biographies",
    frequence: "à la rédaction",
    licence: "non précisée",
  },
  {
    nom: "Rédaction DataParl'",
    href: "https://www.dataparl.fr/methode",
    contenu: "Biographies, mandats locaux et fonctions partisanes non couverts par les syncs : toujours signalés « précisé par DataParl' », avec source et date",
    frequence: "en continu",
    licence: "© DataParl'",
  },
];

function TableauSources({ titre, id, sources }: { titre: string; id: string; sources: Source[] }) {
  return (
    <section>
      <h2 id={id}>{titre}</h2>
      <div className="defile">
        <table className="stats">
          <thead>
            <tr><th>Source</th><th>Contenu utilisé</th><th>Fréquence de relevé</th><th>Licence</th></tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.nom}>
                <td><a href={s.href} target="_blank" rel="noopener noreferrer">{s.nom}</a></td>
                <td>{s.contenu}</td>
                <td>{s.frequence}</td>
                <td>{s.licence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SourcesDataParl() {
  return (
    <div className="methode">
      <p className="meta"><a href="/methode">← Méthode</a></p>
      <h1>Les <span className="surligne">sources</span> de DataParl&apos;</h1>
      <p className="lead">
        Tout chiffre publié sur DataParl&apos; provient d&apos;une publication officielle relevée dans
        cette liste : ou d&apos;un complément rédigé à la main, toujours signalé comme tel. Pour chaque
        source : le contenu utilisé, la fréquence de relevé et la licence de réutilisation.
      </p>

      <TableauSources titre="Parlementaires : identités, mandats, groupes" id="parlementaires" sources={PARLEMENTAIRES} />
      <TableauSources titre="Collaborateurs parlementaires : équipes et mouvements" id="collaborateurs" sources={COLLABORATEURS} />
      <TableauSources titre="Élections et actes officiels" id="elections" sources={ELECTIONS} />
      <TableauSources titre="Compléments rédigés par l'équipe" id="complements" sources={COMPLEMENTS} />

      <h2 id="citation">Citer DataParl&apos;</h2>
      <p>
        Nos tableaux sont la donnée de référence de la donnée officielle : citez
        «&nbsp;DataParl&apos; (dataparl.fr), d&apos;après les publications officielles de
        l&apos;Assemblée nationale et du Sénat&nbsp;» et la date des données. Le détail des formules
        et exclusions de chaque indicateur est dans la <a href="/methode">méthode</a> et les pages
        <a href="/vigiparl/methode"> VigiParl&apos;</a> et <a href="/mixiparl/methode"> MixiParl&apos;</a>.
      </p>

      <h2 id="api">Pour aller plus loin</h2>
      <p className="meta">
        Les données sont aussi disponibles via l&apos;<a href="https://api.dataparl.fr">API DataParl&apos;</a>{" "}
        et les exports de chaque fiche. Une source manque ou une donnée vous semble fausse ?{" "}
        <a href="/contact">Écrivez-nous</a>.
      </p>
    </div>
  );
}
