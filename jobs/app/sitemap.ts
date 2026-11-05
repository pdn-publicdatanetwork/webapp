import type { MetadataRoute } from "next";
import { offresPubliques } from "@/lib/firestore";
import { slugOffre } from "@/lib/jobs";
import { normaliser } from "@/lib/types";

export const dynamic = "force-dynamic";

// Sitemap : pages statiques + toutes les offres publiées.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://jobs.dataparl.fr";
  const offres = await offresPubliques().catch(() => []);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: base + "/matching", changeFrequency: "weekly", priority: 0.8 },
    { url: base + "/proposer", changeFrequency: "weekly", priority: 0.5 },
    { url: base + "/old-jobs", changeFrequency: "weekly", priority: 0.4 },
    { url: base + "/connexion", priority: 0.2 },
    { url: base + "/contact", priority: 0.3 },
    { url: base + "/informations-legales", priority: 0.3 },
    ...offres.map((o) => {
      const offre = normaliser(o);
      return {
        url: base + "/offre/" + slugOffre(offre),
        lastModified: offre.publie_le ? new Date(offre.publie_le) : undefined,
        changeFrequency: "daily" as const,
        priority: 0.7,
      };
    }),
  ];
}
