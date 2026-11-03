import Matching from "@/components/Matching";
import { offresPubliques } from "@/lib/firestore";
import { normaliser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const offres = (await offresPubliques()).map(normaliser);
  return <Matching offres={offres} />;
}
