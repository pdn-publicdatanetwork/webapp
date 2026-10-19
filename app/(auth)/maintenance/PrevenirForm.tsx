"use client";
import { useState } from "react";

// Formulaire « Prévenez-moi du retour » de la page de maintenance.
// Un email de confirmation part immédiatement (double opt-in) : l'adresse
// n'est enregistrée qu'au clic sur le lien qu'il contient.
export default function PrevenirForm() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"attente" | "envoi" | "envoye">("attente");
  const [erreur, setErreur] = useState("");

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEtat("envoi");
    setErreur("");
    const r = await fetch("/api/maintenance/prevenir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setEtat("attente");
    if (!r || !r.ok) {
      const m = r ? (await r.json().catch(() => null))?.error : null;
      return setErreur(m ?? "Envoi impossible, réessaie dans quelques minutes.");
    }
    setEtat("envoye");
  }

  if (etat === "envoye") {
    return (
      <p className="ok" role="status">
        C&apos;est noté. Un email de confirmation vient de partir : clique sur son lien,
        et tu recevras un message dès que le site sera de retour.
      </p>
    );
  }

  return (
    <form onSubmit={envoyer}>
      <label htmlFor="prevenir-email">Ton adresse email</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          id="prevenir-email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="prenom@exemple.fr"
          style={{ flex: "1 1 220px" }}
        />
        <button type="submit" disabled={etat === "envoi"}>
          {etat === "envoi" ? "Envoi…" : "Me prévenir du retour"}
        </button>
      </div>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
    </form>
  );
}
