// No-op volontaire : sans ce fichier, Next.js remonte au workspace root du
// monorepo (racine du repo webapp) et charge son instrumentation.ts, qui
// importe @sentry/nextjs — dépendance absente de jobs/package.json.
// L'instrumentation locale (la plus proche) a priorité.
export async function register() {
  // Rien à enregistrer côté serveur pour l'app Jobs.
}
