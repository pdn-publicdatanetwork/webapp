import type { MetadataRoute } from "next";

// Les pages privées et les API restent hors index.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/espace-recruteur", "/mon-compte", "/admin", "/demo", "/api/", "/auth/"],
      },
    ],
    sitemap: "https://jobs.dataparl.fr/sitemap.xml",
  };
}
