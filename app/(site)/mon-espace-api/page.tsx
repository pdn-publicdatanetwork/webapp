import type { Metadata } from "next";
import GestionCles from "@/app/(apisite)/espace-api/GestionCles";

export const metadata: Metadata = { title: "Mon espace API", robots: { index: false, follow: false } };

// Rubrique API du centre de compte my.dataparl.fr : la gestion de clé de
// l'espace API, servie dans la charte du site public (même en-tête et même
// pied de page que le centre de compte), sans renvoi vers www/mon-compte
// puisque le visiteur y est déjà.

export default function MonEspaceApi() {
  return (
    <div className="etroit">
      <h1>Mon espace <span className="surligne">API</span></h1>
      <GestionCles />
    </div>
  );
}
