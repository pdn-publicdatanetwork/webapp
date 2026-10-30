"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sessionActuelle } from "@/lib/supabaseBrowser";

// Trace minimal du parcours des COMPTES CONNECTÉS, pour l'amélioration du
// site : route seule (jamais les paramètres d'URL, donc jamais d'identifiant
// dans l'adresse), conservation 90 jours (purge côté serveur), accès réservé
// aux administrateurs (module Journal).
// Les visiteurs SANS compte sont aussi tracés (vues_anonymes : uuid local
// localStorage, jamais associé à un compte), décision de l'éditeur du
// 22/10/2026 : traçage actif pour tous, sans condition de consentement.
// Dédoublonnage : une même route consécutive n'est comptée qu'une fois
// (les allers-retours rapides ne polluent pas le parcours).
// L'origine enregistrée : page précédente interne, ou referer externe
// (Google, X, un lien entrant…) sur le premier chargement de la page.

let precedent: string | null = null;

function visiteurAnonyme(): string {
  try {
    let v = localStorage.getItem("dp_visiteur");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("dp_visiteur", v);
    }
    return v;
  } catch {
    return "inconnu-" + String(Date.now());
  }
}

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
        const corps = JSON.stringify({
          chemin: pathname.slice(0, 300),
          origine: origine ? String(origine).slice(0, 300) : null,
        });
        if (s) {
          // compte connecté : parcours nominatif
          await fetch("/api/pages-vues", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
            body: corps,
          });
        } else {
          // visiteur sans compte : parcours pseudonymisé (uuid local)
          await fetch("/api/vues-anonymes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...JSON.parse(corps), visiteur: visiteurAnonyme() }),
          });
        }
      } catch {
        // silencieux : le traçage ne doit jamais casser la navigation
      }
    })();
  }, [pathname]);

  return null;
}