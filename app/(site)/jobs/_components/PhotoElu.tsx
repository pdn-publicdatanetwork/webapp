"use client";

import { useState } from "react";

// Photo de l'élu, lue depuis sa fiche DataParl' (champ photo_url de la base
// parlementaires : photos officielles AN / Sénat). Repli sur les initiales si
// l'image est indisponible. L'URL est résolue côté serveur par la page détail.

export default function PhotoElu({
  src,
  prenom,
  nom,
  taille = 84,
}: {
  src: string | null;
  prenom: string | null;
  nom: string | null;
  taille?: number;
}) {
  const [echec, setEchec] = useState(false);
  const initiales = ((prenom ?? "")[0] ?? "") + ((nom ?? "")[0] ?? "");

  if (!src || echec) {
    return (
      <div
        aria-hidden
        style={{
          width: taille,
          height: taille,
          fontSize: taille / 3,
          borderRadius: 16,
          background: "var(--bg)",
          border: "1px solid var(--line)",
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {initiales.toUpperCase() || "?"}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={"Photo de " + [prenom, nom].filter(Boolean).join(" ")}
      width={taille}
      height={taille}
      loading="lazy"
      onError={() => setEchec(true)}
      style={{ width: taille, height: taille, borderRadius: 16, objectFit: "cover", flexShrink: 0, border: "1px solid var(--line)" }}
    />
  );
}
