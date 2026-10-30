// Associer ma fiche : la logique client vit dans Formulaire.tsx (aucun
// useSearchParams ici : le slug est lu en client dans un effet, ce qui ne
// bloque jamais le prérendu de la page).
import Formulaire from "./Formulaire";

export default function AssocierFiche() {
  return <Formulaire />;
}
