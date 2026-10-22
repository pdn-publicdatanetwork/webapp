import LogoSite from "./LogoSite";
import BarreRechercheHeader from "./BarreRechercheHeader";
import MenuDeconnexion from "./MenuDeconnexion";

export const API_URL = "https://api.dataparl.fr";

// Liens du menu de navigation (en-tête www).
const NAV = [
  { href: "/mouvements", label: "Mouvements" },
  { href: "/collab", label: "Collaborateurs" },
  { href: "/parlementaires", label: "Parlementaires" },
  { href: "/vigiparl", label: "VigiParl'" },
  { href: "/mixiparl", label: "MixiParl'" },
  { href: "/alertes", label: "Alertes" },
];

// En-tête www : logo à gauche, recherche au milieu, menu ☰ à droite
// (les liens de navigation, dont « Mon compte », sont dans le menu déroulant ;
// « Se déconnecter » n'apparaît que si une session existe).
export function EnTeteSite({ maintenance = false }: { maintenance?: boolean }) {
  // Mode maintenance : le menu ☰ disparaît — ses liens mènent tous à des pages
  // coupées. Restent visibles : logo, recherche et pied de page. Sur www,
  // EnteteSiteRoute le déduit du chemin (le proxy réécrit tout vers
  // /maintenance quand la maintenance est active).
  const liens = [...NAV, { href: "/mon-compte", label: "Mon compte" }];
  return (
    <header className="site entete-principale">
      <div className="wrap">
        <LogoSite />
        {/* Recherche élus / collaborateurs, présente sur presque toutes les pages. */}
        <BarreRechercheHeader />
        {/* Menu déroulant natif, sans JavaScript, à droite. */}
        {!maintenance && (
          <details className="menu-site">
            <summary aria-label="Ouvrir le menu de navigation">☰ Menu</summary>
            <nav aria-label="Navigation principale">
              {liens.map((l) => (
                <a key={l.href} href={l.href}>{l.label}</a>
              ))}
              <MenuDeconnexion />
            </nav>
          </details>
        )}
      </div>
    </header>
  );
}

export function PiedDePage({ api = false }: { api?: boolean }) {
  return (
    <footer className="site">
      <div className="wrap pied-une-ligne">
        <span className="meta">
          {api ? "© 2026 DataParl' API : DataParl' au format brut." : "© 2026 DataParl' : le Parlement, pièce par pièce."}
        </span>
        {api ? (
          <nav aria-label="Plan du site de l'API">
            <a href="/sitemap">Plan du site</a>
            <a href="https://www.dataparl.fr/informations-legales/cgu-api">Informations légales</a>
          </nav>
        ) : (
          <nav aria-label="Plan du site">
            <a href="https://status.dataparl.fr">Statut</a>
            <a href="/a-propos">À propos</a>
            <a href="/sitemap">Plan du site</a>
            <a href="/informations-legales">Informations légales</a>
          </nav>
        )}
      </div>
    </footer>
  );
}
