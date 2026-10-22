"use client";
import { useState } from "react";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";

type Vue = { id: number; le: string; chemin: string; ip: string | null; user_agent: string | null; referer: string | null };
type Reponse = { total: number; parJour: { cle: string; n: number }[]; parIp: { cle: string; n: number }[]; vues: Vue[] };

// Journal des vues des pages mentionnant les canaux WhatsApp et Telegram :
// chaque consultation (connectée ou anonyme), avec l'heure, l'adresse IP, le
// navigateur et la page d'origine. Conservation 13 mois (durée CNIL).

export default function VuesReseaux() {
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const { data, err } = useRessource<Reponse>("/api/admin/journal/vues-reseaux", { chemin: recherche });

  return (
    <>
      <h1>Vues des pages WhatsApp / Telegram</h1>
      <p className="meta">Chaque consultation des pages mentionnant les canaux (Daily, à propos, chat, désinscription WhatsApp, CGU du bot Telegram) : heure, adresse IP, navigateur et provenance. Connectés comme anonymes. 500 plus récentes, conservation 13 mois.</p>
      <form onSubmit={(e) => { e.preventDefault(); setRecherche(q); }} className="barre-recherche">
        <input type="text" placeholder="Filtrer par page (ex. /daily)" value={q} onChange={(e) => setQ(e.target.value)} />
        <button>Filtrer</button>
      </form>
      {err && <p className="erreur">{err}</p>}
      {data && <>
        <p className="meta">{data.total.toLocaleString("fr-FR")} vue(s) au total — par jour : {data.parJour.slice(0, 7).map((j) => `${j.cle} (${j.n})`).join(", ") || "–"}</p>
        <p className="meta">IP les plus fréquentes : {data.parIp.slice(0, 5).map((i) => `${i.cle} (${i.n}×)`).join(", ") || "–"}</p>
        <div className="defile"><table className="stats">
          <thead><tr><th>Quand</th><th>Page</th><th>IP</th><th>Provenance</th><th>Navigateur</th></tr></thead>
          <tbody>{data.vues.map((v) => (
            <tr key={v.id}>
              <td className="meta">{dateHeure(v.le)}</td>
              <td><strong>{v.chemin}</strong></td>
              <td className="mono meta">{v.ip || "–"}</td>
              <td className="meta">{(v.referer || "–").replace(/^https?:\/\//, "").slice(0, 60)}</td>
              <td className="meta">{(v.user_agent || "–").slice(0, 60)}</td>
            </tr>))}
          </tbody>
        </table></div>
      </>}
    </>
  );
}
