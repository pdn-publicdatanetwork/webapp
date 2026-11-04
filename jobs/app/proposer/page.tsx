import { redirect } from "next/navigation";

// L'ancien espace de dépôt vit désormais sur /espace-recruteur
// (connexion obligatoire, adresse parlementaire vérifiée).

export default function Page() {
  redirect("/espace-recruteur");
}
