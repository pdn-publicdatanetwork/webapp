import type { NextConfig } from "next";

// DataParl' Jobs : application dédiée (projet Vercel séparé, Root Directory
// = jobs). Charte graphique 100% autonome, aucune dépendance au webapp www.

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cloudflare Workers : le SDK firebase-admin Node (gRPC + eval de modules externes
  // par le chargeur OpenNext) est remplacé par le shim REST dp-firebase-admin
  // (dep file:). L'alias ne s'active que quand la variable DEPLOY_CIBLE=cloudflare
  // est fournie par la CI (voir ci_secrets) : les builds Vercel et le typecheck
  // gardent le vrai SDK.
  ...(process.env.DEPLOY_CIBLE === "cloudflare"
    ? {
        turbopack: {
          resolveAlias: {
            "firebase-admin": "dp-firebase-admin",
            "firebase-admin/app": "dp-firebase-admin/app",
            "firebase-admin/auth": "dp-firebase-admin/auth",
            "firebase-admin/firestore": "dp-firebase-admin/firestore",
          },
        },
      }
    : {}),
};

export default nextConfig;
