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
];

const config: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/gouvernement", destination: "/gouv", permanent: true },
      { source: "/gouvernement/:chemin*", destination: "/gouv/:chemin*", permanent: true },
      { source: "/collabs", destination: "/collab", permanent: true },
      { source: "/collaborateurs", destination: "/collab", permanent: true },
      { source: "/collaborateur", destination: "/collab", permanent: true },
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
