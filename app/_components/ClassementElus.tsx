import RechercheStatElu, { type LigneElu } from "./RechercheStatElu";

// Classement par élu : recherche en tête, puis le classement page par page
// (25 élus), filtrable par famille ou par groupe.
const PAR_PAGE = 25;

export default function ClassementElus({ base, lignes, colonnes, page, filtre, autreChambre, ordre }: {
  base: string; lignes: LigneElu[]; colonnes: string[]; page: number; filtre?: { cle: "famille" | "groupe"; valeur: string };
  autreChambre: { libelle: string; href: string }; ordre?: { libelle: string; href: string };
}) {
  const pages = Math.max(1, Math.ceil(lignes.length / PAR_PAGE));
  const p = Math.min(Math.max(1, page), pages);
  const tranche = lignes.slice((p - 1) * PAR_PAGE, p * PAR_PAGE);
  const lien = (n: number) => {
    const q = new URLSearchParams();
    if (filtre) q.set(filtre.cle, filtre.valeur);
    if (n > 1) q.set("page", String(n));
    const s = q.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };
  return (
    <>
      <RechercheStatElu id="classement-recherche" placeholder="Chercher un élu dans le classement" colonnes={colonnes} lignes={lignes} />
      <p className="meta">
        {filtre && <>Filtre : <strong>{filtre.valeur}</strong>, <a href={base}>tout afficher</a>, </>}
        <a href={autreChambre.href}>{autreChambre.libelle}</a>{ordre && <>, <a href={ordre.href}>{ordre.libelle}</a></>}
      </p>
      {lignes.length === 0 ? <p className="meta">Aucun élu pour ce filtre.</p> : (
        <div className="defile">
          <table className="stats">
            <thead><tr><th className="num">Rang</th><th>Élu</th><th>Groupe</th>{colonnes.map((c) => <th key={c} className="num">{c}</th>)}</tr></thead>
            <tbody>{tranche.map((l) => (
              <tr key={l.href}><td className="num">{l.rang}</td><td><a href={l.href}>{l.nom}</a></td><td>{l.groupe}</td>
                {l.valeurs.map((v, i) => <td key={i} className="num">{v}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <nav className="pagination" aria-label="Pages du classement">
        {p > 1 ? <a href={lien(p - 1)}>← Précédents</a> : <span />}
        <span className="meta">Page {p} sur {pages}, {lignes.length} élus</span>
        {p < pages ? <a href={lien(p + 1)}>Suivants →</a> : <span />}
      </nav>
    </>
  );
}
