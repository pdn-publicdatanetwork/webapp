import type { Offre } from "./firestore";

// Offre typée côté client : les documents Firestore sont des records
// libres, cette forme fixe le contrat passé aux composants.

// Insights factuels de l'élu recruteur, générés une fois par la pipeline
// GitLab (open data de l'Assemblée nationale et du Sénat) puis rafraîchis.
// Des faits publics bruts pour préparer sa candidature : aucune interprétation,
// aucun rapprochement idéologique.
export type InsightsVote = {
  date: string | null;
  numero?: string | null;
  titre?: string | null;
  position: string;
  url?: string | null;
};

export type InsightsQuestion = {
  date: string | null;
  intitule: string | null;
  reponse_le?: string | null;
  statut?: string | null;
  url?: string | null;
};

export type InsightsElu = {
  chambre: string;
  genere_le: string | null;
  source: string | null;
  votes: {
    scrutins: number;
    participation: number | null;
    conformite: number | null;
    depuis: string | null;
    derniers: InsightsVote[];
  } | null;
  questions_gouvernement: InsightsQuestion[];
  questions_ecrites: InsightsQuestion[];
};

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
  insights: InsightsElu | null;
};

// Chambres : les sources collectées peuvent écrire « Sénat » ou « europarl » ;
// on force les valeurs canoniques attendues par les filtres et libellés du site.
const CHAMBRES_CANONIQUES: Record<string, string> = {
  "Sénat": "senat",
  senat: "senat",
  "Assemblée nationale": "an",
  an: "an",
  europarl: "pe",
  "Parlement européen": "pe",
  pe: "pe",
};

export function normaliser(o: Offre): OffreListe {
  return {
    id: String(o.id ?? ""),
    titre: String(o.titre ?? ""),
    description: String(o.description ?? ""),
    chambre: CHAMBRES_CANONIQUES[String(o.chambre ?? "")] ?? ((o.chambre as string) ?? null),
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
    insights: (o.insights as InsightsElu) ?? null,
  };
}
