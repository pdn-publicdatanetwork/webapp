"use client";
import { useEffect, useRef, useState } from "react";

// Widget Turnstile (Cloudflare). La clé publique vient de /api/turnstile/cle :
// si Turnstile n'est pas configuré, le widget ne s'affiche pas et onIndisponible
// est appelé pour que le formulaire reste utilisable (repli sans friction).

type OptionsTurnstile = {
  sitekey: string;
  callback: (jeton: string) => void;
  "expired-callback": () => void;
  theme?: string;
};

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: OptionsTurnstile) => string };
  }
}

export default function Turnstile({
  onToken,
  onIndisponible,
}: {
  onToken: (jeton: string) => void;
  onIndisponible?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [cle, setCle] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch("/api/turnstile/cle")
      .then((r) => r.json())
      .then((j) => {
        if (!vivant) return;
        const c = typeof j?.cle === "string" && j.cle ? j.cle : "";
        setCle(c);
        if (!c) onIndisponible?.();
      })
      .catch(() => {
        if (vivant) {
          setCle("");
          onIndisponible?.();
        }
      });
    return () => {
      vivant = false;
    };
  }, []);

  useEffect(() => {
    if (cle === null || !cle || !ref.current) return;
    const dessiner = () => {
      if (!ref.current || !window.turnstile) return;
      window.turnstile.render(ref.current, {
        sitekey: cle,
        callback: (jeton: string) => onToken(jeton),
        "expired-callback": () => onToken(""),
        theme: "light",
      });
    };
    if (window.turnstile) {
      dessiner();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = dessiner;
    document.head.appendChild(s);
  }, [cle]);

  if (cle === null || !cle) return null;
  return <div ref={ref} />;
}
