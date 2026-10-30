"use client";
import { useEffect } from "react";
import { espaceInterne } from "@/lib/consentement";

// Google Tag Manager (GTM-KW3MJMTK), chargé uniquement sur les espaces
// publics (www.dataparl.fr, api, jobs, media…). Le conteneur était avant
// injecté dans le <head> de app/layout.tsx sur TOUTES les pages, y compris
// admin.dataparl.fr et webmail.dataparl.fr : c'est un tag de ce conteneur
// (message de consentement Google / Funding Choices, CMP ID 300) qui
// affichait la bulle « Paramètres concernant la confidentialité et les
// cookies » sur ces espaces internes. Chargé côté client au montage, il
// n'est donc plus ni chargé ni exécuté sur ces pages.
export default function TagsGoogle() {
  useEffect(() => {
    if (espaceInterne()) return;
    if (document.getElementById("gtm-dataparl")) return;
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    const s = document.createElement("script");
    s.id = "gtm-dataparl";
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtm.js?id=GTM-KW3MJMTK";
    document.head.appendChild(s);
  }, []);
  return null;
}
