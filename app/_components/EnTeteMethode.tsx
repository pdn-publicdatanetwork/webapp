import { dateTitre } from "@/lib/daily";

// Bandeau de version et pied de licence des pages de méthode.
export function VersionMethode({ donnees, historique }: { donnees: string | null; historique: { date: string; texte: string }[] }) {
  const v = historique[historique.length - 1]?.date;
  return (
    <p className="version-methode">
      Méthode applicable aux données {donnees ? `du ${dateTitre(donnees)}` : "actuelles"}
      {v ? `, version du ${dateTitre(v)}` : ""}. Toute évolution de méthode est datée et décrite <a href="#historique">en bas de page</a>.
    </p>
  );
}

export type Extraction = { chambre: string; date: string; date_source: string | null; n_affectations: number | null };

// Sources des chiffres, dans la page : publication officielle d'origine, date
// d'extraction et date de la publication. Pas de fichier à télécharger.
const SOURCES: Record<string, { nom: string; href: string; contenu: string }> = {
  assemblee: { nom: "Assemblée nationale, données ouvertes", href: "https://data.assemblee-nationale.fr/", contenu: "Liste des collaborateurs des députés ; députés et groupes" },
  senat: { nom: "Sénat", href: "https://www.senat.fr/", contenu: "Liste des collaborateurs par sénateur (A.G.A.S.) ; sénateurs et groupes (data.senat.fr)" },
};

export function PiedMethode({ historique, extractions }: { historique: { date: string; texte: string }[]; extractions: Extraction[] }) {
  return (
    <>
      <h2 id="donnees">Sources des chiffres</h2>
      <p>
        Tous les chiffres de cette page sont calculés par DataParl&apos; à partir des publications officielles ci-dessous. Les tableaux
        de cette page sont la donnée de référence : citez « DataParl&apos; (dataparl.fr), d&apos;après les publications officielles de
        l&apos;Assemblée nationale et du Sénat » et la date des données.
      </p>
      <div className="defile">
        <table className="stats">
          <thead><tr><th>Publication officielle</th><th>Contenu utilisé</th><th>Dernière extraction</th><th>Date de la publication</th><th className="num">Collaborateurs relevés</th></tr></thead>
          <tbody>{["assemblee", "senat"].map((c) => {
            const e = extractions.find((x) => x.chambre === c);
            return (
              <tr key={c}><td><a href={SOURCES[c].href}>{SOURCES[c].nom}</a></td><td>{SOURCES[c].contenu}</td>
                <td>{e ? dateTitre(e.date) : "–"}</td><td>{e?.date_source ? dateTitre(e.date_source.slice(0, 10)) : "–"}</td>
                <td className="num">{e?.n_affectations?.toLocaleString("fr-FR") ?? "–"}</td></tr>
            );
          })}</tbody>
        </table>
      </div>
      <p className="meta">
        Publications sous Licence Ouverte 2.0 ; archives depuis 2015. Base DataParl&apos; sous <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>.
        Détails : <a href="/informations-legales/licences">licences et réutilisation</a>. Besoin des données dans un autre format : <a href="/presse#contact">écrivez-nous</a> ou utilisez l&apos;<a href="https://api.dataparl.fr">API</a>.
      </p>
      <h2 id="historique">Historique de la méthode</h2>
      <ul>{historique.map((h) => <li key={h.date}><strong>{dateTitre(h.date)}</strong> : {h.texte}</li>)}</ul>
    </>
  );
}
