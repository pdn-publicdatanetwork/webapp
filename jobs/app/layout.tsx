import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Link from "next/link";
import Entete from "@/components/Entete";
import Suivi from "@/components/Suivi";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  metadataBase: new URL("https://jobs.dataparl.fr"),
  title: {
    default: "DataParl' Jobs : toutes les offres du Parlement",
    template: "%s | DataParl' Jobs",
  },
  description:
    "Toutes les offres de collaborateur parlementaire : Assemblée nationale, Sénat, Parlement européen. Collectées sur les sources officielles ou déposées par les élus. Gratuit, sans publicité.",
  applicationName: "DataParl' Jobs",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "DataParl' Jobs",
    type: "website",
    locale: "fr_FR",
    url: "/",
  },
  robots: { index: true, follow: true },
};

export default function RacineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-[#ECF1FC] text-slate-800 font-sans flex flex-col antialiased">
        <Script id="gtm-chargement" strategy="afterInteractive" src="https://www.googletagmanager.com/gtm.js?id=GTM-KPPBZ25Q" />
        <Script id="gtm-datalayer" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());`}</Script>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KPPBZ25Q"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Entete />
        <Suivi />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        <footer className="mt-16 bg-white border-t border-slate-200 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 DataParl&apos; Jobs, Les talents au service du Parlement. Tous droits réservés.</p>
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-medium">
              <a href="https://www.dataparl.fr" className="underline hover:text-[#4E2E53]">DataParl&apos;</a>
              <Link href="/contact" className="underline hover:text-[#4E2E53]">Contact</Link>
              <Link href="/informations-legales" className="underline hover:text-[#4E2E53]">Informations légales</Link>
              <Link href="/espace-recruteur" className="underline hover:text-[#4E2E53]">Espace recruteur</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
