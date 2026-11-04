"use client";
import EspacePro from "@/components/EspacePro";

// Démonstration de l'espace recruteur : formulaire de dépôt d'offre prérempli
// avec de fausses données, aucune vérification de connexion, aucun envoi réel.

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="max-w-6xl mx-auto bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold px-4 py-3 rounded-2xl">
        🧪 Démonstration de l&apos;espace recruteur : dans la version réelle, la connexion avec une
        adresse parlementaire est obligatoire et l&apos;offre part en relecture après vérification
        anti-robot.
      </div>
      <EspacePro demo />
    </div>
  );
}
