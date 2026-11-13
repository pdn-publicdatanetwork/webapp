"use client";

// Erreur racine : par défaut Next montre « This page couldn't load » sans
// dire pourquoi. Sur la capsule my.dataparl.fr (chrome client spécifique),
// cette page affiche la vraie cause (message + digest + pile) pour pouvoir
// diagnostiquer, en attendant une correction définitive.
export default function ErreurGlobale({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pile = error.stack ? error.stack.split("\n").slice(0, 8).join("\n") : "";
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", background: "#f7f7f4", color: "#071a41", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: 640, width: "100%" }}>
          <h1 style={{ fontSize: "1.6rem", margin: "0 0 8px" }}>Cette page n&apos;a pas pu se charger</h1>
          <p style={{ color: "#5c5c5c", margin: "0 0 20px" }}>
            Détails de l&apos;erreur (à transmettre à l&apos;équipe pour correction) :
          </p>
          <pre style={{ background: "#071a41", color: "#ffd23f", padding: "16px", borderRadius: "10px", fontSize: ".8rem", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {error.message}
            {error.digest ? "\ndigest : " + error.digest : ""}
            {pile ? "\n\n" + pile : ""}
          </pre>
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button onClick={() => reset()} style={{ background: "#071a41", color: "#fff", border: 0, borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontWeight: 600 }}>Réessayer</button>
            <a href="/" style={{ display: "inline-flex", alignItems: "center", color: "#071a41", textDecoration: "none", border: "1px solid #d9d9d2", borderRadius: "8px", padding: "10px 18px", fontWeight: 600 }}>Retour à l&apos;accueil</a>
          </div>
        </div>
      </body>
    </html>
  );
}