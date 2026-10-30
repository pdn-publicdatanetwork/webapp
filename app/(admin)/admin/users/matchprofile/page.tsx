"use client";

import { useCallback, useEffect, useState } from "react";
import { useRessource, dateHeure } from "@/app/_components/admin/utils";
import { sessionActuelle } from "@/lib/supabaseBrowser";

// Revue des associations de fiches collaborateurs : file « à traiter »
// (contrôles non concluants, pièces justificatives), décisions manuelles
// valider/refuser/dissocier, historique des validations automatiques et
// des refus. Règles affichées en haut de page : jamais de validation
// automatique partielle, tout écart arrive ici. Les pièces justificatives
// (fallback sans adresse parlementaire) se consultent et se déposent ici,
// puis sont purgées à la décision (30 jours maximum).

type Demande = {
  id: string; user_id: string; email: string | null; collab_slug: string; collab_id: string;
  statut: string; echecs: number; gel_jusqu_a: string | null; expire_le: string | null;
  verifie_par: string | null; verifie_le: string | null; cree_le: string;
  piece: { id: string; nom: string; cree_le: string } | null;
};

const FILTRES = [
  { code: "a_traiter", libelle: "À traiter" },
  { code: "piece_jointe", libelle: "Pièces à vérifier" },
  { code: "attente_email", libelle: "En attente d'e-mail" },
  { code: "verifie", libelle: "Validées" },
  { code: "refuse", libelle: "Refusées" },
  { code: "gele", libelle: "Gelées" },
];

async function agir(id: string, action: string) {
  const s = await sessionActuelle();
  const r = await fetch("/api/admin/matchprofile", {
    method: "POST",
    headers: { Authorization: `Bearer ${s?.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id, action }),
  });
  return r.ok;
}

async function joindrePiece(id: string, fichier: File) {
  const s = await sessionActuelle();
  const f = new FormData();
  f.append("demande_id", id);
  f.append("fichier", fichier);
  const r = await fetch("/api/admin/matchprofile/piece", {
    method: "POST",
    headers: { Authorization: `Bearer ${s?.access_token}` },
    body: f,
  });
  return r.ok;
}

// Consultation d'une pièce : le jeton de session ne voyage pas dans une
// navigation d'onglet, on télécharge donc le fichier via fetch authentifié
// puis on l'ouvre localement (blob).
async function voirPiece(id: string) {
  const s = await sessionActuelle();
  const r = await fetch("/api/admin/matchprofile/piece?id=" + id, {
    headers: { Authorization: `Bearer ${s?.access_token}` },
  });
  if (!r.ok) return;
  const url = URL.createObjectURL(await r.blob());
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function AdminMatchProfile() {
  const [filtre, setFiltre] = useState("a_traiter");
  const { data, err, recharger } = useRessource<{ demandes: Demande[] }>("/api/admin/matchprofile", {});
  const [enCours, setEnCours] = useState("");

  const agirPuisRecharger = useCallback(async (id: string, action: string) => {
    setEnCours(id);
    await agir(id, action);
    setEnCours("");
    recharger();
  }, [recharger]);

  const joindrePuisRecharger = useCallback(async (id: string, fichier: File) => {
    setEnCours(id);
    await joindrePiece(id, fichier);
    setEnCours("");
    recharger();
  }, [recharger]);

  const demandes = (data?.demandes ?? []).filter((d) => d.statut === filtre);

  return (
    <>
      <h1>Associations de fiches</h1>
      <p className="lead">
        Toutes les demandes d&apos;association arrivent ici. Les demandes passant tous les contrôles sont
        validées automatiquement ; seules les demandes non conformes attendent une décision.
      </p>
      <ol className="meta">
        <li>Automatique uniquement si tous les contrôles passent (domaine parlementaire, nom conforme à la fiche, SPF/DKIM, objet, code actif).</li>
        <li>Tout écart : « à traiter », jamais de validation automatique partielle.</li>
        <li>3 échecs pour un même compte et une même fiche : demandes gelées 30 jours, compte invité à passer par le formulaire de contact.</li>
        <li>Toute décision (auto ou manuelle) est journalisée dans associations_journal.</li>
        <li>La dissociation manuelle est possible à tout moment depuis cette page.</li>
        <li>Pièce justificative (fallback sans adresse parlementaire) : consultation et dépôt ici ; purge à la décision ou sous 30 jours.</li>
      </ol>

      <div className="onglets">
        {FILTRES.map((f) => (
          <button key={f.code} className={filtre === f.code ? "actif" : ""} onClick={() => setFiltre(f.code)}>
            {f.libelle}
          </button>
        ))}
      </div>
      {err && <p className="erreur">{err}</p>}

      <table className="tableau-admin">
        <thead>
          <tr><th>Date</th><th>Compte</th><th>Fiche</th><th>Statut</th><th>Détails</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {demandes.map((d) => (
            <tr key={d.id}>
              <td>{dateHeure(d.cree_le)}</td>
              <td>{d.email ?? d.user_id.slice(0, 8) + "…"}</td>
              <td><a href={`/collab/${d.collab_slug}`}>{d.collab_slug}</a></td>
              <td>{d.statut}{d.verifie_par ? ` (${d.verifie_par})` : ""}</td>
              <td>
                {d.gel_jusqu_a ? `gelé jusqu'au ${d.gel_jusqu_a.slice(0, 10)}` : ""}
                {d.echecs > 0 ? ` · ${d.echecs} échec(s)` : ""}
                {d.verifie_le ? ` vérifié le ${dateHeure(d.verifie_le)}` : ""}
                {d.piece && (
                  <>{" · "}<button className="lien" onClick={() => voirPiece(d.piece!.id)}>voir la pièce ({d.piece.nom})</button></>
                )}
              </td>
              <td>
                {enCours === d.id ? "…" : (
                  <>
                    {d.statut !== "verifie" && <button onClick={() => agirPuisRecharger(d.id, "valider")}>Valider</button>}{" "}
                    <button onClick={() => agirPuisRecharger(d.id, "dissocier")}>Dissocier</button>{" "}
                    <button onClick={() => agirPuisRecharger(d.id, "refuser")}>Refuser</button>{" "}
                    <label className="lien">
                      Joindre une pièce
                      <input
                        type="file" hidden
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) joindrePuisRecharger(d.id, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </>
                )}
              </td>
            </tr>
          ))}
          {demandes.length === 0 && (
            <tr><td colSpan={6} className="meta">Aucune demande dans cette catégorie.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
