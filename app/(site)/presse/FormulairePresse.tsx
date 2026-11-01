"use client";
import { useState } from "react";

// Demande presse : nom, média, email. Arrive dans la boîte presse@dataparl.fr.
export default function FormulairePresse() {
  const [etat, setEtat] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");
  const [retour, setRetour] = useState("");

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setEtat("envoi");
    const message = [`Média : ${f.media}`, f.demande ? `\n${f.demande}` : "\nDemande d'accès presse."].join("\n");
    const r = await fetch("/api/contact", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom: f.prenom, nom: f.nom, email: f.email, sujet: "presse", message, site: f.site }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setEtat(r?.ok ? "ok" : "erreur");
    setRetour(r?.ok ? "Merci, votre demande est bien arrivée. Nous vous répondons par email." : (d.error ?? "Envoi impossible, réessayez plus tard."));
  }

  if (etat === "ok") return <p className="ok">{retour}</p>;
  return (
    <form onSubmit={envoyer} className="card" style={{ maxWidth: 640 }}>
      <div className="grille-2">
        <div><label htmlFor="p-prenom">Prénom</label><input type="text" id="p-prenom" name="prenom" required maxLength={80} autoComplete="given-name" /></div>
        <div><label htmlFor="p-nom">Nom</label><input type="text" id="p-nom" name="nom" required maxLength={80} autoComplete="family-name" /></div>
      </div>
      <label htmlFor="p-media">Média</label>
      <input type="text" id="p-media" name="media" required maxLength={120} placeholder="Rédaction, émission, newsletter…" autoComplete="organization" />
      <label htmlFor="p-email">Email professionnel</label>
      <input id="p-email" name="email" type="email" required maxLength={254} autoComplete="email" />
      <label htmlFor="p-demande">Votre demande <span className="meta">(facultatif)</span></label>
      <textarea id="p-demande" name="demande" rows={4} maxLength={4000} placeholder="Données, chiffres, accès rédaction, échange par écrit…" />
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      {etat === "erreur" && <p className="erreur">{retour}</p>}
      <button disabled={etat === "envoi"}>{etat === "envoi" ? "Envoi…" : "Écrire à presse@dataparl.fr"}</button>
    </form>
  );
}
