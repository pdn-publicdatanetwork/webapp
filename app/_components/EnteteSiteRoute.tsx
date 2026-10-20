"use client";
import { usePathname } from "next/navigation";
import { EnTeteSite } from "./SiteChrome";
import EnTeteJobs from "../(site)/jobs/_components/EnTeteJobs";
import { useHoteJobs } from "./useHoteJobs";

// En-tête du site www : l'en-tête Jobs (logo + menu du module) remplace
// l'en-tête standard sur DataParl' Jobs. La réécriture du proxy étant
// transparente (usePathname voit l'URL publique), l'hôte jobs.dataparl.fr
// est détecté côté client (useHoteJobs) ; le chemin /jobs/… sert de repli
// pour les environnements de test.
export default function EnteteSiteRoute() {
  const chemin = usePathname() ?? "";
  const jobs = useHoteJobs() || chemin === "/jobs" || chemin.startsWith("/jobs/");
  return jobs ? <EnTeteJobs /> : <EnTeteSite maintenance={chemin === "/maintenance"} />;
}
