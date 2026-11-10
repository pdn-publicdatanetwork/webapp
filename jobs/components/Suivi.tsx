"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/authSupabase";
import { AUTH_FIREBASE_ACTIF, sessionFirebase } from "@/lib/sessionFirebase";

// Mesure d'audience : chaque page vue est notée, ainsi que les clics sur
// les éléments marqués data-stat (Contacter l'équipe, envoyer la
// candidature, Se connecter...). Pas d'IP, pas de cookie. Le compte du
// visiteur connecté est associé à ses visites (statistiques internes,
// voir Informations légales).

export default function Suivi() {
  const chemin = usePathname() ?? "/";
  const [compte, setCompte] = useState<string | null>(null);

  useEffect(() => {
    if (AUTH_FIREBASE_ACTIF) {
      sessionFirebase().then((s) => setCompte(s?.email ?? null));
      return;
    }
    auth.auth.getSession().then(({ data }) => setCompte(data.session?.user?.email ?? null));
    const { data: sub } = auth.auth.onAuthStateChange((_e, s) => setCompte(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetch("/api/stats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "page", chemin, ...(compte ? { compte } : {}) }),
    }).catch(() => {});
  }, [chemin, compte]);

  useEffect(() => {
    const envoyer = (e: MouseEvent) => {
      const cible = (e.target as HTMLElement | null)?.closest?.("[data-stat]");
      if (!cible) return;
      const stat = cible.getAttribute("data-stat");
      if (!stat) return;
      fetch("/api/stats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "clic", chemin: stat, page: window.location.pathname, ...(compte ? { compte } : {}) }),
      }).catch(() => {});
    };
    document.addEventListener("click", envoyer);
    return () => document.removeEventListener("click", envoyer);
  }, [compte]);

  return null;
}
