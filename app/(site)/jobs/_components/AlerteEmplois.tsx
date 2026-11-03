"use client";

import { useState } from "react";

// Inscription aux alertes e-mail : chaque nouvelle offre validée est envoyée
// aux abonnés par la collecte GitLab (script alerte-nouvelles-offres, Resend).

export default function AlerteEmplois() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"attente" | "envoi" | "ok" | "erreur">("attente");

  async function inscrire(e: React.FormEvent) {
    e.preventDefault();
    setEtat("envoi");
    try {
      const r = await fetch("/api/jobs/alerte", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setEtat(r.ok ? "ok" : "erreur");
    } catch {
      setEtat("erreur");
    }
  }

  if (etat === "ok")
    return (
      <div id="alerte" className="card" style={{ margin: "18px 0 0", borderRadius: 16 }}>
        <p style={{ margin: 0 }}>
          <strong>C'est noté</strong>
          <br />
          <span className="meta">Vous recevrez un e-mail dès qu'une nouvelle offre est publiée.</span>
        </p>
      </div>
    );

  return (
    <form
      id="alerte"
      onSubmit={inscrire}
      style={{
        margin: "18px 0 0",
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 10px rgba(7,26,65,0.06)",
      }}
    >
      <p style={{ margin: 0, flex: "1 1 260px" }}>
        <strong>🔔 Alertes e-mail</strong>
        <br />
        <span className="meta">Recevez les nouvelles offres dès leur publication, désinscription en un clic.</span>
      </p>
      {etat === "erreur" && (
        <p style={{ margin: 0, color: "#b3261e", fontSize: "0.85rem", flex: "1 1 100%" }}>
          L'inscription a échoué, vérifiez l'adresse saisie puis réessayez.
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flex: "1 1 300px" }}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom.nom@example.fr"
          style={{ flex: 1, minWidth: 0, border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px" }}
        />
        <button className="btn" type="submit" disabled={etat === "envoi"}>
          {etat === "envoi" ? "Envoi…" : "Me prévenir"}
        </button>
      </div>
    </form>
  );
}
