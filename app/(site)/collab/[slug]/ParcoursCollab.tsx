"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Photo from "@/app/_components/Photo";
import { CHAMBRE_LONG } from "@/lib/format";
import { libellePeriode } from "@/lib/periodes";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import VideoDeblocage from "@/app/_components/VideoDeblocage";

type Periode = {
  chambre: string; debut: string; debut_connu: boolean; fin: string; fin_connue: boolean; en_cours: boolean; fonction: string;
  groupe: string; elu: { nom: string; slug: string | null; photo: string | null; circonscription: string };
  commissions: { libelle: string; fonction: string }[];
};

export default function ParcoursCollab({ id, suite }: { id: string; suite: string }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [periodes, setPeriodes] = useState<Periode[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [pub, setPub] = useState(false);
  const [essai, setEssai] = useState(0);

  useEffect(() => { sessionActuelle().then(setSession); }, []);
  useEffect(() => {
    if (!session) return;
    fetch(`/api/parcours/collab?id=${id}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" })
      .then((r) => {
        if (r.status === 402) { setPub(true); return null; }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((d) => { if (d) { setPub(false); setPeriodes(d.periodes); } })
      .catch(() => setErreur(true));
  }, [session, id, essai]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card" style={{ maxWidth: "none" }}>
        <p style={{ marginTop: 0 }}><strong>Le parcours complet est réservé aux comptes DataParl&apos;</strong>, gratuits : les élus, les dates, les chambres et les commissions.</p>
        <a className="btn" href={`/connexion?suite=${encodeURIComponent(suite)}`}>Créer un compte ou se connecter</a>
      </div>
    );
  }
  if (erreur) return <p className="erreur">Le parcours n&apos;a pas pu être chargé.</p>;
  if (pub) return <VideoDeblocage session={session} cible={id} objet="Le parcours complet de cette fiche" onDebloque={() => setEssai((n) => n + 1)} />;
  if (!periodes) return <p className="meta">Chargement du parcours…</p>;

  const tries = [...periodes].sort((a, b) => Number(b.en_cours) - Number(a.en_cours) || (b.debut || "").localeCompare(a.debut || ""));
  return (
    <ol className="parcours">
      {tries.map((p, i) => (
        <li key={i} className="parcours-collab">
          <Photo chambre={p.chambre} slug={p.elu.slug} src={p.elu.photo} nom={p.elu.nom} taille={48} />
          <div>
            <p className="parcours-titre">
              <strong>{p.elu.slug ? <a href={`/parlementaires/${encodeURIComponent(p.elu.slug)}`}>{p.elu.nom}</a> : p.elu.nom}</strong>
              {p.en_cours && <span className="puce">en poste</span>}
            </p>
            <p className="meta" style={{ margin: "2px 0" }}>
              {CHAMBRE_LONG[p.chambre]}{p.groupe ? `, groupe ${p.groupe}` : ""}{p.elu.circonscription && p.chambre !== "europarl" ? `, ${p.elu.circonscription}` : ""}
            </p>
            <p style={{ margin: "2px 0" }}>{libellePeriode(p)}{p.fonction ? `, ${p.fonction}` : ""}</p>
            {p.commissions.length > 0 && (
              <p className="meta" style={{ margin: "2px 0" }}>
                Commissions de l&apos;élu pendant la période : {p.commissions.map((c) => c.libelle + (c.fonction && c.fonction.toLowerCase() !== "membre" ? ` (${c.fonction.toLowerCase()})` : "")).join(" ; ")}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
