"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHoteJobs } from "@/app/_components/useHoteJobs";

// Pied de page du site www : sur DataParl' Jobs (pages /jobs et sous-domaine
// jobs.dataparl.fr), le footer Jobs remplace le footer standard. L'hôte est
// détecté côté client (useHoteJobs : la réécriture du proxy est transparente
// pour usePathname) ; le chemin /jobs/… sert de repli.
// Sur le module Jobs, l'équivalent du « Follow Life at Google on » de Google
// Careers : les réseaux officiels de DataParl' (mêmes URL que les mails
// Daily et la page À propos). Pas de réseaux des élus : la base parlementaires
// n'en contient pas, la fiche officielle de l'élu reste la porte d'entrée.

const RESEAUX = [
  { href: "https://x.com/DataParl_fr", nom: "X", logo: "https://www.dataparl.fr/media/logos/x.png" },
  { href: "https://bsky.app/profile/dataparl.fr", nom: "Bluesky", logo: "https://www.dataparl.fr/media/logos/bluesky.png" },
  { href: "https://t.me/dataparl_daily", nom: "Telegram", logo: "https://www.dataparl.fr/media/logos/telegram.png" },
];

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
            <nav aria-label="Suivre DataParl&apos;" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="meta">Suivre DataParl&apos; sur :</span>
              {RESEAUX.map((r) => (
                <a key={r.href} href={r.href} target="_blank" rel="noopener noreferrer" title={"DataParl' sur " + r.nom}>
                  <img src={r.logo} alt={"DataParl' sur " + r.nom} width={16} height={16} style={{ verticalAlign: "middle", display: "inline-block" }} />
                </a>
              ))}
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
