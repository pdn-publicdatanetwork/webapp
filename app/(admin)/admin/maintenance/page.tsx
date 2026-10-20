"use client";
import { useState } from "react";
import { useAdmin } from "@/app/_components/admin/Porte";
import Pagination from "@/app/_components/admin/Pagination";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";

// Maintenance : carte de bascule du site (couper / rouvrir, synchronisée avec
// status.dataparl.fr) et inscriptions « prévenez-moi du retour » (one-shot :
// ces adresses ne reçoivent uniquement l'email « le site est de retour »).

type Prevenu = {
  id: string; email: string; confirmed: boolean;
  confirmed_at: string | null; created_at: string; notified_at: string | null; source: string;
};

type Etat = {
  active: boolean; ouvert_le: string | null; ferme_le: string | null;
  par: string | null; motif: string | null;
};

type Donnees = {
  total: number; confirme: number; par_page: number; prevenus: Prevenu[];
  etat: Etat; betterstack: boolean;
};

export default function PrevenusMaintenance() {
  const { api } = useAdmin();
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(0);
  const [motif, setMotif] = useState("");
  const [message, setMessage] = useState("");
  const [occupe, setOccupe] = useState(false);
  const { data, err, recharger } = useRessource<Donnees>(
    "/api/admin/maintenance", { q: recherche, page },
  );

  async function basculer(active: boolean) {
    if (!confirm(active ? "Couper tout le site public (maintenance) ?" : "Rouvrir le site ?")) return;
    setOccupe(true);
    setMessage("");
    try {
      const r = await api("/api/admin/maintenance", { method: "PUT", body: { active, motif: motif || undefined } }) as
        { betterstack?: { ok: boolean; message: string } } | undefined;
      setMessage(r?.betterstack?.message ?? "Bascule enregistrée.");
      recharger();
    } catch (e) {
      setMessage("Erreur : " + String(e));
    }
    setOccupe(false);
  }

  async function supprimer(email: string) {
    if (!confirm(`Supprimer l'inscription de ${email} ?`)) return;
    await api("/api/admin/maintenance", { method: "DELETE", body: { email } });
    recharger();
  }

  function exporter() {
    const lignes = [
      "email,inscrit_le,confirme_le,prevenu_le",
      ...(data?.prevenus.filter((p) => p.confirmed) ?? []).map((p) =>
        `${p.email},${p.created_at},${p.confirmed_at ?? ""},${p.notified_at ?? ""}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([lignes], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "dataparl-prevenus-maintenance.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <h1>Maintenance</h1>
      <p className="meta">
        Bascule instantanée du site public (effective en moins de 30 s) : le proxy
        et le chat suivent la table d'état ; la page de statut Better Stack
        (status.dataparl.fr) et le canal Slack sont mis à jour en même temps.
      </p>
      <div className="defile"><table className="stats">
        <thead><tr><th>État du site</th><th>Dernière bascule</th><th>Actions</th></tr></thead>
        <tbody><tr>
          <td>{data?.etat.active ? <span className="erreur">🔴 Maintenance active</span> : <span className="ok">🟢 Site ouvert</span>}</td>
          <td className="meta">
            {data && (data.etat.active ? dateHeure(data.etat.ouvert_le) : dateHeure(data.etat.ferme_le))}
            {data?.etat.par ? ` — ${data.etat.par}` : ""}
          </td>
          <td>
            <input type="text" placeholder="Motif (affiché sur status.dataparl.fr)" value={motif} onChange={(e) => setMotif(e.target.value)} />
            {" "}
            {data?.etat.active
              ? <button disabled={occupe} onClick={() => basculer(false)}>Rouvrir le site</button>
              : <button disabled={occupe} onClick={() => basculer(true)}>Couper le site</button>}
          </td>
        </tr></tbody>
      </table></div>
      {message && <p className="meta">{message}</p>}
      {data && !data.betterstack && (
        <p className="meta">⚠️ BETTERSTACK_API_KEY absente sur Vercel : la bascule du site fonctionne, mais status.dataparl.fr n'est pas synchronisé.</p>
      )}

      <h2>Prévenus maintenance</h2>
      <p className="meta">
        Adresses collectées sur la page de maintenance (« être prévenu du retour »).
        Elles recevront uniquement l&apos;email d&apos;annonce de la réouverture, rien d&apos;autre.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); setPage(0); setRecherche(q); }} className="barre-recherche">
        <input type="text" placeholder="Rechercher une adresse" value={q} onChange={(e) => setQ(e.target.value)} />
        <button>Rechercher</button>
      </form>
      {err && <p className="erreur">{err}</p>}
      {data && <>
        <p className="meta">
          {data.total} inscription(s), dont {data.confirme} confirmée(s).
          {" "}<button className="lien" onClick={exporter}>Exporter les confirmées (CSV)</button>
        </p>
        <div className="defile"><table className="stats">
          <thead><tr><th>Email</th><th>État</th><th>Inscription</th><th>Confirmation</th><th>Email retour envoyé</th><th></th></tr></thead>
          <tbody>{data.prevenus.map((p) => (
            <tr key={p.id}>
              <td>{p.email}</td>
              <td>{p.confirmed ? <span className="ok">confirmée</span> : <span className="meta">en attente</span>}</td>
              <td className="meta">{dateHeure(p.created_at)}</td>
              <td className="meta">{p.confirmed_at ? dateHeure(p.confirmed_at) : "–"}</td>
              <td className="meta">{p.notified_at ? dateHeure(p.notified_at) : "–"}</td>
              <td><button className="lien" onClick={() => supprimer(p.email)}>Supprimer</button></td>
            </tr>))}
          </tbody>
        </table></div>
        <Pagination page={page} total={data.total} parPage={data.par_page} onPage={setPage} />
      </>}
    </>
  );
}
