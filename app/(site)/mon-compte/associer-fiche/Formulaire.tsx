"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Autocompletion, { type Option } from "@/app/_components/Autocompletion";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import { dateHeure } from "@/app/_components/admin/utils";

type Statut = { statut: string; collab_slug: string | null; gel_jusqu_a: string | null; expire_le: string | null } | null;
type Fiche = { slug: string; nom?: string; detail?: string };

async function appel(url: string, init?: RequestInit) {
  const s = await sessionActuelle();
  const r = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${s?.access_token}`, "Content-Type": "application/json" },
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

export default function Formulaire() {
  // Slug prérempli via ?slug=… : lu en client dans un effet (pas de
  // useSearchParams, qui exige une boundary Suspense et casse le prérendu).
  const pieceInput = useRef<HTMLInputElement>(null);
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [demande, setDemande] = useState<{ adresse: string; objet: string; code: string; expireLe: string; domaine: string } | null>(null);
  const [statut, setStatut] = useState<Statut>(null);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [pieceMsg, setPieceMsg] = useState("");
  const [pieceErr, setPieceErr] = useState("");
  const [pieceEnvoi, setPieceEnvoi] = useState(false);

  const rafraichir = useCallback(async () => {
    const { ok, data } = await appel("/api/compte/association");
    if (ok) setStatut(data.statut ?? null);
  }, []);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("slug");
    if (s && /^[a-z0-9_]{3,120}$/.test(s)) setFiche({ slug: s });
    rafraichir();
    // Rafraîchissement léger tant qu'une demande est en attente.
    const t = setInterval(rafraichir, 15000);
    return () => clearInterval(t);
  }, [rafraichir]);

  function choisir(o: Option | null) {
    setErreur("");
    setDemande(null);
    if (o && o.valeur.startsWith("collab:")) {
      setFiche({ slug: o.valeur.slice("collab:".length), nom: o.libelle, detail: o.detail });
    }
  }

  async function demanderCode() {
    if (!fiche) return;
    setErreur(""); setChargement(true);
    const { ok, data } = await appel("/api/compte/association", {
      method: "POST", body: JSON.stringify({ slug: fiche.slug }),
    });
    setChargement(false);
    if (!ok) return setErreur(data.error ?? "erreur");
    setDemande(data);
    rafraichir();
  }

  // Fallback sans adresse parlementaire : dépôt d'une pièce justificative.
  async function envoyerPiece(fichier: File) {
    if (!fiche) return;
    setPieceErr(""); setPieceMsg(""); setPieceEnvoi(true);
    const s = await sessionActuelle();
    const f = new FormData();
    f.append("slug", fiche.slug);
    f.append("fichier", fichier);
    const r = await fetch("/api/compte/association/piece", {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token}` },
      body: f,
    });
    setPieceEnvoi(false);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return setPieceErr(data.error ?? "envoi impossible");
    setPieceMsg("Pièce reçue. L'équipe vérifie votre identité et vous répond sous 48 h.");
    rafraichir();
  }

  const s = statut?.statut;
  const mailto = demande
    ? `mailto:${demande.adresse}?subject=${encodeURIComponent(demande.objet)}&body=${encodeURIComponent(demande.code + "\n\n(ne pas modifier)")}`
    : null;

  return (
    <>
      <h1>Associer ma fiche collaborateur</h1>
      <p className="lead">
        Vous êtes collaborateur parlementaire et une fiche vous est consacrée ? Vérifiez votre identité, puis gérez vous-même votre profil CV.
      </p>

      {s === "verifie" && (
        <p className="card">
          Votre fiche est associée à votre compte.{" "}
          <a href="/mon-compte/ma-fiche">Gérer mon profil CV</a>
        </p>
      )}

      {s === "gele" && statut?.gel_jusqu_a && (
        <p className="card">
          Demandes suspendues jusqu&apos;au {statut.gel_jusqu_a.slice(0, 10)}. Écrivez-nous via le{" "}
          <a href="/contact">formulaire de contact</a> : nous vérifierons votre identité au cas par cas.
        </p>
      )}

      <h2>Votre fiche</h2>

      {s !== "verifie" && s !== "gele" && !fiche && (
        <>
          <p className="meta">Tapez votre nom pour retrouver votre fiche.</p>
          <div className="recherche-globale">
            <Autocompletion
              source="collabs"
              placeholder="Votre nom…"
              ariaLabel="Rechercher votre fiche collaborateur"
              onChoix={choisir}
            />
          </div>
        </>
      )}

      {fiche && s !== "verifie" && s !== "gele" && (
        <p className="card">
          <strong>{fiche.nom || "Fiche sélectionnée"}</strong>
          {fiche.detail && <> <span className="meta">{fiche.detail}</span><br /></>}
          {!fiche.nom && <> <span className="meta">référence : {fiche.slug}</span><br /></>}
          <a href={`/collab/${encodeURIComponent(fiche.slug)}`}>voir la fiche</a>
          {" · "}
          <button className="lien" onClick={() => { setFiche(null); setDemande(null); }}>changer de fiche</button>
          <br />
          <button onClick={demanderCode} disabled={chargement}>
            {chargement ? "…" : "Recevoir l’e-mail de vérification"}
          </button>
        </p>
      )}
      {erreur && <p className="erreur">{erreur}</p>}

      {demande && s !== "verifie" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Envoyez l&apos;e-mail depuis votre adresse professionnelle</h2>
          <p>
            L&apos;adresse attendue pour votre fiche est en <code>@{demande.domaine}</code>.
            L&apos;e-mail est entièrement prérempli : cliquez, puis « Envoyer ».
          </p>
          <p>
            <a className="bouton" href={mailto ?? "#"}>Ouvrir l&apos;e-mail prérempli</a>
          </p>
          <div className="meta" style={{ lineHeight: 1.9 }}>
            <div>Objet : <code>{demande.objet}</code></div>
            <div>Code : <code>{demande.code}</code></div>
            <div>Valable jusqu&apos;au {dateHeure(demande.expireLe)}</div>
          </div>
          <p className="meta" style={{ marginBottom: 0 }}>
            Sans modification de l&apos;objet ni du code, la vérification est quasi immédiate.
          </p>
        </div>
      )}

      {demande && s === "attente_email" && (
        <p className="meta">En attente de votre e-mail. Cette page se met à jour automatiquement.</p>
      )}
      {s === "a_traiter" && (
        <p className="card">
          Nous avons bien reçu votre e-mail : la vérification prend un peu plus de temps. Nous vous répondons sous 48 h.
        </p>
      )}
      {s === "piece_jointe" && (
        <p className="card">
          Pièce reçue : l&apos;équipe vérifie votre identité et vous répond sous 48 h.
        </p>
      )}
      {s === "attente_email" && !demande && statut?.expire_le && (
        <p className="meta">
          Une demande est déjà en cours (expire le {dateHeure(statut.expire_le)}). Relancez-la pour recevoir un nouveau code.
        </p>
      )}

      {fiche && s !== "verifie" && s !== "gele" && (
        <>
          <h2>Pas accès à votre adresse parlementaire ?</h2>
          <p className="meta">
            Ancien collaborateur, messagerie inaccessible : joignez une pièce justificative (badge ou carte
            AN/Sénat, contrat de travail, capture de votre messagerie interne). PDF, JPEG ou PNG, 5 Mo maximum.
            Elle n&apos;est jamais publiée : elle sert uniquement à la vérification, l&apos;équipe la supprime
            après décision (30 jours maximum) et vous répond sous 48 h.
          </p>
          <input
            ref={pieceInput}
            type="file" hidden
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) envoyerPiece(f);
              e.target.value = "";
            }}
          />
          <button type="button" onClick={() => pieceInput.current?.click()} disabled={pieceEnvoi}>
            {pieceEnvoi ? "Envoi en cours…" : "Joindre une pièce justificative"}
          </button>
          {pieceErr && <p className="erreur">{pieceErr}</p>}
          {pieceMsg && <p className="card">{pieceMsg}</p>}
        </>
      )}
    </>
  );
}
