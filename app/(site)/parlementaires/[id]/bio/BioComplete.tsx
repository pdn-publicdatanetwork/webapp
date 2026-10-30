"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { assainirHtml, bioVersHtml } from "@/lib/htmlBio";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import VideoDeblocage from "@/app/_components/VideoDeblocage";

// Biographie complète d'un élu : le début est public (aperçu indexé par les
// moteurs de recherche), la suite est réservée aux comptes et se débloque
// contre une courte vidéo publicitaire.

export default function BioComplete({ personne, nom, suite }: { personne: string; nom: string; suite: string }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [bio, setBio] = useState<{ texte: string; source: string | null } | null>(null);
  const [erreur, setErreur] = useState(false);
  const [pub, setPub] = useState(false);
  const [essai, setEssai] = useState(0);

  useEffect(() => { sessionActuelle().then(setSession); }, []);
  useEffect(() => {
    if (!session) return;
    fetch(`/api/bios/elu?personne=${encodeURIComponent(personne)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" })
      .then((r) => {
        if (r.status === 402) { setPub(true); return null; }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((d) => { if (d) { setPub(false); setBio(d); } })
      .catch(() => setErreur(true));
  }, [session, personne, essai]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card" style={{ maxWidth: "none" }}>
        <p style={{ marginTop: 0 }}>
          <strong>La biographie complète de {nom} est réservée aux comptes DataParl&apos;</strong>, gratuits :
          parcours détaillé, fonctions, dates et sources.
        </p>
        <a className="btn" href={`/connexion?suite=${encodeURIComponent(suite)}`}>Créer un compte ou se connecter</a>
      </div>
    );
  }
  if (erreur) return <p className="erreur">La biographie n&apos;a pas pu être chargée. Réessaie dans un instant.</p>;
  if (pub) return <VideoDeblocage session={session} cible={`bio:${personne}`} objet={`La biographie complète de ${nom}`} onDebloque={() => setEssai((n) => n + 1)} />;
  if (!bio) return <p className="meta">Chargement de la biographie…</p>;

  return (
    <>
      <div className="bio-html" dangerouslySetInnerHTML={{ __html: assainirHtml(bioVersHtml(bio.texte)) }} />
      {bio.source && <p className="meta">Source : {bio.source}, biographie éditée par l&apos;équipe DataParl&apos;.</p>}
    </>
  );
}
