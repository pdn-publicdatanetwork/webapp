// No-op volontaire : shadow de instrumentation-client.ts du webapp (racine
// du monorepo), qui importe @sentry/nextjs — absent de jobs/package.json.
export function onRequestError() {
  // Rien à faire côté navigateur pour l'app Jobs.
}
