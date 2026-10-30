import { CHAMBRE, TYPE, dateLongue, idParlementaire, nomAffiche, prenomNom, type MouvementAffiche } from "@/lib/format";

// Phrase d'un mouvement, avec liens vers la fiche du collaborateur et de l'élu.
function Phrase({ m }: { m: MouvementAffiche }) {
  const lienElu = (nom: string, cle: string, id: string) => (
    <a href={`/parlementaires/${encodeURIComponent(idParlementaire(m.chambre, id, cle, nom))}`}>{nomAffiche(nom)}</a>
  );
  const qui = prenomNom(m.collab_prenom, m.collab_nom);
  const collab = m.collab_cle ? <a href={`/collab/k/${encodeURIComponent(m.collab_cle)}`}>{qui}</a> : <>{qui}</>;
  const groupe = m.elu_groupe ? ` (${m.elu_groupe})` : "";
  const elu = <>{lienElu(m.elu_nom, m.elu_cle, m.elu_id)}{groupe}</>;
  if (m.type === "arrivee") return <>{collab} rejoint l&apos;équipe de {elu}</>;
  if (m.type === "depart") return <>{collab} quitte l&apos;équipe de {elu}</>;
  return <>{collab} passe de l&apos;équipe de {nomAffiche(m.elu_origine_nom)} à celle de {elu}</>;
}

export default function ListeMouvements({ mouvements }: { mouvements: MouvementAffiche[] }) {
  return (
    <ul className="mouvements">
      {mouvements.map((m) => (
        <li key={m.id}>
          <span className={`badge ${m.type}`}>{TYPE[m.type]}</span>
          <div>
            <Phrase m={m} />
            <div className="meta">
              {CHAMBRE[m.chambre]}, {dateLongue(m.date_event)}
              {m.fonction ? `, ${m.fonction}` : ""}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
