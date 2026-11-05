import type { MetadataRoute } from "next";

// Les pages privées et les API restent hors index. L'API publique des
// offres (llms.txt, llms-full.txt, assistants IA) fait exception :
// l'entrée Allow la plus longue l'emporte sur Disallow: /api/ pour les
// crawlers qui respectent les règles de précédence (Google, Bing, GPTBot,
// ClaudeBot, PerplexityBot...).

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/offres"],
        disallow: ["/espace-recruteur", "/mon-compte", "/admin", "/demo", "/api/", "/auth/"],
      },
    ],
    sitemap: "https://jobs.dataparl.fr/sitemap.xml",
  };
}
