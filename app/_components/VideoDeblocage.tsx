"use client";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { APPLIXIR_API_KEY, APPLIXIR_SDK, DUREE_DEBLOCAGE_H } from "@/lib/env";

// Débloquer un contenu (parcours, biographie, historique d'équipe) en regardant
// une courte vidéo publicitaire (AppLixir). Le lecteur n'est chargé qu'après un
// clic (et donc l'accord) de la personne. Le déblocage est accordé par le
// serveur, sur rappel signé d'AppLixir : ici, on attend seulement ce rappel.
// Si aucune vidéo n'est disponible (no-fill) ou que le lecteur échoue, le
// serveur débloque quand même le contenu (jamais de blocage dur).

type Statut = { type: string };
declare global {
  interface Window {
    initializeAndOpenPlayer?: (o: {
      apiKey: string; injectionElementId: string; userId?: string;
      adStatusCallbackFn?: (s: Statut) => void; adErrorCallbackFn?: (e: unknown) => void;
    }) => void;
  }
}

type Etat = "intro" | "chargement" | "lecture" | "verification" | "bloqueur" | "interrompue" | "indisponible" | "refus" | "delai";

function chargerSdk(): Promise<void> {
  if (window.initializeAndOpenPlayer) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = APPLIXIR_SDK;
    s.async = true;
    s.onload = () => (window.initializeAndOpenPlayer ? ok() : ko(new Error("lecteur absent")));
    s.onerror = () => ko(new Error("script bloqué"));
    document.head.appendChild(s);
  });
}

export default function VideoDeblocage({
  session, cible, objet, onDebloque,
}: { session: Session; cible: string; objet: string; onDebloque: () => void }) {
  const [etat, setEtat] = useState<Etat>("intro");
  const attente = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (attente.current) clearInterval(attente.current); }, []);

  function attendreLeServeur() {
    setEtat("verification");
    const debut = Date.now();
    attente.current = setInterval(async () => {
      const r = await fetch(`/api/deblocage?id=${encodeURIComponent(cible)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" }).catch(() => null);
      const d = r?.ok ? await r.json() : null;
      if (d?.debloque) { clearInterval(attente.current!); onDebloque(); return; }
      if (Date.now() - debut > 45_000) { clearInterval(attente.current!); setEtat("delai"); }
    }, 1500);
  }

  // Aucune vidéo disponible (no-fill) ou erreur du lecteur : le serveur
  // débloque le contenu quand même, pourvu qu'une demande de vidéo récente
  // existe pour ce compte et cette fiche.
  async function deblocageNoFill() {
    const r = await fetch(`/api/deblocage?id=${encodeURIComponent(cible)}`, { method: "PUT", headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => null);
    const d = r?.ok ? await r.json().catch(() => null) : null;
    if (d?.debloque) { if (attente.current) clearInterval(attente.current); onDebloque(); return; }
    setEtat((e) => (e === "verification" ? e : "indisponible"));
  }

  async function lancer() {
    setEtat("chargement");
    const r = await fetch(`/api/deblocage?id=${encodeURIComponent(cible)}`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => null);
    const jeton = r?.ok ? ((await r.json()) as { jeton: string }).jeton : null;
    if (!jeton) return setEtat("indisponible");
    try { await chargerSdk(); } catch { return setEtat("bloqueur"); }
    setEtat("lecture");
    window.initializeAndOpenPlayer!({
      apiKey: APPLIXIR_API_KEY,
      injectionElementId: "applixir-ad-container",
      userId: jeton, // jeton opaque : AppLixir ne connaît ni le compte ni le contenu
      adStatusCallbackFn: (s) => {
        if (s.type === "complete" || s.type === "allAdsCompleted") attendreLeServeur();
        else if (s.type === "skipped" || s.type === "manuallyEnded") setEtat("interrompue");
        else if (s.type === "consentDeclined") setEtat("refus");
      },
      adErrorCallbackFn: () => { void deblocageNoFill(); },
    });
  }

  const messages: Partial<Record<Etat, string>> = {
    bloqueur: "Un bloqueur de publicité empêche la vidéo de se charger. Autorise les publicités sur dataparl.fr (ou désactive le bloqueur pour ce site), puis réessaie.",
    interrompue: "La vidéo a été interrompue avant la fin : le contenu n'est pas débloqué.",
    indisponible: "La vidéo n'a pas pu être affichée et le déblocage de secours a échoué. Recharge la page et réessaie dans un instant.",
    refus: "Tu as refusé les publicités personnalisées : une vidéo non personnalisée peut quand même être proposée, réessaie.",
    delai: "La confirmation tarde à arriver. Recharge la page dans un instant : si la vidéo a bien été vue, le contenu sera débloqué.",
  };

  return (
    <div className="card" style={{ maxWidth: "none" }}>
      <p style={{ marginTop: 0 }}>
        <strong>{objet} est gratuit</strong>, en échange d&apos;une courte vidéo publicitaire
        (environ 20 secondes). Il reste ensuite accessible {DUREE_DEBLOCAGE_H} heures.
      </p>
      <p className="meta">
        La vidéo est fournie par AppLixir et ses partenaires publicitaires, qui peuvent utiliser des cookies et
        identifiants pour la diffuser et la mesurer. Rien n&apos;est chargé avant ton clic.{" "}
        <a href="/informations-legales/cookies">En savoir plus</a>.
      </p>
      {messages[etat] && <p className="erreur">{messages[etat]}</p>}
      {etat === "verification" ? <p className="meta">Vidéo terminée, déblocage en cours…</p> : etat !== "lecture" && (
        <button onClick={lancer} disabled={etat === "chargement"}>{etat === "chargement" ? "Chargement…" : etat === "intro" ? "Regarder la vidéo et débloquer" : "Réessayer"}</button>
      )}
      <div id="applixir-ad-container" />
    </div>
  );
}
