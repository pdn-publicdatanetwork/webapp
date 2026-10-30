// Styles communs des pages internes du centre de compte : aération
// généreuse (40px entre les grands blocs), titres de section en DM Sans
// semi-bold, fil d'Ariane discret. Rendu par <StyleCompte /> en haut de page.
export default function StyleCompte() {
  return (
    <style>{`
      .fil-compte { margin: 0 0 4px; }
      .section-compte { border-top: 1px solid var(--line); margin-top: 40px; padding-top: 0; }
      .section-compte h2 { font-family: var(--font-dm-sans), "DM Sans", system-ui, sans-serif; font-size: 1.2rem; font-weight: 600; margin: 0 0 6px; line-height: 1.3; }
    `}</style>
  );
}
