"use client";

import { useEffect } from "react";
import { sessionActuelle } from "@/lib/supabaseBrowser";

// Journalise chaque nouvelle session connectée (POST /api/journal-connexion :
// IP, appareil, user-agent — consultable dans la fiche admin du compte) et
// associe le compte à Microsoft Clarity (tag dp_user_id + identify) pour
// retrouver ses replays. Clarity n'est chargé qu'après consentement de mesure
// d'audience : l'association est retentée une fois, sinon silencieusement
// ignorée. Le journal ne s'écrit qu'une fois par onglet et par compte.

export default function JournalConnexion() {
  useEffect(() => {
    (async () => {
      try {
        const s = await sessionActuelle();
        if (!s?.user?.id) return;
        const vu = sessionStorage.getItem("dp_connexion_journalisee");
        if (vu === s.user.id) return;
        sessionStorage.setItem("dp_connexion_journalisee", s.user.id);
        await fetch("/api/journal-connexion", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
          body: "{}",
        });

        const associerClarity = (): boolean => {
          if (typeof window.clarity !== "function") return false;
          try {
            window.clarity("identify", s.user!.id, undefined, undefined, s.user!.email ?? undefined);
            window.clarity("set", "dp_user_id", s.user!.id);
          } catch { /* silencieux */ }
          return true;
        };
        if (!associerClarity()) setTimeout(associerClarity, 3000);
      } catch {
        // silencieux : la journalisation ne doit jamais casser la page
      }
    })();
  }, []);

  return null;
}