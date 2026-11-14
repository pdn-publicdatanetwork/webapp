import type { ReactNode } from "react";

// Layout des formulaires DataForm' (groupe (forms) : contact, et bientôt
// d'autres enquêtes) : pages détachées du site, sans l'en-tête, la recherche
// ni le pied de page de www.dataparl.fr. Chaque formulaire dessine sa propre
// coquille (df-zone : logo, progression, pied de page formulaire) et vit sur
// forms.dataparl.fr ; les adresses www/contact, api/contact et jobs/contact
// y redirigent (proxy.ts, jobs/app/contact/page.tsx).
export default function LayoutFormulaires({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
