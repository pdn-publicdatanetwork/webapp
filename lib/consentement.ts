import { cookieStorage } from "./cookieStorage";
import { CLARITY_ID } from "./env";

// Consentement Google (Consent Mode v2), piloté par le bandeau du site —
// pas par une bannière Google. Les signaux sont envoyés à GTM et AdSense.
// Les valeurs par défaut (« denied ») sont définies dans app/layout.tsx,
// AVANT le chargement des scripts ; ce module ne fait qu'actualiser l'état.

export type Choix = { mesure: boolean; pub: boolean; date: string };
export const CLE_CONSENTEMENT = "dp_consentement_v1";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

// Espaces internes (admin.dataparl.fr, webmail.dataparl.fr, mail.dataparl.fr,
// ou chemins /admin et /webmail servis sur www) : aucune mesure, aucun
// consentement demandé. GTM, le bandeau et les scripts tiers ne chargent pas
// là — c'était le conteneur GTM qui affichait la bulle Google « Paramètres
// concernant la confidentialité et les cookies » (Funding Choices) sur
// l'admin et le webmail.
export function espaceInterne(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.startsWith("admin.") ||
    h.startsWith("webmail.") ||
    h.startsWith("mail.") ||
    window.location.pathname.startsWith("/admin") ||
    window.location.pathname.startsWith("/webmail")
  );
}

// Actualise les signaux Consent Mode v2 (et pousse un événement « consentement »,
// utilisable comme déclencheur dans GTM).
function maj(e: Record<string, "granted" | "denied">) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") window.gtag("consent", "update", e);
  else window.dataLayer?.push(["consent", "update", e]);
  window.dataLayer?.push({ event: "consentement", ...e });
}

// Applique un choix complet : mesure d'audience et publicité.
export function appliquer(c: Choix) {
  maj({
    analytics_storage: c.mesure ? "granted" : "denied",
    ad_storage: c.pub ? "granted" : "denied",
    ad_user_data: c.pub ? "granted" : "denied",
    ad_personalization: c.pub ? "granted" : "denied",
  });
}

// Charge le script Google AdSense (une seule fois), uniquement après un
// consentement publicitaire. Sans accord, le script n'est jamais injecté :
// c'est la promesse du bandeau (« rien n'est activé sans ton accord »),
// et ~220 Ko de scripts publicitaires en moins au chargement.
export function chargerPub() {
  if (typeof document === "undefined") return;
  if (document.getElementById("adsense-dataparl")) return;
  const s = document.createElement("script");
  s.id = "adsense-dataparl";
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6168263680630864";
  document.head.appendChild(s);
}

// Charge Microsoft Clarity (mesure comportementale : heatmaps, replays),
// une seule fois, uniquement après un consentement de mesure d'audience.
// Sans accord, le script n'est jamais injecté — même promesse que la pub.
// Clarity masque par défaut les zones de saisie dans les replays ; sans
// identifiant configuré (lib/env.ts), la fonction ne fait rien.
export function chargerClarity() {
  if (typeof document === "undefined" || !CLARITY_ID) return;
  if (document.getElementById("clarity-dataparl")) return;
  const s = document.createElement("script");
  s.id = "clarity-dataparl";
  s.type = "text/javascript";
  s.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`;
  document.head.appendChild(s);
}

// Choix mémorisé (null si le visiteur n'a jamais répondu).
export function lire(): Choix | null {
  if (typeof document === "undefined") return null;
  try {
    const brut = cookieStorage.getItem(CLE_CONSENTEMENT);
    if (!brut) return null;
    const j = JSON.parse(brut) as Partial<Choix>;
    if (typeof j.mesure !== "boolean" || typeof j.pub !== "boolean") return null;
    return { mesure: j.mesure, pub: j.pub, date: typeof j.date === "string" ? j.date : "" };
  } catch {
    return null;
  }
}

// Mémorise et applique un choix.
export function enregistrer(c: Choix) {
  if (typeof document === "undefined") return;
  cookieStorage.setItem(CLE_CONSENTEMENT, JSON.stringify(c));
  appliquer(c);
}
