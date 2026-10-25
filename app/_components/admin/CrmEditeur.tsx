"use client";
import { useState } from "react";
import { useAdmin } from "./Porte";

const STATUTS = ["nouveau", "a_contacter", "en_cours", "repondu", "vip", "archive"] as const;

// Éditeur du suivi CRM d'une personne : statut, tags, note. Persiste via
// POST /api/admin/crm (module crm), journalisé dans admin_audit.
export default function CrmEditeur({ email, statut, tags, note, majLe }: {
  email: string;
  statut: string;
  tags: string[];
  note: string;
  majLe: string | null;
}) {
  const { api } = useAdmin();
  const [s, setS] = useState(statut);
  const [t, setT] = useState(tags.join(", "));
  const [n, setN] = useState(note);
  const [etat, setEtat] = useState<"repos" | "envoi" | "ok" | "erreur">("repos");
  const [message, setMessage] = useState("");

  async function enregistrer() {
    setEtat("envoi");
    setMessage("");
    try {
      await api("/api/admin/crm", {
        method: "POST",
        body: { email, statut: s, tags: t.split(",").map((x) => x.trim()).filter(Boolean), note: n },
      });
      setEtat("ok");
      setMessage("Enregistré — rechargement…");
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setEtat("erreur");
      setMessage((e as Error).message);
    }
  }

  return (
    <div className="carte-admin">
      <header>
        <strong>Suivi CRM</strong>
        {majLe && <span className="meta">(maj : {majLe})</span>}
      </header>
      <div className="actions" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>Statut</label>
        <select value={s} onChange={(e) => setS(e.target.value)} aria-label="Statut" style={{ width: "auto" }}>
          {STATUTS.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <label style={{ margin: 0 }}>Tags (virgules)</label>
        <input type="text" value={t} onChange={(e) => setT(e.target.value)} placeholder="journaliste, sénat, vip…" style={{ width: "auto", flex: 1, minWidth: 200 }} />
      </div>
      <textarea value={n} onChange={(e) => setN(e.target.value)} rows={3} placeholder="Note libre sur la relation…" style={{ minHeight: 80 }} />
      <div className="actions">
        <button onClick={enregistrer} disabled={etat === "envoi"}>
          {etat === "envoi" ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && <span className={etat === "ok" ? "ok" : "erreur"} style={{ fontSize: ".9rem" }}>{message}</span>}
      </div>
    </div>
  );
}
