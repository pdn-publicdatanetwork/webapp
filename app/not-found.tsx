import Logo from "./_components/Logo";
import PhraseRejetee from "./_components/PhraseRejetee";
import RechercheGlobale from "./_components/RechercheGlobale";

// Urne vide : dessin original, trait marine, fente sur le dessus.
function UrneVide() {
  return (
    <svg viewBox="0 0 200 180" width="200" height="180" role="img" aria-label="Une urne vide">
      <ellipse cx="100" cy="166" rx="74" ry="7" fill="currentColor" opacity=".08" />
      <path d="M40 58 L160 58 L150 160 L50 160 Z" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <path d="M32 44 L168 44 L160 58 L40 58 Z" fill="var(--jaune)" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <rect x="80" y="48" width="40" height="5" rx="2.5" fill="currentColor" />
      <path d="M58 70 L64 150 M142 70 L136 150" stroke="currentColor" strokeWidth="3" opacity=".25" strokeLinecap="round" />
      <text x="100" y="118" textAnchor="middle" fontFamily="Spectral, Georgia, serif" fontWeight="700" fontSize="30" fill="currentColor">0</text>
    </svg>
  );
}

// Page 404 volontairement 100% statique. Diagnostic du 25/11 : des robots sans
// JavaScript rendaient cette page 2000 à 4100 fois par heure, et chaque rendu
// exécutait derniersMouvements(3) vers Supabase (le cache unstable_cache n'est
// pas partage entre isolates Workers depuis la migration Cloudflare). Une 404
// ne doit plus couter des requetes de base de donnees : le bloc « Pendant ce
// temps, au Parlement » est retire, l'urne et la recherche restent.
export default function NotFound() {
  return (
    <div className="page">
      <header className="site"><div className="wrap"><Logo /></div></header>
      <main>
        <div className="wrap" style={{ textAlign: "center", paddingTop: 24 }}>
          <div style={{ color: "var(--ink)" }}><UrneVide /></div>
          <h1><span className="surligne">Motion rejetée.</span></h1>
          <PhraseRejetee />
          <div className="recherche-404"><RechercheGlobale id="recherche-404" placeholder="Chercher un élu, un collaborateur, une page…" /></div>
          <ul className="rattrapage">
            <li><a href="https://www.dataparl.fr/mouvements/parlement">Mouvements</a></li>
            <li><a href="https://www.dataparl.fr/parlementaires">Parlementaires</a></li>
            <li><a href="https://www.dataparl.fr/vigiparl">Vigi<span className="surligne-vigi">Parl&apos;</span></a></li>
            <li><a href="https://www.dataparl.fr/mixiparl">Mixi<span className="surligne-mixi">Parl&apos;</span></a></li>
          </ul>
          <a className="btn" href="https://www.dataparl.fr/">Retour à l&apos;accueil</a>
        </div>
      </main>
    </div>
  );
}
