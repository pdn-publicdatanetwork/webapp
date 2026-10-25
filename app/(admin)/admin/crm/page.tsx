"use client";
import { useRessource, dateHeure } from "@/app/_components/admin/utils";
import { lien } from "@/app/_components/admin/liens";

type Personne = {
  email: string; prenom: string; compte: boolean;
  dernierLogin: string | null; creationCompte: string | null;
  nContacts: number; contactsSansReponse: number; dernierContact: string | null;
  newsletter: boolean; alertes: number; surveyRepondu: boolean;
  noteGlobale: number | null; presse: boolean; statut: string | null;
};

const P = (on: boolean, texte: string) => on ? <span className="puce">{texte}</span> : null;

export default function Crm() {
  const { data, err } = useRessource<{ personnes: Personne[] }>("/api/admin/crm");
  const liste = data?.personnes ?? [];
  const cartes = [
    { label: "Personnes", n: liste.length },
    { label: "Avec compte", n: liste.filter((x) => x.compte).length },
    { label: "Contacts à répondre", n: liste.filter((x) => x.contactsSansReponse > 0).length },
    { label: "Enquêtes répondues", n: liste.filter((x) => x.surveyRepondu).length },
    { label: "Suivis CRM", n: liste.filter((x) => x.statut).length },
  ];

  return (
    <>
      <h1>CRM</h1>
      <p className="lead">Vue 360° par e-mail : comptes, contacts, newsletter, alertes, enquête et suivi.</p>
      {err && <p className="erreur">{err}</p>}
      <div className="chiffres" style={{ marginTop: 20 }}>
        {cartes.map((c) => (
          <div key={c.label}><strong>{c.n}</strong><span>{c.label}</span></div>
        ))}
      </div>
      <div className="defile">
        <table className="stats">
          <thead><tr><th>E-mail</th><th>Prénom</th><th>Segments</th><th>Suivi</th><th>Dernière activité</th></tr></thead>
          <tbody>
            {liste.map((x) => {
              const activite = x.dernierLogin ?? x.dernierContact ?? x.creationCompte;
              return (
                <tr key={x.email}>
                  <td><a href={lien("admin", "/crm/" + encodeURIComponent(x.email))}>{x.email}</a></td>
                  <td>{x.prenom || "–"}</td>
                  <td>
                    {P(x.compte, "Compte")}
                    {P(x.newsletter, "Newsletter")}
                    {P(x.alertes > 0, "Alertes (" + x.alertes + ")")}
                    {P(x.nContacts > 0, "Contact (" + x.nContacts + ")")}
                    {P(x.surveyRepondu, "Enquête " + (x.noteGlobale ?? "") + "/5")}
                    {P(x.presse, "Presse")}
                  </td>
                  <td>{x.statut ?? "–"}</td>
                  <td>{activite ? dateHeure(activite) : "–"}</td>
                </tr>
              );
            })}
            {!liste.length && <tr><td colSpan={5} className="meta">Aucune personne pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
