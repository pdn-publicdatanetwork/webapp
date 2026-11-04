import { redirect } from "next/navigation";

// L'ancien chemin de démonstration renvoie vers /demo/espace-recruteur.

export default function Page() {
  redirect("/demo/espace-recruteur");
}
