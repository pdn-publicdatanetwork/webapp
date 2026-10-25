"use client";
import { useParams } from "next/navigation";
import { useRessource, dateHeure } from "@/app/_components/admin/utils";
import { lien } from "@/app/_components/admin/liens";
import CrmEditeur from "@/app/_components/admin/CrmEditeur";

type Compte = { email: string; created_at: string; last_sign_in_at: string | null; user_metadata: Record<string, string> } | null;
type Msg = { sujet: string; statut: string; created_at: string; repondu_at: string | null };
type Newsletter = { confirmed: boolean; unsubscribed_at: string | null }[];
type Alertes = { frequence: string; chambres: string[] | null; active: boolean }[];
type Survey = { repondu_le: string | null; note_experience: number | null; note_contenu: number | null; note_global: number | null; commentaire: string | null }[];
type Crm = { statut: string; tags: string[]; note: string | null; maj_le: string | null; maj_par: string | null } | null;

export default function FicheCrm() {
  const params = useParams<{ email: string }>();
  const email = decodeURIComponent(String(params.email)).trim().toLowerCase();
  const { data, err } = useRessource<{
    compte: Compte; contacts: Msg[]; newsletter: Newsletter; alertes: Alertes; survey: Survey; crm: Crm;
  }>("/api/admin/crm", { email });

  const compte = data?.compte ?? null;
  const m = compte?.user_metadata ?? {};
  const reponse = (data?.survey ?? []).find((s) => s.repondu_le);
  const activeAlertes = (data?.alertes ?? []).filter((a) => a.active);

  return (
    <>
      <h1 style={{ wordBreak: "break-all" }}>{email}</h1>
      <p><a href={lien("admin", "/crm")}>&larr; Retour au CRM</a></p>
      {err && <p className="erreur">{err}</p>}

      {compte ? (
        <div className="carte-admin">
          <header><strong>Compte</strong></header>
          <p style={{ margin: "6px 0" }}>{m.prenom ?? m.full_name ?? m.name ?? ""}</p>
          <p className="meta" style={{ margin: 0 }}>Créé le {dateHeure(compte.created_at)} · Dernière connexion {dateHeure(compte.last_sign_in_at)}</p>
        </div>
      ) : (
        <div className="carte-admin"><p className="meta" style={{ margin: 0 }}>Pas de compte dataparl.fr — relation par e-mail uniquement.</p></div>
      )}

      {data && (
        <CrmEditeur
          email={email}
          statut={String(data.crm?.statut ?? "nouveau")}
          tags={data.crm?.tags ?? []}
          note={String(data.crm?.note ?? "")}
          majLe={data.crm ? dateHeure(data.crm.maj_le) + (data.crm.maj_par ? " par " + data.crm.maj_par : "") : null}
        />
      )}

      <h2>Messages contact ({data?.contacts.length ?? 0})</h2>
      <div className="defile">
        <table className="stats">
          <thead><tr><th>Sujet</th><th>Statut</th><th>Reçu le</th><th>Répondu le</th></tr></thead>
          <tbody>
            {(data?.contacts ?? []).map((c, i) => (
              <tr key={i}>
                <td>{c.sujet}</td>
                <td>{c.statut}</td>
                <td>{dateHeure(c.created_at)}</td>
                <td>{c.repondu_at ? dateHeure(c.repondu_at) : <strong className="erreur">à répondre</strong>}</td>
              </tr>
            ))}
            {!data?.contacts.length && <tr><td colSpan={4} className="meta">Aucun message</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Enquête</h2>
      {reponse ? (
        <div className="carte-admin">
          <p style={{ margin: "0 0 6px" }}>Répondue le {dateHeure(reponse.repondu_le)}</p>
          <p style={{ margin: "0 0 6px" }}>
            Expérience {reponse.note_experience ?? "–"}/5 · Contenu {reponse.note_contenu ?? "–"}/5 · Global <strong>{reponse.note_global ?? "–"}/5</strong>
          </p>
          {reponse.commentaire && <blockquote style={{ margin: "6px 0 0", borderLeft: "3px solid var(--line)", paddingLeft: 12, whiteSpace: "pre-wrap" }}>{reponse.commentaire}</blockquote>}
        </div>
      ) : (
        <p className="meta">{data?.survey.length ? data.survey.length + " invitation(s), pas encore répondue(s)" : "Pas encore invitée"}</p>
      )}

      <h2>Abonnements</h2>
      <p style={{ margin: "6px 0" }}>
        Newsletter :{" "}
        {data?.newsletter.length
          ? data.newsletter.map((n) => n.unsubscribed_at ? "désinscrit" : (n.confirmed ? "abonné (confirmé)" : "abonné (non confirmé)")).join(", ")
          : "non"}
      </p>
      <p style={{ margin: "6px 0" }}>
        Alertes :{" "}
        {activeAlertes.length
          ? activeAlertes.map((a, i) => (
              <span key={i} className="puce" style={{ marginLeft: i ? 6 : 0 }}>
                {a.frequence}{a.chambres?.length ? " (" + a.chambres.join(", ") + ")" : ""}
              </span>
            ))
          : "aucune"}
      </p>
    </>
  );
}
