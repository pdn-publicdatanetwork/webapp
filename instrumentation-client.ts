import * as Sentry from "@sentry/nextjs";

// Sentry : erreurs côté navigateur.
// DSN fourni via la variable d'environnement Vercel NEXT_PUBLIC_SENTRY_DSN.
// Silencieux si absent (dev local / déploiement sans Sentry).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10 % des sessions suivies (perfs), quota libre
    // Ne jamais envoyer les données personnelles des visiteurs dans l'URL :
    sendDefaultPii: false,
  });
}

// Instrumentation des navigations App Router (exigé par le SDK v10).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
