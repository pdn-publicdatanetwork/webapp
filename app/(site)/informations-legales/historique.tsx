// Historique des versions des textes légaux. Une entrée par modification
// du texte : la première est la version en vigueur, les suivantes les
// précédentes, de la plus récente à la plus ancienne. Ajouter une entrée en
// tête de la liste correspondante à chaque modification d'une page légale.
// Les résumés s'adressent aux visiteurs : dire ce qui change pour eux, pas
// le détail technique du dépôt.
export type VersionTexte = { date: string; resume: string };

export const VERSIONS: Record<string, VersionTexte[]> = {
  cgu: [
    { date: "22 octobre 2026", resume: "Clarification de ce que DataParl' conserve après la suppression d'un compte, en lien avec la page Données personnelles." },
    { date: "4 octobre 2026", resume: "Fiches collaborateurs : conditions d'accès à la vidéo de déblocage publicitaire." },
  ],
  cguApi: [
    { date: "4 octobre 2026", resume: "Ajout du lien de retour vers la présentation de l'API." },
  ],
  cguChat: [
    { date: "11 octobre 2026", resume: "Extension des conditions à la Mini App DataParl' Chat, accessible depuis Telegram." },
    { date: "10 octobre 2026", resume: "Première version des conditions du chat, avec les informations sur la conservation des questions posées." },
  ],
  cguSheets: [
    { date: "4 octobre 2026", resume: "Première version des conditions propres au tableur DataParl' Sheets." },
  ],
  cguJobs: [
    { date: "7 octobre 2026", resume: "Première version des conditions : DataParl' Jobs publie des offres, il ne traite aucune candidature." },
  ],
  confidentialite: [
    { date: "22 octobre 2026", resume: "Journal des comptes (créations, suppressions) et délai de suppression des données personnelles." },
    { date: "19 octobre 2026", resume: "Retrait des mesures d'ouverture des emails et de liens cliqués ; liste des prestataires actualisée." },
    { date: "13 octobre 2026", resume: "Mesure d'audience et publicité avec consentement (Google Analytics 4, Microsoft Clarity)." },
  ],
  cookies: [
    { date: "13 octobre 2026", resume: "Microsoft Clarity ajouté aux outils de mesure d'audience." },
    { date: "4 octobre 2026", resume: "Mise en place du bandeau de gestion des cookies et du consentement publicitaire." },
  ],
  licences: [
    { date: "19 octobre 2026", resume: "Liste des sources actualisée (Internet Archive)." },
  ],
  mentions: [
    { date: "4 octobre 2026", resume: "Clarification de la liste des sous-domaines du site." },
  ],
};

// Bandeau de version en tête de chaque page légale : la version en vigueur
// et son objet, puis la liste repliable des évolutions précédentes (sans
// JavaScript, via <details>).
export function HistoriqueTexte({ versions }: { versions: VersionTexte[] }) {
  const [courante, ...anterieures] = versions;
  return (
    <div className="versions-texte">
      <p className="meta">
        Version du {courante.date} — {courante.resume}
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
