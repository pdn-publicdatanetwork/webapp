"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { authBrowser, sessionActuelle } from "@/lib/supabaseBrowser";
import { cheminEspace } from "./useHoteMy";

// Invitation au questionnaire survey.dataparl.fr : après 4 minutes sur le site,
// un visiteur connecté peut répondre à 3 notes. Une seule fois (localStorage),
// jamais sur les pages légales ni le compte. « Plus tard » la repousse à 7
// jours, « Non merci » la clôt définitivement.

const CLE_VUE = "dp_enquete_vue";        // "non" : définitivement fermée ; date : à revoir ce jour-là
const APRES_MS = 4 * 60 * 1000;         // 4 minutes de connexion
const REPOUSSE_JOURS = 7;

export default function EnqueteInvite() {
  const chemin = usePathname() ?? "";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Jamais dans l'espace personnel (capsule et pages de compte).
    if (cheminEspace(chemin)) return;
    let minuteur: ReturnType<typeof setTimeout> | null = null;
    let annule = false;
    (async () => {
      const vue = localStorage.getItem(CLE_VUE);
      if (vue === "non") return;
      if (vue) {
        // Date de dernière repousse : au-delà de REPOUSSE_JOURS, on peut re-proposer.
        const relance = new Date(vue);
        relance.setDate(relance.getDate() + REPOUSSE_JOURS);
        if (Date.now() < relance.getTime()) return;
      }
      // Pop-up du sondage coupé depuis la console admin (site_parametres) : rien.
      try {
        const r = await fetch("/api/parametres-site");
        const p = (await r.json()) as { popup_sondage?: boolean };
        if (annule || p?.popup_sondage === false) return;
      } catch { /* indisponible : comportement par défaut (actif) */ }
      minuteur = setTimeout(() => {
        sessionActuelle().then((s) => {
          if (s?.user) setVisible(true);
        }).catch(() => { /* pas connecté : rien */ });
      }, APRES_MS);
    })();
    return () => { annule = true; if (minuteur) clearTimeout(minuteur); };
  }, [chemin]);

  function fermer(valeur: "non" | "plus-tard") {
    localStorage.setItem(CLE_VUE, valeur === "non" ? "non" : new Date().toISOString());
    setVisible(false);
  }

  async function accepter() {
    // La fenêtre doit être ouverte PENDANT le clic : après un await, le
    // navigateur ne la considère plus comme déclenchée par l'utilisateur et
    // le bloqueur de popups l'interdit (d'où « rien ne se passe »). On ouvre
    // donc un onglet vierge tout de suite, puis on le remplit avec l'URL du
    // jeton une fois celle-ci reçue.
    const f = window.open("", "_blank");
    try {
      const a = authBrowser();
      const { data } = await a.auth.getSession();
      const jeton = data.session?.access_token;
      if (!jeton) { f?.close(); fermer("plus-tard"); return; }
      const r = await fetch("/api/enquete/debut", {
        method: "POST",
        headers: { Authorization: `Bearer ${jeton}` },
      });
      if (!r.ok) { f?.close(); fermer("plus-tard"); return; }
      const d = (await r.json()) as { url: string };
      localStorage.setItem(CLE_VUE, "non");
      setVisible(false);
      if (f) f.location.href = d.url;
      else window.location.href = d.url; // onglet bloqué : onglet courant
    } catch {
      f?.close();
      fermer("plus-tard");
    }
  }

  if (!visible) return null;

  return (
    <div className="cookies" role="dialog" aria-labelledby="enquete-titre">
      <p className="meta">30 secondes, 3 notes.</p>
      <p id="enquete-titre" className="titre">Ton avis sur DataParl&apos;</p>
      <p style={{ fontSize: ".95rem" }}>
        Tu utilises le site depuis quelques minutes. Dis-nous ce que tu en penses :
        l&apos;<strong>expérience</strong>, le <strong>contenu de fond</strong>, et ta note globale.
        Réponses confidentielles, liées à ton compte.
      </p>
      <div className="consentement-boutons" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn" onClick={accepter}>Répondre au questionnaire</button>
        <button type="button" className="secondaire" onClick={() => fermer("plus-tard")}>Plus tard</button>
        <button type="button" className="lien" onClick={() => fermer("non")}>Non merci</button>
      </div>
    </div>
  );
}
