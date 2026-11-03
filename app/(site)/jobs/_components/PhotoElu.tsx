"use client";

import { useState } from "react";

// Photo de l'élu depuis la médiathèque DataParl' (media.dataparl.fr), avec
// repli sur les initiales si l'image n'existe pas ou si le slug manque.

export default function PhotoElu({
  chambre,
  slug,
  prenom,
  nom,
  taille = 84,
}: {
  chambre: string | null;
  slug: string | null;
  prenom: string | null;
  nom: string | null;
  taille?: number;
}) {
  const [echec, setEchec] = useState(false);
  const initiales = ((prenom ?? "")[0] ?? "") + ((nom ?? "")[0] ?? "");

  if (!slug || echec || !["an", "senat", "pe"].includes(chambre ?? "")) {
    return (
      <div
        className="photo-vide"
        style={{ width: taille, height: taille, fontSize: taille / 3, borderRadius: 16 }}
        aria-hidden
      >
        {initiales.toUpperCase() || "?"}
      </div>
    );
  }
  return (
    <img
      className="photo"
      src={`https://media.dataparl.fr/${chambre}/${slug}.png`}
      alt={`Photo de ${[prenom, nom].filter(Boolean).join(" ")}`}
      width={taille}
      height={taille}
      onError={() => setEchec(true)}
      style={{ width: taille, height: taille }}
    />
  );
}
