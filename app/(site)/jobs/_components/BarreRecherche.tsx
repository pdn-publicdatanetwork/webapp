"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Barre de recherche centrale du hero : saisie instantanée, bouton Effacer,
// validation qui pousse l'URL (?q=…) pour piloter la liste et rester
// partageable.
export default function BarreRecherche() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const chercher = (e: React.FormEvent) => {
    e.preventDefault();
    const propre = q.trim();
    router.push(propre ? "/jobs?q=" + encodeURIComponent(propre) : "/jobs");
  };

  const effacer = () => {
    setQ("");
    router.push("/jobs");
  };

  return (
    <form action="/jobs" method="get" className="jobs-recherche" role="search" onSubmit={chercher}>
      <span className="loupe" aria-hidden="true">🔍</span>
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un poste, un élu, une compétence (ex : communication, loi, Paris)…"
        aria-label="Rechercher une offre"
      />
      {q && (
        <button type="button" className="effacer" onClick={effacer}>Effacer</button>
      )}
      <button className="btn" type="submit" style={{ marginTop: 0 }}>Rechercher</button>
    </form>
  );
}
