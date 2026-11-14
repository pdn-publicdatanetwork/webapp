import { cookieStorage } from "./cookieStorage";
import { CLARITY_ID, GA4_ID } from "./env";

// Consentement Google (Consent Mode v2), piloté par le mur d'accès du site
// (app/_components/MurAcces.tsx) : pas par une bannière Google. Les signaux
// sont envoyés à GTM et AdSense. Les valeurs par défaut (« denied ») sont
// définies dans app/layout.tsx, AVANT le chargement des scripts ; ce module
// ne fait qu'actualiser l'état.

export type Choix = { mesure: boolean; pub: boolean; date: string };
export const CLE_CONSENTEMENT = "dp_consentement_v1";

// Mur d'accès (13/11/2026) : le mur n'est affiché qu'une fois par visiteur.
// Sans choix enregistré, la publicité reste contextuelle (annonces limitées
// Google : sans cookie publicitaire), qui ne requiert aucun consentement.
export const CLE_MUR = "dp_mur_vu_v1";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

// Espaces internes (admin.dataparl.fr, webmail.dataparl.fr, mail.dataparl.fr,
// ou chemins /admin et /webmail servis sur www) : aucune mesure, aucun
// consentement demandé. GTM, le mur et les scripts tiers ne chargent pas
// là : c'était le conteneur GTM qui affichait la bulle Google « Paramètres
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

// Applique un choix : mesure d'audience et publicité.
// Publicité contextuelle uniquement (décision du 13/11/2026) : les signaux
// publicitaires restent TOUJOURS refusés, quel que soit le choix. AdSense
// sert alors des annonces limitées (contextuelles : sans cookie publicitaire,
// sans profil) : la promesse « sans pistage » tient même pour les visiteurs
// qui acceptent la publicité.
export function appliquer(c: Choix) {
  maj({
    analytics_storage: c.mesure ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

// Charte publicitaire : le script AdSense ne se charge que sur les pages de
// fiches (collaborateur, élu) et les sections éditoriales (sénatoriales,
// VigiParl’, MixiParl’, groupes). Toutes les autres pages (accueil, contact,
// mon-compte, informations légales, à propos, sitemap, alertes, jobs, media,
// espace API, recherche, connexion…) ne chargent jamais le
// script : aucune annonce, même automatique, ne peut s'y afficher. Les
// espaces internes (admin, webmail) sont déjà exclus par espaceInterne().
export function pagePubAutorisee(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  // Sections éditoriales autorisées : sénatoriale, VigiParl’, MixiParl’, groupes.
  return (
    p.startsWith("/collab/") ||
    p.startsWith("/parlementaires/") ||
    p.startsWith("/senatoriales2026") ||
    p.startsWith("/vigiparl") ||
    p.startsWith("/mixiparl") ||
    p.startsWith("/groupe")
  );
}

// La publicité est-elle acceptée ? Sans choix enregistré : oui, la publicité
// contextuelle ne stocke rien sur l'appareil, aucun consentement n'est requis
// (annonces limitées Google). Un visiteur qui avait explicitement tout refusé
// via l'ancien bandeau (pub: false) garde son refus.
export function pubAutorisee(): boolean {
  const c = lire();
  return c ? c.pub : true;
}

// Charge le script Google AdSense (une seule fois), uniquement sur les pages
// de la liste blanche, et sauf refus explicite. Trois cas :
// - « Continuer gratuitement » (mur) : publicité acceptée ;
// - pas de choix (« Continuer sans choisir ») : publicité contextuelle par
//   défaut, sans cookie ;
// - refus explicite (ancien bandeau, pub: false) : le script ne charge pas.
// Les signaux publicitaires restent « denied » (appliquer) : AdSense sert des
// annonces limitées, sans stockage sur l'appareil.
export function chargerPub() {
  if (typeof document === "undefined") return;
  if (!pagePubAutorisee()) return;
  if (!pubAutorisee()) return;
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
// Sans accord, le script n'est jamais injecté : même promesse que la pub.
// Clarity masque par défaut les zones de saisie dans les replays ; sans
// identifiant configuré (lib/env.ts), la fonction ne fait rien.
// Le chargeur officiel est un script inline (filet de file d'attente) : on
// l'évite pour ne pas dépendre de « unsafe-inline » dans la CSP (R15). La
// file d'attente est posée ici en JS ordinaire — non concernée par la CSP,
// qui ne restreint que le chargement de scripts — puis le script officiel
// (https://www.clarity.ms/tag/<id>, déjà en liste blanche dans la CSP) la
// remplace au chargement.
export function chargerClarity() {
  if (typeof document === "undefined" || !CLARITY_ID) return;
  if (document.getElementById("clarity-dataparl")) return;
  const w = window as unknown as { clarity?: (...args: unknown[]) => void };
  if (typeof w.clarity !== "function") {
    const file: unknown[][] = [];
    w.clarity = (...args: unknown[]) => file.push(args);
  }
  const s = document.createElement("script");
  s.id = "clarity-dataparl";
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
  document.head.appendChild(s);
}

// Charge Google Analytics 4 en direct (gtag.js), une seule fois, uniquement
// après un consentement de mesure d'audience : même promesse que la pub et
// Clarity. Contexte : la balise GA4 (G-GC1JD019GY) a disparu du conteneur
// GTM (GTM-KW3MJMTK) le 31/10/2026, lors du retrait du message Funding
// Choices ; la propriété ne recevait plus aucune donnée (0 utilisateur
// remonté toute la semaine). Si la balise GA4 revient dans le conteneur
// GTM, retirer les appels à chargerGA4() pour éviter la double mesure :
// GA4 ne dédoublonne pas deux sources vers une même propriété.
// Le script vit sur www.googletagmanager.com (déjà en liste blanche dans la
// CSP, script-src) et les hits partent vers *.google-analytics.com
// (connect-src). Les signaux Consent Mode v2 posés par le layout s'appliquent
// : le stockage suit le choix du visiteur, l'appel se fait après appliquer().
export function chargerGA4() {
  if (typeof document === "undefined" || !GA4_ID) return;
  if (document.getElementById("ga4-dataparl")) return;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  // La fonction gtag du layout (app/layout.tsx) empile dans dataLayer ; le
  // repli couvre le cas improbable où elle manquerait.
  const gtag = typeof w.gtag === "function" ? w.gtag : (...args: unknown[]) => w.dataLayer?.push(args);
  gtag("js", new Date());
  gtag("config", GA4_ID);
  const s = document.createElement("script");
  s.id = "ga4-dataparl";
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
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

// Mur d'accès : déjà présenté à ce visiteur ? Le marqueur suit le même cookie
// .dataparl.fr que la session (cookieStorage, 30 jours) : le mur ne revient
// pas à chaque page.
export function murDejaVu(): boolean {
  if (typeof document === "undefined") return true;
  return cookieStorage.getItem(CLE_MUR) === "1";
}

export function marquerMurVu() {
  if (typeof document === "undefined") return;
  cookieStorage.setItem(CLE_MUR, "1");
}
