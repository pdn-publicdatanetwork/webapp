"use client";
// Widget Cloudflare Turnstile pour le formulaire de contact (DataForm').
// La sitekey est publique (NEXT_PUBLIC_TURNSTILE_SITEKEY) ; la secret key ne
// vit que côté serveur (lib/turnstile.ts). Si la sitekey n'est pas configurée,
// le widget ne s'affiche pas et l'envoi reste possible : c'est le serveur qui
// décide (repli sans friction, même logique que /connexion).
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY;

// Les jetons Turnstile sont à usage unique : après un échec d'envoi, la page
// appelle reinitialiserTurnstile() pour obtenir un jeton neuf.
export function reinitialiserTurnstile() {
  window.turnstile?.reset();
}

export default function Turnstile({ jetonRecu }: { jetonRecu: (jeton: string | null) => void }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    if (!SITEKEY) return;
    if (window.turnstile) {
      setPret(true);
      return;
    }
    let s = document.querySelector<HTMLScriptElement>('script[data-turnstile="1"]');
    if (!s) {
      s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.dataset.turnstile = "1";
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => setPret(true), { once: true });
  }, []);

  useEffect(() => {
    if (!pret || !window.turnstile || !conteneur.current || idWidget.current) return;
    idWidget.current = window.turnstile.render(conteneur.current, {
      sitekey: SITEKEY,
      callback: (jeton: string) => jetonRecu(jeton),
      "expired-callback": () => jetonRecu(null),
      "error-callback": () => {
        jetonRecu(null);
        return true;
      },
    });
    return () => {
      if (idWidget.current !== null) window.turnstile?.remove(idWidget.current);
      idWidget.current = null;
      jetonRecu(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret]);

  if (!SITEKEY) return null;
  return <div ref={conteneur} className="df-turnstile" />;
}
