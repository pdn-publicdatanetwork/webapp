"use client";
import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_SLOT } from "@/lib/env";

// Bloc publicitaire Google AdSense. Ne rend rien (aucun espace réservé) tant
// que le bloc d'annonces n'est pas créé dans la console AdSense : renseigner
// NEXT_PUBLIC_ADSENSE_SLOT (identifiant numérique du bloc, ex. 1234567890)
// dans les variables d'environnement Vercel. Le script adsbygoogle.js n'est
// chargé que sur les pages autorisées par la charte publicitaire
// (pagePubAutorisee dans lib/consentement.ts).
//
// Garde-fous de la charte : format verrouillé (rectangle par défaut, jamais
// « auto »), label « Publicité » toujours affiché au-dessus de l'annonce pour
// qu'elle ne puisse jamais être prise pour une fonctionnalité du site,
// hauteur minimale réservée pour éviter tout décalage de mise en page.

export default function PubGoogle({ slot, format = "rectangle" }: { slot?: string; format?: "rectangle" | "horizontal" }) {
  const identifiant = slot ?? ADSENSE_SLOT;
  const pousse = useRef(false);
  useEffect(() => {
    if (!identifiant || pousse.current) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle ?? [];
      w.adsbygoogle.push({});
      pousse.current = true;
    } catch { /* le script peut charger après : AdSense repousse seul */ }
  }, [identifiant]);
  if (!identifiant) return null;
  return (
    <aside role="complementary" aria-label="Publicité" style={{ margin: "28px 0" }}>
      <p className="meta" style={{ margin: "0 0 6px", fontSize: 11 }}>Publicité</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: 90 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={identifiant}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
