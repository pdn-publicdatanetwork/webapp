"use client";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";

type Reponse = {
  id: string; email: string; user_id: string | null;
  note_experience: number | null; note_contenu: number | null; note_global: number | null;
  commentaire: string | null; cree_le: string; repondu_le: string | null;
};

const NOTE = (n: number | null) => (n === null ? "–" : `${n}/5`);

// Enquête utilisateurs (forms.dataparl.fr/avis) : qui a répondu, quand, et les
// notes. Les invitations ouvertes mais non répondues sont visibles aussi.
export default function EnqueteAdmin() {
  const { data, err } = useRessource<{ reponses: Reponse[] }>("/api/admin/content/survey");
  if (err) return <p className="erreur">{err}</p>;
  if (!data) return <p className="meta">Chargement…</p>;

  const repondues = data.reponses.filter((r) => r.repondu_le);
  const attente = data.reponses.filter((r) => !r.repondu_le);
  const moyenne = (f: (r: Reponse) => number | null) => {
    const v = repondues.map(f).filter((x): x is number => x !== null);
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "–";
  };

  return (
    <>
      <h1>Enquête <span className="surligne">utilisateurs</span></h1>
      <p className="meta">
        Questionnaire forms.dataparl.fr/avis, proposé sur le site après 4 minutes à un visiteur connecté.
        Réponses liées au compte ; une invitation non répondue apparaît aussi.
      </p>
      <div className="chiffres">
        <div className="principal"><strong>{repondues.length}</strong><span>réponses complètes</span></div>
        <div><strong>{attente.length}</strong><span>invitations sans réponse</span></div>
        <div><strong>{moyenne((r) => r.note_experience)}</strong><span>note moyenne expérience</span></div>
        <div><strong>{moyenne((r) => r.note_contenu)}</strong><span>note moyenne contenu</span></div>
        <div><strong>{moyenne((r) => r.note_global)}</strong><span>note globale moyenne</span></div>
      </div>
      {data.reponses.length === 0 && <p className="meta">Aucune invitation encore ouverte.</p>}
      {data.reponses.length > 0 && (
        <div className="defile">
          <table className="stats">
            <thead>
              <tr><th>Date</th><th>Compte (email)</th><th>Expérience</th><th>Contenu</th><th>Global</th><th>Commentaire</th><th>État</th><th></th></tr>
            </thead>
            <tbody>
              {data.reponses.map((r) => (
                <tr key={r.id}>
                  <td>{dateHeure(r.repondu_le ?? r.cree_le)}</td>
                  <td>{r.email}</td>
                  <td className="num">{NOTE(r.note_experience)}</td>
                  <td className="num">{NOTE(r.note_contenu)}</td>
                  <td className="num">{NOTE(r.note_global)}</td>
                  <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.commentaire ?? ""}>{r.commentaire ?? "–"}</td>
                  <td>{r.repondu_le ? "répondue" : "en attente"}</td>
                  <td><a href={`/admin/content/survey/${r.id}`}>Ouvrir</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
