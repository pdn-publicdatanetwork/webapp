import Explorer from "@/components/Explorer";
import Alertes from "@/components/Alertes";
import { offresPubliques } from "@/lib/firestore";
import { normaliser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const offres = (await offresPubliques()).map(normaliser);
  return (
    <div className="space-y-8">
      <Explorer offres={offres} />
      <Alertes />
    </div>
  );
}
