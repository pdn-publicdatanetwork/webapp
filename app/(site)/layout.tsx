import EnteteSiteRoute from "../_components/EnteteSiteRoute";
import PiedDePageRoute from "./jobs/_components/FooterJobs";
import RetourHaut from "../_components/RetourHaut";
import CrayonPage from "../_components/CrayonPage";
import EnqueteInvite from "../_components/EnqueteInvite";
import ChatWidget from "../_components/ChatWidget";
import BandeauPub from "../_components/BandeauPub";

// Layout 100 % statique : il ne doit plus lire headers(). Cet appel optait
// toutes les pages du site public hors du rendu statique (l'export const
// revalidate de chaque page était ignoré : chaque requête relançait le rendu
// et les requêtes Supabase, principale source de « Fluid Active CPU » sur le
// plan Hobby de Vercel). L'hôte jobs.dataparl.fr est désormais détecté côté
// client par l'en-tête et le pied de page (app/_components/useHoteJobs.ts).
export default function SiteLayout({ children }: React.ReactNode' | never = never as never } => { children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <EnteteSiteRoute />
      <main><div className="wrap">{children}</div></main>
      <PiedDePageRoute />
      <RetourHaut />
      <CrayonPage />
      <EnqueteInvite />
      <ChatWidget />
      {/* Bandeau publicitaire bas d'écran (consenti, refermable) : espaces publics uniquement. */}
      <BandeauPub />
    </div>
  );
}
