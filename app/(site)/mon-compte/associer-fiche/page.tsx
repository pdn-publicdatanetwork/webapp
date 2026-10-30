import { Suspense } from "react";

// Associer ma fiche : trouver sa fiche (via le lien « C'est votre fiche ? »
// depuis la fiche publique, ou en collant le slug), demander le code, puis
// envoyer l'e-mail prérempli depuis son adresse professionnelle. Le statut
// se rafraîchit automatiquement. Aucun détail des contrôles serveur ici :
// l'utilisateur ne sait jamais quel contrôle tranche. useSearchParams impose
// une boundary Suspense pour le prérendu.

import Formulaire from "./Formulaire";

export default function AssocierFiche() {
  return (
    <Suspense fallback={<p className="meta">Chargement…</p>}>
      <Formulaire />
    </Suspense>
  );
}
