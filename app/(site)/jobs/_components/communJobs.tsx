// Éléments partagés entre ListeOffres, la modal d'offre et la page de
// détail : type de données d'une offre en liste et pastille de provenance.

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

// Pastille de provenance, avec le niveau de confiance en info-bulle.
export function PastilleProvenance({ connector, avecLibelle }: { connector: string; avecLibelle?: boolean }) {
  const parElu = connector === "proposition";
  if (!parElu && !avecLibelle) return null;
  return (
    <span
      className={parElu ? "pastille-source deposee" : "pastille-source collectee"}
      title={parElu ? "Publiée directement par l'équipe de l'élu" : "Collectée automatiquement et relue"}
    >
      {parElu ? "★ Offre déposée par l'élu" : "Collectée"}
    </span>
  );
}
