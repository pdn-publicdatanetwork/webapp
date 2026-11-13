"use client";
import { usePathname } from "next/navigation";
import { EnTeteSite } from "./SiteChrome";
import EnTeteJobs from "../(site)/jobs/_components/EnTeteJobs";
import { useHoteJobs } from "./useHoteJobs";
import { useHoteMy } from "./useHoteMy";
import { CapsuleEntete } from "./CapsuleChrome";

// En-tête du site www : l'en-tête Jobs (logo + menu du module) remplace
// l'en-tête standard sur DataParl' Jobs, et l'en-tête de la capsule
// (my.dataparl.fr, « Mon espace ») remplace tout le monde sur my. La
// réécriture du proxy étant transparente (usePathname voit l'URL publique),
// l'hôte est détecté côté client ; les chemins /jobs/… et /capsule servent
// de repli pour les environnements de test.
export default function EnteteSiteRoute() {
  const chemin = usePathname() ?? "";
  // Les deux hooks sont TOUJOURS appelés avant tout retour anticipé : sinon
  // le basculement vers la capsule (my détecté après hydratation) saute
  // useHoteJobs et React crashe (error #300 « fewer hooks than expected »,
  // page « This page couldn't load » sur my.dataparl.fr).
  const my = useHoteMy() || chemin === "/capsule" || chemin.startsWith("/capsule/");
  const jobs = useHoteJobs() || chemin === "/jobs" || chemin.startsWith("/jobs/");
  if (my) return <CapsuleEntete />;
  return jobs ? <EnTeteJobs /> : <EnTeteSite maintenance={chemin === "/maintenance"} />;
}
