"use client";
import { useEffect, useState } from "react";

// Détection du sous-domaine my.dataparl.fr (capsule « Mon espace »), côté
// client : même principe que useHoteJobs — la réécriture du proxy est
// transparente pour usePathname, l'hôte est donc lu après hydratation, sans
// faire basculer le rendu serveur en dynamique.
export function useHoteMy(): boolean {
  const [hoteMy, setHoteMy] = useState(false);
  useEffect(() => {
    setHoteMy(window.location.hostname === "my.dataparl.fr");
  }, []);
  return hoteMy;
}

// Chemins de l'espace personnel (capsule et pages de compte) : sur ces
// pages, les modules du site public (chat, crayon, invitation à l'enquête)
// ne doivent pas apparaître — la capsule est un outil privé.
export function cheminEspace(chemin: string): boolean {
  return chemin === "/capsule" || chemin.startsWith("/capsule/") ||
    chemin === "/mon-compte" || chemin.startsWith("/mon-compte/") ||
    chemin === "/mon-espace-api" || chemin.startsWith("/mon-espace-api/");
}
