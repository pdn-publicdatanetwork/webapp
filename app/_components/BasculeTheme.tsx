"use client";

import { useEffect, useState } from "react";

// Bascule clair / sombre. Sans choix explicite, le réglage système
// (prefers-color-scheme) s'applique via les variables CSS et le script
// inline de app/layout.tsx, qui pose .dark avant la première peinture quand
// le système est sombre : aucun flash de mauvais thème au chargement. Un clic
// pose un choix explicite mémorisé dans localStorage (« dark » ou « light »),
// traduit par les classes .dark / .light sur <html>, qui priment sur le
// réglage système (globals.css : blocs html.dark et :root:not(.light)).
export default function BasculeTheme() {
  const [sombre, setSombre] = useState<boolean | null>(null);

  useEffect(() => {
    const doc = document.documentElement;
    // État effectif au chargement : .dark (choix sombre, ou système sombre
    // sans choix explicite), sinon clair.
    setSombre(doc.classList.contains("dark"));
    // Sans choix explicite, suivre le système en direct.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const suivre = (e: MediaQueryListEvent) => {
      let explicite: string | null = null;
      try { explicite = localStorage.getItem("theme"); } catch {}
      if (explicite) return;
      doc.classList.toggle("dark", e.matches);
      doc.classList.toggle("light", !e.matches);
      setSombre(e.matches);
    };
    mq.addEventListener("change", suivre);
    return () => mq.removeEventListener("change", suivre);
  }, []);

  function basculer() {
    const doc = document.documentElement;
    const apres = !doc.classList.contains("dark");
    doc.classList.toggle("dark", apres);
    doc.classList.toggle("light", !apres);
    try { localStorage.setItem("theme", apres ? "dark" : "light"); } catch {}
    setSombre(apres);
  }

  return (
    <button
      type="button"
      className="bascule-theme"
      onClick={basculer}
      aria-label={sombre ? "Passer en thème clair" : "Passer en thème sombre"}
      title={sombre ? "Thème clair" : "Thème sombre"}
    >
      {sombre ? "☀" : "☾"}
    </button>
  );
}
