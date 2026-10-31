import { assistantsGroupement, equipeDuGroupe } from "@/lib/equipesGroupesData";

// Section « L'équipe du groupe » des fiches de groupes : secrétaire général,
// adjoints et collaborateurs attachés au groupe (et non à un élu), sourcés.
// Au Parlement européen, les assistants « (groupement) » déjà en base
// complètent l'équipe : dédupliqués par la lib (une ligne par personne et
// fonction), en casse normale, triés alphabétiquement.

// Casse normale des noms stockés en majuscules : « BRASTENHOFER » → « Brastenhofer ».
function casseNormale(s: string): string {
  return s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (m, sep: string, l: string) => sep + l.toUpperCase());
}

function nomComplet(m: { prenom?: string | null; nom: string }) {
  return [m.prenom, casseNormale(m.nom)].filter(Boolean).join(" ");
}

export default async function EquipeGroupe({ chambre, sigle }: { chambre: string; sigle: string }) {
  const [equipe, groupement] = await Promise.all([
    equipeDuGroupe(chambre, sigle).catch(() => []),
    chambre === "europarl" ? assistantsGroupement(sigle).catch(() => []) : Promise.resolve([]),
  ]);
  if (!equipe.length && !groupement.length) return null;

  return (
    <>
      <h2>L&rsquo;équipe du groupe</h2>
      <p className="meta" style={{ marginTop: 0 }}>
        Secrétariat du groupe : personnel attaché au groupe lui-même (secrétaire général, adjoints,
        collaborateurs de groupe), distinct des collaborateurs des élus.
      </p>
      {equipe.length > 0 && (
        <ul>
          {equipe.map((m) => (
            <li key={`eq-${m.nom}`}>
              <strong>{nomComplet(m)}</strong>
              {m.fonction ? <> : {m.fonction}</> : null}{" "}
              <span className="meta">
                source&nbsp;: {m.url_source ? <a href={m.url_source}>{m.source}</a> : m.source}
                {m.date_source ? ` (${m.date_source})` : ""}
                {m.confiance === "a_verifier" ? " (à vérifier)" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {groupement.length > 0 && (
        <>
          <h3>Assistants rattachés au groupe</h3>
          <p className="meta">
            {groupement.length} assistant{groupement.length > 1 ? "s" : ""} accrédité{groupement.length > 1 ? "s" : ""} ou
            {" "}{groupement.length > 1 ? "locaux" : "local"} rattaché{groupement.length > 1 ? "s" : ""} au groupe politique
            (et non aux élus individuels), par ordre alphabétique.
          </p>
          <ul>
            {groupement.map((m, i) => (
              <li key={`grp-${i}`}>
                <strong>{nomComplet({ prenom: m.collab_prenom, nom: m.collab_nom })}</strong>
                {m.fonction ? <> : {m.fonction}</> : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
