"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sessionActuelle } from "@/lib/supabaseBrowser";

// Trace minimal du parcours des COMPTES CONNECTÉS, pour l'amélioration du
// site : route seule (jamais les paramètres d'URL, donc jamais d'identifiant
// dans l'adresse), conservation 90 jours (purge côté serveur), accès réservé
// aux administrateurs (module Journal). Les visiteurs anonymes ne sont pas
// tracés ici : l'audience agrégée est déjà mesurée par Vercel Analytics.
// Dédoublonnage : une même route consécutive n'est comptée qu'une fois
// (les allers-retours rapides ne polluent pas le parcours).
// L'origine enregistrée : page précédente interne, ou referer externe
// (Google, X, un lien entrant…) sur le premier chargement de la page.

let precedent: string | null = null;

export default function PageTrace() {
  const pathname = usePathname();
  const dernier = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === dernier.current) return;
    dernier.current = pathname;
    const origine = precedent ?? (document.referrer || null);
    precedent = pathname;
    (async () => {
      try {
        const s = await sessionActuelle();
        if (!s) return; // visiteur anonyme : rien à tracer
        await fetch("/api/pages-vues", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
          body: JSON.stringify({ chemin: pathname.slice(0, 300), origine: origine ? String(origine).slice(0, 300) : null }),
        });
      } catch {
        // silencieux : le traçage ne doit jamais casser la navigation
      }
    })();
  }, [pathname]);

  return null;
}