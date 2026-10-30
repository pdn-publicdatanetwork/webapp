import { CHAMBRE, TYPE, dateLongue, idParlementaire, nomAffiche, prenomNom, type MouvementAffiche } from "@/lib/format";

// Une ligne de mouvement (pastille + libellé, style accueil) : collaborateur
// en gras (lien), élu + groupe en texte secondaire, chambre + date en meta.
// Partagé entre la page d'accueil et les pages chambres (/an, /senat, /pe).
export default function LigneMouvement({ m }: { m: MouvementAffiche }) {
  const lienElu = (nom: string, cle: string, id: string) => (
    <a className="elu" href={"/parlementaires/" + encodeURIComponent(idParlementaire(m.chambre, id, cle, nom))}>{nomAffiche(nom)}</a>
  );
  const qui = prenomNom(m.collab_prenom, m.collab_nom);
  const collab = m.collab_cle ? (
    <a className="collab" href={"/collab/k/" + encodeURIComponent(m.collab_cle)}>{qui}</a>
  ) : (
    <strong className="collab">{qui}</strong>
  );
  const groupe = m.elu_groupe ? <span className="groupe"> ({m.elu_groupe})</span> : null;
  const elu = <>{lienElu(m.elu_nom, m.elu_cle, m.elu_id)}{groupe}</>;
  return (
    <li className="mouvement">
      <div className={"mouvement-type " + m.type}>
        <span className="dot" /> {TYPE[m.type]}
      </div>
      <div className="mouvement-content">
        <p className="mouvement-main">
          {m.type === "arrivee" && <>{collab} rejoint l&apos;équipe de {elu}</>}
          {m.type === "depart" && <>{collab} quitte l&apos;équipe de {elu}</>}
          {m.type === "transfert" && <>{collab} passe de l&apos;équipe de {nomAffiche(m.elu_origine_nom)} à celle de {elu}</>}
        </p>
        <p className="mouvement-meta">{CHAMBRE[m.chambre]}, {dateLongue(m.date_event)}{m.fonction ? ", " + m.fonction : ""}</p>
      </div>
    </li>
  );
}
