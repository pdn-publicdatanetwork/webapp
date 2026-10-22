"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHoteJobs } from "@/app/_components/useHoteJobs";

// Pied de page du site www : sur DataParl' Jobs (pages /jobs et sous-domaine
// jobs.dataparl.fr), le footer Jobs remplace le footer standard. L'hôte est
// détecté côté client (useHoteJobs : la réécriture du proxy est transparente
// pour usePathname) ; le chemin /jobs/… sert de repli.
export default function PiedDePageRoute() {
  const chemin = usePathname() ?? "";
  const jobs = useHoteJobs() || chemin === "/jobs" || chemin.startsWith("/jobs/");

  return (
    <footer className="site">
      <div className="wrap pied-une-ligne">
        {jobs ? (
          <>
            <span className="meta">© 2026 DataParl&apos; Jobs : le Parlement t&apos;attend.</span>
            <nav aria-label="Plan du site DataParl&apos; Jobs">
              <Link href="/sitemap">Plan du site</Link>
              <Link href="/informations-legales">Informations légales</Link>
              <Link href="/informations-legales/cgu-jobs">CGU DataParl&apos; Jobs</Link>
            </nav>
          </>
        ) : (
          <>
            <span className="meta">© 2026 DataParl&apos; : le Parlement, pièce par pièce.</span>
            <nav aria-label="Plan du site">
              <a href="https://status.dataparl.fr">Statut</a>
              <a href="/a-propos">À propos</a>
              <a href="/sitemap">Plan du site</a>
              <a href="/informations-legales">Informations légales</a>
            </nav>
          </>
        )}
      </div>
    </footer>
  );
}
