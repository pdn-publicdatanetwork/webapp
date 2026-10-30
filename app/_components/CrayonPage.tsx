"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { sessionActuelle } from "@/lib/supabaseBrowser";

// Crayon « tout éditer » du site public : visible pour l'équipe connectée,
// sur toutes les pages www sauf /mon-compte. L'édition porte sur le contenu
// principal de la page (<main>) : jamais l'en-tête, le pied de page ni les
// menus, qui restent en dehors. Le HTML enregistré remplace ensuite le
// contenu de la page pour tous les visiteurs (CMS maison léger, table
// contenu_pages). À manier avec goût sur les pages très interactives
// (recherche, formulaires) : le contenu figé remplace alors les blocs dynamiques.

type Etat = "cache" | "otp" | "pret" | "erreur";

const HORS_EDITION = ["/mon-compte"];

async function jeton(): Promise<string | null> {
  return (await sessionActuelle())?.access_token ?? null;
}

async function appel<T>(chemin: string, init?: RequestInit): Promise<{ status: number; json: T }> {
  const t = await jeton();
  const r = await fetch(chemin, { cache: "no-store", ...init, headers: { Authorization: `Bearer ${t ?? ""}`, ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) } });
  const json = (await r.json().catch(() => ({}))) as T;
  return { status: r.status, json };
}

export default function CrayonPage() {
  const chemin = usePathname() ?? "";
  const [etat, setEtat] = useState<Etat>("cache");
  const [edition, setEdition] = useState(false);
  const [code, setCode] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sauvegarde = useRef<string | null>(null);

  const exclus = HORS_EDITION.some((p) => chemin === p || chemin.startsWith(`${p}/`));

  // Applique la version enregistrée (si elle existe) pour tous les visiteurs.
  useEffect(() => {
    if (exclus) return;
    let vivant = true;
    (async () => {
      try {
        const r = await fetch(`/api/content/page?chemin=${encodeURIComponent(chemin)}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as { html: string | null };
        if (!vivant || !d.html) return;
        const main = document.querySelector("main .wrap");
        if (main) main.innerHTML = d.html;
      } catch { /* pas de version : page normale */ }
    })();
    return () => { vivant = false; };
  }, [chemin, exclus]);

  // Visibilité du crayon : session d'équipe + second facteur, comme l'admin.
  useEffect(() => {
    if (exclus) return;
    let vivant = true;
    (async () => {
      try {
        const t = await jeton();
        if (!t) return;
        const { status, json } = await appel<{ otp?: string }>("/api/admin/otp");
        if (!vivant) return;
        if (status === 200) setEtat("pret");
        else if (status === 401 && json.otp === "requis") setEtat("otp");
      } catch { /* réseau indisponible : pas de crayon, la page reste intacte (Sentry be184894) */ }
    })();
    return () => { vivant = false; };
  }, [chemin, exclus]);

  if (exclus || etat === "cache") return null;

  function demarrerEdition() {
    setMessage(null);
    const main = document.querySelector("main .wrap");
    if (!main) return;
    sauvegarde.current = main.innerHTML;
    main.setAttribute("contenteditable", "true");
    setEdition(true);
  }

  function annuler() {
    const main = document.querySelector("main .wrap");
    if (main && sauvegarde.current !== null) main.innerHTML = sauvegarde.current;
    main?.removeAttribute("contenteditable");
    setEdition(false);
    setMessage("Modifications abandonnées.");
  }

  function cmd(nom: string, arg?: string) {
    (document.querySelector("main .wrap") as HTMLElement | null)?.focus();
    document.execCommand(nom, false, arg);
  }

  async function verifierCode() {
    if (!/^[0-9]{6}$/.test(code)) { setMessage("code à 6 chiffres"); return; }
    setOccupe(true); setMessage(null);
    const { status, json } = await appel<{ error?: string }>("/api/admin/otp/verification", { method: "POST", body: JSON.stringify({ code }) });
    setOccupe(false);
    if (status !== 200) { setMessage(json.error ?? "code invalide"); return; }
    setEtat("pret"); setCode("");
  }

  async function enregistrer() {
    const main = document.querySelector("main .wrap");
    if (!main) return;
    setOccupe(true); setMessage(null);
    const { status, json } = await appel<{ error?: string }>("/api/admin/content/page", { method: "POST", body: JSON.stringify({ chemin, html: main.innerHTML }) });
    setOccupe(false);
    if (status !== 200) { setMessage(json.error ?? "enregistrement impossible"); return; }
    main.removeAttribute("contenteditable");
    setEdition(false);
    setMessage("Page enregistrée : le contenu remplacé est visible par tous.");
  }

  async function reinitialiser() {
    if (!confirm("Retirer la version enregistrée et revenir au contenu d'origine ?")) return;
    setOccupe(true); setMessage(null);
    const { status, json } = await appel<{ error?: string }>("/api/admin/content/page", { method: "DELETE", body: JSON.stringify({ chemin }) });
    setOccupe(false);
    if (status !== 200) { setMessage(json.error ?? "impossible"); return; }
    setMessage("Version retirée. Rechargement…");
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <>
      {!edition && (
        <button type="button" className="crayon-flottant" aria-label="Modifier cette page" title="Modifier cette page (contenu uniquement)"
          onClick={() => (etat === "pret" ? demarrerEdition() : setEtat("otp"))}>✏️</button>
      )}
      {etat === "otp" && !edition && (
        <div className="crayon-panneau" role="dialog" aria-label="Confirmation avant édition">
          <p className="meta">Second facteur requis pour modifier les pages.</p>
          <input className="mono" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" aria-label="Code à 6 chiffres" />
          <button type="button" className="principal" onClick={verifierCode} disabled={occupe}>Vérifier</button>
          <button type="button" className="lien" onClick={() => setEtat("cache")}>Annuler</button>
        </div>
      )}
      {edition && (
        <div className="crayon-barre" role="toolbar" aria-label="Édition de la page">
          <button type="button" onClick={() => cmd("bold")}><strong>G</strong></button>
          <button type="button" onClick={() => cmd("italic")}><em>I</em></button>
          <button type="button" onClick={() => cmd("formatBlock", "h2")}>Titre</button>
          <button type="button" onClick={() => cmd("formatBlock", "p")}>Texte</button>
          <button type="button" onClick={() => cmd("insertUnorderedList")}>Liste</button>
          <button type="button" onClick={() => { const u = prompt("Adresse du lien :"); if (u) cmd("createLink", u); }}>Lien</button>
          <span className="crayon-separateur"></span>
          <button type="button" className="principal" onClick={enregistrer} disabled={occupe}>Enregistrer</button>
          <button type="button" className="lien" onClick={annuler} disabled={occupe}>Annuler</button>
          <button type="button" className="lien" onClick={reinitialiser} disabled={occupe}>Version d'origine</button>
        </div>
      )}
      {message && <div className="crayon-message meta" role="status">{message}</div>}
    </>
  );
}
