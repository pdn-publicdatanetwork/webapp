import Photo from "./Photo";
import { BadgeChambre, BadgeParti } from "./Badges";
import { prenomNom } from "@/lib/format";
import { hrefDepartement, hrefGroupe, sansGroupe } from "@/lib/collectifs";
import { slugDepartement } from "@/lib/senatorialesClassement";
import type { EluCollectif } from "@/lib/collectifsData";

// Grille d'élus des pages collectives (groupe, département, parti) : photo,
// lien fiche + biographie, et liens croisés vers le groupe et le département
// : chaque page renvoie vers les autres.

export const CHAMBRE_LONG: Record<string, string> = {
  assemblee: "Assemblée nationale", senat: "Sénat", europarl: "Parlement européen",
};

export default function ListeElus({ elus, afficher }: { elus: EluCollectif[]; afficher: "groupe" | "departement" | "parti" }) {
  if (!elus.length) return <p className="meta">Aucun élu actif enregistré pour l&apos;instant.</p>;
  return (
    <div className="grille-senateurs">
      {elus.map((e) => {
        const nom = prenomNom(e.prenom, e.nom);
        const dep = e.departement || e.circonscription;
        return (
          <div className="carte-elu" key={`${e.chambre}-${e.personne_id}`}>
            <Photo chambre={e.chambre as "senat"} slug={e.slug} src={e.photo_url} nom={nom} taille={64} />
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>
                <a href={`/parlementaires/${encodeURIComponent(e.slug)}`}>{nom}</a>
              </p>
              <div className="badges-elu">
                <BadgeChambre chambre={e.chambre} />
                {!sansGroupe(e.groupe) && <BadgeParti sigle={e.groupe} />}
              </div>
              {dep && e.chambre !== "europarl" && <p className="meta" style={{ margin: "2px 0" }}>{dep}</p>}
              {afficher !== "groupe" && e.groupe && !["", "Aucun"].includes(e.groupe) && (
                <p className="meta" style={{ margin: 0 }}>
                  <a href={hrefGroupe(e.chambre, e.groupe) ?? "#"}>Fiche groupe {e.groupe}</a>
                </p>
              )}
              {afficher !== "departement" && dep && e.chambre !== "europarl" && (
                <p className="meta" style={{ margin: 0 }}>
                  <a href={hrefDepartement(dep, slugDepartement) ?? "#"}>Fiche élus de {dep}</a>
                </p>
              )}
              <p className="meta" style={{ margin: 0 }}>
                <a href={`/parlementaires/${encodeURIComponent(e.slug)}/bio`}>Biographie</a>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
