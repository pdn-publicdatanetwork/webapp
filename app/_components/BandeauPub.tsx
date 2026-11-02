"use client";
import { useEffect, useRef, useState } from "react";
import { ADSENSE_CLIENT, ADSENSE_SLOT } from "@/lib/env";
import { chargerPub, espaceInterne, lire } from "@/lib/consentement";

// Bandeau publicitaire AdSense en bas d'écran : fixe, refermable d'un clic
// (fermeture mémorisée pour la session). Il ne s'affiche que si le visiteur
// a consenti à la publicité (lib/consentement) et jamais dans les espaces
// internes (admin, webmail). La vérification au focus permet au bandeau
// d'apparaître juste après un accord donné au bandeau de cookies, sans
// rechargement. Une fois le palier « sans pub » livré, le compte abonné
// court-circuitera ce bandeau côté serveur.
//
// Ligne blanche (retour utilisateur) : AdSense ne remplit pas toujours
// l'emplacement. Avant, le bandeau blanc et la place réservée de 108 px
// s'affichaient même à vide : ligne blanche en bas d'écran (très visible
// en thème sombre) et marge sous le pied de page. Désormais, l'attribut
// data-ad-status de la balise <ins>, posé par le script AdSense à
// « filled » ou « unfilled », est observé : le fond blanc, la bordure,
// le bouton de fermeture et la place réservée n'apparaissent que si une
// annonce est réellement servie.

const CLE_FERMETURE = "dp_pub_bandeau_ferme";

export default function BandeauPub() {
  const [visible, setVisible] = useState(false);
  // Annonce réellement servie par AdSense (data-ad-status="filled").
  const [rempli, setRempli] = useState(false);
  const pousse = useRef(false);

  useEffect(() => {
    const verifier = () => {
      if (espaceInterne() || !lire()?.pub) return;
      try { if (sessionStorage.getItem(CLE_FERMETURE)) return; } catch { /* session indisponible : afficher */ }
      chargerPub();
      setVisible(true);
    };
    verifier();
    window.addEventListener("focus", verifier);
    return () => window.removeEventListener("focus", verifier);
  }, []);

  useEffect(() => {
    if (!visible || !ADSENSE_SLOT || pousse.current) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle ?? [];
      w.adsbygoogle.push({});
      pousse.current = true;
    } catch { /* le script peut charger après : AdSense repousse seul */ }
  }, [visible]);

  // Observe data-ad-status sur la balise <ins> : AdSense le pose à
  // « filled » (annonce servie) ou « unfilled » (emplacement vide).
  // Le bandeau ne devient visible que sur « filled ».
  useEffect(() => {
    if (!visible) return;
    const ins = document.querySelector("ins.adsbygoogle");
    if (!ins) return;
    const maj = () => setRempli(ins.getAttribute("data-ad-status") === "filled");
    maj();
    const obs = new MutationObserver(maj);
    obs.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => obs.disconnect();
  }, [visible]);

  if (!visible || !ADSENSE_SLOT) return null;
  return (
    <>
      {/* Place réservée sous le contenu : uniquement si une annonce est servie. */}
      {rempli && <div style={{ height: 108 }} aria-hidden="true" />}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
          background: rempli ? "#fff" : "transparent",
          borderTop: rempli ? "1px solid #e6e6e6" : "none",
          padding: "8px 44px 8px 8px",
        }}
      >
        <div style={{ maxWidth: 970, margin: "0 auto" }}>
          <ins
            className="adsbygoogle"
            style={{ display: "block", maxHeight: 90 }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={ADSENSE_SLOT}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
        </div>
        {rempli && (
          <button
            aria-label="Fermer la publicité"
            onClick={() => {
              try { sessionStorage.setItem(CLE_FERMETURE, "1"); } catch { /* tant pis pour cette session */ }
              setVisible(false);
            }}
            style={{
              position: "absolute", right: 4, top: "50%",
              transform: "translateY(-50%)",
              width: 32, height: 32, lineHeight: 1,
              border: "none", borderRadius: 6, background: "transparent",
              fontSize: 20, color: "#666", cursor: "pointer",
            }}
          >
            ×
          </button>
        )}
      </div>
    </>
  );
}
