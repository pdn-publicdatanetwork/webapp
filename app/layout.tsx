import type { Metadata } from "next";
import { DM_Sans, Spectral } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import BandeauCookies from "./_components/BandeauCookies";
import TagsGoogle from "./_components/TagsGoogle";
import PageTrace from "./_components/PageTrace";
import JournalConnexion from "./_components/JournalConnexion";
import "./globals.css";

// Polices auto-hébergées par next/font : préchargées, avec une police de
// repli aux métriques ajustées : le texte n'est jamais reflowé au chargement
// (fin du décalage de mise en page mesuré par Lighthouse, CLS 0,27).
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-dm-sans", display: "swap" });
const spectral = Spectral({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-spectral", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.dataparl.fr"),
  title: { default: "DataParl' : le Parlement, pièce par pièce", template: "%s | DataParl'" },
  description:
    "Arrivées, départs et transferts des collaborateurs des députés, sénateurs et eurodéputés, d'après les publications officielles. Gratuit, sans pistage, publicité soumise à consentement.",
  applicationName: "DataParl'",
  openGraph: { siteName: "DataParl'", locale: "fr_FR", type: "website" },
  // Cartes de partage (X, LinkedIn, Bluesky, Facebook, messageries) : grande image par défaut.
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" } },
  formatDetection: { telephone: false },
  // Favicons : SVG vectoriel et icône tactile iOS 180 (app/apple-icon.tsx) : monogramme Σ'.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  // Application web sur l'écran d'accueil iOS : titre affiché sous l'icône.
  appleWebApp: { capable: true, statusBarStyle: "default", title: "DataParl'" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (

    <html lang="fr" className={`${dmSans.variable} ${spectral.variable}`} suppressHydrationWarning>
      <head>
        {/* Thème clair / sombre : classe .dark ou .light posée avant la
            première peinture, à partir du choix mémorisé, sinon du réglage
            système. Cohérent avec la bascule (app/_components/BasculeTheme.tsx)
            et les blocs html.dark / :root:not(.light) de globals.css.
            suppressHydrationWarning sur <html> : la classe peut différer entre
            serveur et client sans écart de rendu. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.classList.add(t)}else if(matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
        {/* Consent Mode v2 (Google) : tout refusé par défaut, AVANT tout script
            publicitaire. Le bandeau du site actualise ensuite ces signaux selon
            le choix du visiteur (lib/consentement.ts). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});`,
          }}
        />
        {/* Google Analytics 4 : PAS de gtag.js en direct. GA4 (G-GC1JD019GY)
            est déployé via une balise du conteneur GTM seul : fin de la double
            mesure (~450 Ko de scripts en moins au chargement). */}
        {/* Google AdSense (ca-pub-6168263680630864) : PAS chargé ici. Le script
            publicitaire n'est injecté qu'après un consentement publicitaire
            explicite (lib/consentement.ts, appelé par le bandeau) : jamais pour
            un visiteur qui n'a pas répondu ou a tout refusé, conformément à la
            promesse du bandeau. Cela allège aussi le chargement des pages
            (~220 Ko de scripts publicitaires évités par défaut). */}
        {/* Google Tag Manager (GTM-KW3MJMTK) : PLUS injecté ici. Il était chargé
            sur TOUTES les pages, y compris admin.dataparl.fr et
            webmail.dataparl.fr, où un tag du conteneur (message de consentement
            Google / Funding Choices) affichait la bulle « Paramètres concernant
            la confidentialité et les cookies ». Le conteneur est désormais
            chargé côté client par TagsGoogle, uniquement sur les espaces
            publics (lib/consentement.ts → espaceInterne). */}
      </head>
      <body>
        {children}
        <BandeauCookies />
        {/* Google Tag Manager : espaces publics uniquement (voir TagsGoogle). */}
        <TagsGoogle />
        {/* Vercel Analytics : pages vues sans cookie ni identificateur
            cross-site, cohérent avec la promesse « sans pistage ». */}
        <Analytics />
        {/* Vercel Speed Insights : mesure des performances web (Core Web Vitals). */}
        <SpeedInsights />
        {/* Parcours des comptes connectés (route seule, 90 jours, admin
            uniquement) : voir app/_components/PageTrace.tsx. */}
        <PageTrace />
        {/* Journal des connexions des comptes (IP, appareil) + association
            Clarity : voir app/_components/JournalConnexion.tsx. */}
        <JournalConnexion />
      </body>
    </html>
  );
}
