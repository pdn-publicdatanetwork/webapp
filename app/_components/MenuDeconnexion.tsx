"use client";
import { useEffect, useState } from "react";
import { authBrowser, sessionActuelle } from "@/lib/supabaseBrowser";

// « Se déconnecter » dans le menu de l'en-tête www : n'apparaît que si une
// session DataParl' Auth existe (cookies .dataparl.fr partagés entre les
// sous-domaines). Ferme la session puis recharge la page courante pour
// revenir à l'état visiteur.
export default function MenuDeconnexion() {
  const [connecte, setConnecte] = useState(false);

  useEffect(() => {
    sessionActuelle()
      .then((s) => setConnecte(Boolean(s)))
      .catch(() => setConnecte(false));
  }, []);

  if (!connecte) return null;

  async function deconnexion() {
    await authBrowser().auth.signOut();
    window.location.replace(window.location.pathname);
  }

  return (
    <button type="button" onClick={deconnexion}>
      Se déconnecter
    </button>
  );
}
