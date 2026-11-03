import type { Offre } from "./firestore";

// Offre typée côté client : les documents Firestore sont des records
// libres, cette forme fixe le contrat passé aux composants.

export type OffreListe = {
  id: string;
  titre: string;
  description: string;
  chambre: string | null;
  departement: string | null;
  elu_prenom: string | null;
  elu_nom: string | null;
  groupe_politique: string | null;
  type_poste: string | null;
  localisation: string | null;
  parlementaire_slug: string | null;
  publie_le: string | null;
  expire_le: string | null;
  source_connector: string;
};

export function normaliser(o: Offre): OffreListe {
  return {
    id: String(o.id ?? ""),
    titre: String(o.titre ?? ""),
    description: String(o.description ?? ""),
    chambre: (o.chambre as string) ?? null,
    departement: (o.departement as string) ?? null,
    elu_prenom: (o.elu_prenom as string) ?? null,
    elu_nom: (o.elu_nom as string) ?? null,
    groupe_politique: (o.groupe_politique as string) ?? null,
    type_poste: (o.type_poste as string) ?? null,
    localisation: (o.localisation as string) ?? null,
    parlementaire_slug: (o.parlementaire_slug as string) ?? null,
    publie_le: (o.publie_le as string) ?? null,
    expire_le: (o.expire_le as string) ?? null,
    source_connector: String(o.source_connector ?? "collecte"),
  };
}
