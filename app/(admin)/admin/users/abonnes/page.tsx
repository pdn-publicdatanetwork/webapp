"use client";
import { useState } from "react";
import { useAdmin } from "@/app/_components/admin/Porte";
import Pagination from "@/app/_components/admin/Pagination";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";

type Abonne = {
  id: string; email: string; confirmed: boolean; subscribed_at: string; confirmed_at: string | null; unsubscribed_at: string | null; source: string;
  alerte: { frequence: string; chambres: string[]; types: string[]; groupes: string[]; elus: string[]; active: boolean } | null;
};

export default function Abonnes() {
  const { api } = useAdmin();
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(0);
  const { data, err, recharger } = useRessource<{ total: number; par_page: number; abonnes: Abonne[] }>("/api/admin/abonnes", { q: recherche, page });

  async function desinscrire(email: string) {
    if (!confirm(`Désinscrire ${email} de toutes les communications ?`)) return;
    await api("/api/admin/abonnes", { method: "DELETE", body: { email } });
    recharger();
  }

  return (
    <>
      <h1>Abonnés aux alertes</h1>
      <form onSubmit={(e) => { e.preventDefault(); setPage(0); setRecherche(q); }} className="barre-recherche">
        <input type="text" placeholder="Rechercher une adresse" value={q} onChange={(e) => setQ(e.target.value)} />
        <button>Rechercher</button>
      </form>
      {err && <p className="erreur">{err}</p>}
      {data && <>
        <p className="meta">{data.total} inscription(s)</p>
        <div className="defile"><table className="stats">
          <thead><tr><th>Email</th><th>État</th><th>Alerte</th><th>Inscription</th><th></th></tr></thead>
          <tbody>{data.abonnes.map((a) => (
            <tr key={a.id}>
              <td>{a.email}</td>
              <td>{a.unsubscribed_at ? <span className="meta">désinscrit</span> : a.confirmed ? <span className="ok">confirmé</span> : <span className="meta">en attente</span>}</td>
              <td className="meta">{a.alerte ? `${a.alerte.active ? "" : "(inactive) "}${a.alerte.frequence}, ${a.alerte.chambres.join(", ")}${a.alerte.groupes.length ? `, ${a.alerte.groupes.length} groupe(s)` : ""}${a.alerte.elus.length ? `, ${a.alerte.elus.length} élu(s)` : ""}` : "–"}</td>
              <td className="meta">{dateHeure(a.subscribed_at)}</td>
              <td>{!a.unsubscribed_at && <button className="lien" onClick={() => desinscrire(a.email)}>Désinscrire</button>}</td>
            </tr>))}
          </tbody>
        </table></div>
        <Pagination page={page} total={data.total} parPage={data.par_page} onPage={setPage} />
      </>}
    </>
  );
}
