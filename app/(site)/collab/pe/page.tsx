import type { Metadata } from "next";
import HubChambre from "../HubChambre";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Liste des collaborateurs du Parlement européen",
  description: "La liste des collaborateurs parlementaires du Parlement européen : la liste complète en poste avec l'élu employeur, les fiches par parti et par groupe, et les angles uniques que sont les tiers payants, prestataires et réseau.",
  alternates: { canonical: "/collab/pe" },
};

export default function Page() {
  return <HubChambre chambre="europarl" />;
}
