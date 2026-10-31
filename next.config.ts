import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const securityHeaders = [
  // HSTS : force HTTPS pendant 1 an, sous-domaines inclus.
  // "preload" volontairement omis pour l'instant (engageant, lent à annuler) :
  // à activer après validation sur hstspreload.org.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  // CSP en mode effectif (audit ANSSI R14/R19, 31/10/2026) : la phase
  // Report-Only a servi de transition ; les violations sont désormais
  // collectées par /api/csp-rapport (visible dans les logs Vercel).
  // 'unsafe-inline' reste nécessaire pour les chargeurs GTM/Clarity/AdSense ;
  // retrait prévu avec les nonces middleware (étape 3).
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms https://pagead2.googlesyndication.com https://*.google.com https://vercel.live https://cdn.applixir.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.google-analytics.com https://*.analytics.google.com https://*.clarity.ms https://vercel.live https://cdn.applixir.com https://*.applixir.com; frame-src https://googleads.g.doubleclick.net https://vercel.live https://cdn.applixir.com https://*.applixir.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /api/csp-rapport" },
];

const config: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/gouvernement", destination: "/gouv", permanent: true },
      { source: "/gouvernement/:chemin*", destination: "/gouv/:chemin*", permanent: true },
      { source: "/collabs", destination: "/collab", permanent: true },
      { source: "/collaborateur", destination: "/collab", permanent: true },
      { source: "/collaborateurs", destination: "/collab", permanent: true },
      { source: "/equipes", destination: "/collab", permanent: true },
      { source: "/espace-presse", destination: "/presse", permanent: true },
      { source: "/espace-presse/:chemin*", destination: "/presse/:chemin*", permanent: true },
      { source: "/vigiparl/methodologie", destination: "/vigiparl/methode", permanent: true },
      { source: "/mixiparl/methodologie", destination: "/mixiparl/methode", permanent: true },
      { source: "/parlementaires/:id/PAhistory", destination: "/parlementaires/:id/historique", permanent: true },
      { source: "/sheets/vigiparl/annual-chart", destination: "/sheets/vigiparl-annual-chart", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Sentry : build instrumenté. Sans DSN dans l'environnement, l'init reste
// silencieuse côté runtime (voir instrumentation.ts) — pas besoin de désactiver ici.
export default withSentryConfig(config, { silent: true });
