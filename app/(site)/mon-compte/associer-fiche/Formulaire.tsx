"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import { dateHeure } from "@/app/_components/admin/utils";

type Statut = { statut: string; collab_slug: string | null; gel_jusqu_a: string | null; expire_le: string | null } | null;

async function appel(url: string, init?: RequestInit) {
  const s = await sessionActuelle();
  const r = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${s?.access_token}`, "Content-Type": "application/json" },
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

export default function Formulaire() {
  const params = useSearchParams();
  const [slug, setSlug] = useState(params.get("slug") ?? "");
  const [demande, setDemande] = useState<{ adresse: string; objet: string; code: string; expireLe: string } | null>(null);
  const [statut, setStatut] = useState<Statut>(null);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const rafraichir = useCallback(async () => {
    const { ok, data } = await appel("/api/compte/association");
    if (ok) setStatut(data.statut ?? null);
  }, []);

  useEffect(() => {
    rafraichir();
    // Rafraîchissement léger tant qu'une demande est en attente.
    const t = setInterval(rafraichir, 15000);
    return () => clearInterval(t);
  }, [rafraichir]);

  async function demanderCode() {
    setErreur(""); setChargement(true);
    const { ok, data } = await appel("/api/compte/association", {
      method: "POST", body: JSON.stringify({ slug }),
    });
    setChargement(false);
    if (!ok) return setErreur(data.error ?? "erreur");
    setDemande(data);
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
      <p className="meta">
        Sur votre fiche dataparl.fr, cliquez « C&apos;est votre fiche ? » pour arriver ici avec la fiche
        préremplie, ou collez la fin de l&apos;adresse (ex. gallicher_matthieu3afd22df).
      </p>
      <input
        value={slug} onChange={(e) => setSlug(e.target.value.trim())}
        placeholder="adresse de la fiche (ex. gallicher_matthieu3afd22df)"
        style={{ width: "100%", maxWidth: 420 }}
        disabled={s === "verifie" || s === "gele"}
      />
      <p>
        <button onClick={demanderCode} disabled={!slug || chargement || s === "verifie" || s === "gele"}>
          {chargement ? "…" : "Recevoir l'e-mail de vérification"}
        </button>
      </p>
      {erreur && <p className="erreur">{erreur}</p>}

      {demande && s !== "verifie" && (
        <>
          <h2>Envoyez l&apos;e-mail depuis votre adresse professionnelle</h2>
          <p>
            L&apos;adresse attendue pour votre fiche est une adresse parlementaire : en <code>@clb-an.fr</code>,
            <code> @clb.senat.fr</code> ou <code>@europarl.europa.eu</code> selon votre chambre.
          </p>
          <p>L&apos;e-mail est entièrement prérempli : cliquez, puis « Envoyer ».</p>
          <p>
            <a className="bouton" href={mailto ?? "#"}>Ouvrir l&apos;e-mail prérempli</a>
          </p>
          <p className="meta">
            Objet : {demande.objet} · Code : <code>{demande.code}</code> · valable jusqu&apos;au {dateHeure(demande.expireLe)}.
            Sans modification de l&apos;objet ni du code, la vérification est quasi immédiate.
          </p>
        </>
      )}

      {demande && s === "attente_email" && (
        <p className="meta">En attente de votre e-mail. Cette page se met à jour automatiquement.</p>
      )}
      {s === "a_traiter" && (
        <p className="card">
          Nous avons bien reçu votre e-mail : la vérification prend un peu plus de temps. Nous vous répondons sous 48 h.
        </p>
      )}
      {s === "attente_email" && !demande && statut?.expire_le && (
        <p className="meta">
          Une demande est déjà en cours (expire le {dateHeure(statut.expire_le)}). Relancez-la pour recevoir un nouveau code.
        </p>
      )}

      <h2>Vous n&apos;avez pas d&apos;adresse parlementaire ?</h2>
      <p>
        (ancien collaborateur, etc.) Écrivez-nous via le <a href="/contact">formulaire de contact</a> en
        précisant votre fiche : nous vous indiquerons la marche à suivre au cas par cas.
      </p>
    </>
  );
}
