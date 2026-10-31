"use client";
import { useEffect } from "react";
import { espaceInterne } from "@/lib/consentement";

// Google Tag Manager (GTM-KW3MJMTK), chargé uniquement sur les espaces
// publics (www.dataparl.fr, api, jobs, media…). Le conteneur n'est jamais
// injecté sur les espaces internes (admin.dataparl.fr, webmail.dataparl.fr).
// Le consentement est piloté par le bandeau maison (signaux Consent Mode v2
// posés dans app/layout.tsx puis actualisés dans lib/consentement.ts) :
// le message de consentement Google (Funding Choices, CMP ID 300), tag de
// ce conteneur, est superflu et doublonnait le bandeau maison en bas du
// site (« Paramètres concernant la confidentialité et les cookies »). On
// empêche donc son script (fundingchoicesmessages.google.com) de se
// charger, tout en gardant GTM, AdSense et Clarity.

function estScriptFC(n: Node): boolean {
  if (n.nodeName !== "SCRIPT") return false;
  const s = n as HTMLScriptElement;
  return /fundingchoices(messages)?\.google\.com/.test(s.src || s.getAttribute("src") || "");
}

// Une seule fois : intercepter l'insertion des scripts Funding Choices
// avant leur exécution. Les autres scripts passent normalement.
function bloquerFundingChoices() {
  const w = window as unknown as { __fcBloque?: boolean };
  if (typeof document === "undefined" || w.__fcBloque) return;
  w.__fcBloque = true;
  for (const h of [document.head, document.body]) {
    const ac = h.appendChild.bind(h);
    (h as unknown as { appendChild: (n: Node) => Node }).appendChild = (n: Node) => (estScriptFC(n) ? n : ac(n));
    const ib = h.insertBefore.bind(h);
    (h as unknown as { insertBefore: (n: Node, r: Node | null) => Node }).insertBefore = (n: Node, r: Node | null) => (estScriptFC(n) ? n : ib(n, r));
  }
}

export default function TagsGoogle() {
  useEffect(() => {
    if (espaceInterne()) return;
    bloquerFundingChoices();
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
