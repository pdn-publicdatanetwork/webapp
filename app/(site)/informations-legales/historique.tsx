// Historique des versions des textes légaux. Une entrée par modification du
// texte : la première est la version en vigueur, les suivantes les
// précédentes, de la plus récente à la plus ancienne. Ajouter une entrête en
// haut de liste à chaque modification d'une page légale.
export type VersionTexte = { date: string; resume: string };

export const VERSIONS: Record<string, VersionTexte[]> = {
  cgu: [
    { date: "22 octobre 2026", resume: "Trace conservée après suppression d'un compte : reformulation et renvoi vers la page Données personnelles." },
    { date: "4 octobre 2026", resume: "Reprise du texte : déblocage des fiches collaborateurs par vidéo publicitaire, comptes à rôles." },
    { date: "30 septembre 2026", resume: "Mouvements, alertes filtrées, adresses email déduites : alignement sur les fonctionnalités publiées." },
    { date: "29 septembre 2026", resume: "Première version publiée avec le lancement du site." },
  ],
  cguApi: [
    { date: "4 octobre 2026", resume: "Lien de retour vers le site de l'API." },
    { date: "30 septembre 2026", resume: "Passage à dataparl.fr : adresses et mentions mises à jour." },
    { date: "29 septembre 2026", resume: "Première version publiée." },
  ],
  cguChat: [
    { date: "11 octobre 2026", resume: "Couverture de la Mini App DataParl' Chat (accès via l'identité Telegram)." },
    { date: "10 octobre 2026", resume: "Déclaration de la journalisation des questions (statistiques, qualité) ; première version, entrée en vigueur le 10 octobre 2026." },
  ],
  cguSheets: [
    { date: "4 octobre 2026", resume: "Publication des conditions propres au tableur DataParl' Sheets (media.dataparl.fr/sheets)." },
  ],
  cguJobs: [
    { date: "7 octobre 2026", resume: "Première version : service d'information sur les offres, aucune candidature traitée." },
  ],
  confidentialite: [
    { date: "22 octobre 2026", resume: "Journal des comptes, suppression des données et trace conservée après suppression d'un compte." },
    { date: "19 octobre 2026", resume: "Retrait des mesures d'ouverture des emails et de liens courts ; prestataires actualisés." },
    { date: "13 octobre 2026", resume: "Mesure d'audience et publicité avec consentement (GA4, Clarity) ; finalités orientées qualité du service." },
    { date: "4 octobre 2026", resume: "Reprise de la page : fiches de parcours, déblocage par vidéo, sous-traitants actualisés." },
    { date: "29 septembre 2026", resume: "Première version publiée avec le lancement du site." },
  ],
  cookies: [
    { date: "13 octobre 2026", resume: "Mention de Microsoft Clarity dans la mesure d'audience." },
    { date: "4 octobre 2026", resume: "Consentement publicitaire : bandeau maison avec Consent Mode v2 ; reprise de la page." },
    { date: "29 septembre 2026", resume: "Première version publiée." },
  ],
  licences: [
    { date: "19 octobre 2026", resume: "La source s'appelle « Internet Archive » ; tableau des sources actualisé." },
    { date: "4 octobre 2026", resume: "Reprise de la page ; retrait du lien vers le dépôt des fichiers CSV." },
    { date: "29 septembre 2026", resume: "Première version publiée." },
  ],
  mentions: [
    { date: "4 octobre 2026", resume: "Retrait des sous-domaines internes et techniques ; clarification des sous-domaines publics." },
    { date: "1 octobre 2026", resume: "media.dataparl.fr et page de crédit photo." },
    { date: "30 septembre 2026", resume: "Passage à dataparl.fr (redirections depuis cavaparlement.eu et dataparl.com)." },
    { date: "29 septembre 2026", resume: "Première version publiée avec le lancement du site." },
  ],
};

// Bandeau de version affiché en tête de chaque page légale : la version en
// vigueur, puis la liste repliable des évolutions précédentes (sans
// JavaScript, via <details>), dans l'esprit des sélecteurs de version de
// grandes plateformes.
export function HistoriqueTexte({ versions }: { versions: VersionTexte[] }) {
  const [courante, ...anterieures] = versions;
  return (
    <div className="meta versions-texte">
      <p>Version du {courante.date}</p>
      {anterieures.length > 0 && (
        <details>
          <summary>
            Évolutions de ce texte ({anterieures.length} version{anterieures.length > 1 ? "s" : ""} précédente{anterieures.length > 1 ? "s" : ""})
          </summary>
          <ul>
            {anterieures.map((v) => (
              <li key={v.date}><strong>{v.date}</strong> — {v.resume}</li>
            ))}
          </ul>
          <p>Le texte intégral de chaque version reste consultable dans l&apos;historique public du code du site.</p>
        </details>
      )}
    </div>
  );
}
