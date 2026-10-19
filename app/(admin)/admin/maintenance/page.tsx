"use client";
import { useState } from "react";
import { useAdmin } from "@/app/_components/admin/Porte";
import Pagination from "@/app/_components/admin/Pagination";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";

// Inscriptions « prévenez-moi du retour » de la page de maintenance.
// One-shot : ces adresses reçoivent uniquement l'email « le site est de
// retour » — elles ne sont pas dans les abonnés newsletter.

type Prevenu = {
  id: string; email: string; confirmed: boolean;
  confirmed_at: string | null; created_at: string; notified_at: string | null; source: string;
};

export default function PrevenusMaintenance() {
  const { api } = useAdmin();
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(0);
  const { data, err, recharger } = useRessource<{ total: number; confirme: number; par_page: number; prevenus: Prevenu[] }>(
    "/api/admin/maintenance", { q: recherche, page },
  );

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
      <h1>Prévenus maintenance</h1>
      <p className="meta">
        Adresses collectées sur la page de maintenance (« être prévenu·e du retour »).
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
