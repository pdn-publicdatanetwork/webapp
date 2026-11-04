"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Mesure d'audience minimale : chaque page vue est notée, ainsi que les
// clics sur les éléments marqués data-stat (Contacter l'équipe, envoyer
// la candidature, Se connecter...). Aucune donnée personnelle n'est
// collectée : pas d'IP, pas d'identifiant, pas de cookies.

export default function Suivi() {
  const chemin = usePathname() ?? "/";

  useEffect(() => {
    fetch("/api/stats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "page", chemin }),
    }).catch(() => {});
  }, [chemin]);

  useEffect(() => {
    const envoyer = (e: MouseEvent) => {
      const cible = (e.target as HTMLElement | null)?.closest?.("[data-stat]");
      if (!cible) return;
      const stat = cible.getAttribute("data-stat");
      if (!stat) return;
      fetch("/api/stats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "clic", chemin: stat }),
      }).catch(() => {});
    };
    document.addEventListener("click", envoyer);
    return () => document.removeEventListener("click", envoyer);
  }, []);

  return null;
}
