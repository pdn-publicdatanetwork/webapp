"use client";

import { useState } from "react";
import styles from "./fiche.module.css";

// Partage de la fiche : X, Bluesky, LinkedIn (intent officiels, ouverture
// dans un nouvel onglet) et copie du lien. Aucune donnée n'est envoyée à un
// tiers avant le clic de l'utilisateur.

export default function Partager({ slug, nom }: { slug: string; nom: string }) {
  const [copie, setCopie] = useState(false);
  const url = `https://www.dataparl.fr/collab/${slug}`;
  const texte = `Le parcours de ${nom} sur DataParl'`;

  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé) : rien à faire.
    }
  }

  return (
    <div className={styles.partager}>
      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(texte)}&url=${encodeURIComponent(url)}`}
        target="_blank" rel="noopener noreferrer">X</a>
      <a href={`https://bsky.app/intent/compose?text=${encodeURIComponent(texte + " " + url)}`}
        target="_blank" rel="noopener noreferrer">Bluesky</a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <button onClick={copier} className={copie ? styles.copieOk : undefined} aria-live="polite">
        {copie ? "Lien copié ✓" : "Copier le lien"}
      </button>
    </div>
  );
}
