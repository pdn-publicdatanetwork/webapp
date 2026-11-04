import Explorer from "@/components/Explorer";
import Alertes from "@/components/Alertes";
import { offresPubliques } from "@/lib/firestore";
import { normaliser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const offres = (await offresPubliques()).map(normaliser);
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DataParl' Jobs",
    url: "https://jobs.dataparl.fr",
    description:
      "Toutes les offres de collaborateur parlementaire : Assemblée nationale, Sénat, Parlement européen.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: "https://jobs.dataparl.fr/?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <div className="space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonld) }} />
      <Explorer offres={offres} />
      <Alertes />
    </div>
  );
}
