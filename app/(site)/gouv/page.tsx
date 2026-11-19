import { redirect } from "next/navigation";
import { mandatsEtCabinets } from "@/lib/gouvernement";
import { slugGouvernement } from "@/lib/gouvernementTypes";

// Fraîcheur horaire : le balayage JORF du matin (cron ~07:10 UTC) apparaît
// sur le site dans la journée (avant : 24 h).
export const revalidate = 3600;

export const metadata = {
  title: "Annuaire du gouvernement et des conseillers ministériels",
  description: "L'annuaire du gouvernement et des cabinets ministériels : composition, directeurs, chefs de cabinet et conseillers, d'après le Journal officiel.",
};

// /gouv ouvre directement le gouvernement en exercice ; l'historique
// complet (tous les gouvernements, recherche transversale) est sur /gouv/explorer.
export default async function Gouvernement() {
  let slug: string | null = null;
  try {
    const { mandats } = await mandatsEtCabinets();
    let nom = "";
    let debut = "";
    for (const m of mandats) {
      if (m.gouvernement && m.debut > debut) { debut = m.debut; nom = m.gouvernement; }
    }
    slug = nom ? slugGouvernement(nom) : null;
  } catch {
    slug = null;
  }
  redirect(slug ? "/gouv/" + slug : "/gouv/explorer");
}
