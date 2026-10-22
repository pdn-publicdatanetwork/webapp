// Historique des versions des textes légaux. Une entrée par modification
// du texte : la première est la version en vigueur, les suivantes les
// précédentes, de la plus récente à la plus ancienne. Ajouter une entrée en
// tête de la liste correspondante à chaque modification d'une page légale.
// Les résumés s'adressent aux visiteurs : dire ce qui change pour eux, pas
// le détail technique du dépôt.
export type VersionTexte = { date: string; resume?: string };

// Version 0 de tous les textes : 22 octobre 2026. Les évolutions
// précédentes (reconstituées depuis l'historique du dépôt) ne sont plus
// affichées ; elles reprennent à compter de cette date.
export const VERSIONS: Record<string, VersionTexte[]> = {
  cgu: [{ date: "22 octobre 2026" }],
  cguApi: [{ date: "22 octobre 2026" }],
  cguChat: [{ date: "22 octobre 2026" }],
  cguSheets: [{ date: "22 octobre 2026" }],
  cguJobs: [{ date: "22 octobre 2026" }],
  confidentialite: [{ date: "22 octobre 2026" }],
  cookies: [{ date: "22 octobre 2026" }],
  licences: [{ date: "22 octobre 2026" }],
  mentions: [{ date: "22 octobre 2026" }],
};

// Bandeau de version en tête de chaque page légale : la version en vigueur
// et, le cas échéant, son objet, puis la liste repliable des évolutions
// précédentes (sans JavaScript, via <details>).
export function HistoriqueTexte({ versions }: { versions: VersionTexte[] }) {
  const [courante, ...anterieures] = versions;
  return (
    <div className="versions-texte">
      <p className="meta">
        Version du {courante.date}
        {courante.resume ? <> — {courante.resume}</> : null}
      </p>
      {anterieures.length > 0 && (
        <details>
          <summary>Évolutions précédentes de ce texte</summary>
          <ul>
            {anterieures.map((v) => (
              <li key={v.date}>
                <strong>{v.date}</strong>
                <span>{v.resume}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
