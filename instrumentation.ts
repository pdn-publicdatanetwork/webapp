import * as Sentry from "@sentry/nextjs";

// Sentry : erreurs côté serveur (SSR, routes API, Server Actions).
export async function register() {
  // Côté serveur : DSN privé (SENTRY_DSN), jamais exposé au navigateur.
  if (process.env.NEXT_RUNTIME === "nodejs" && (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  }
}

// Capture les erreurs des Server Components et routes API Next 15+.
export const onRequestError = Sentry.captureRequestError;
