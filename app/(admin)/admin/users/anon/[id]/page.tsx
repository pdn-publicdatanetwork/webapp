"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";

type Vue = { id: number; chemin: string; origine: string | null; ip: string | null; user_agent: string | null; le: string };

export default function VisiteurAnonyme() {
  const params = useParams() as { id?: string };
  const { data, err } = useRessource<{ visiteur: string; vues: Vue[] }>("/api/admin/anon", { id: params?.id });
  return (
    <>
      <h1>Visiteur {params?.id?.slice(0, 8)}…</h1>
      <p className="meta"><Link href="/admin/users/anon">← Tous les visiteurs sans compte</Link></p>
      {err && <p className="erreur">{err}</p>}
      {data && <>
        <p className="meta">{data.vues.length} page(s) suivie(s) sur les 90 derniers jours (1000 max affichées)</p>
        <div className="defile"><table className="stats">
          <thead><tr><th>Quand</th><th>Page</th><th>Venant de</th><th>IP</th><th>User-agent</th></tr></thead>
          <tbody>{data.vues.map((v) => (
            <tr key={v.id}>
              <td className="meta">{dateHeure(v.le)}</td>
              <td><Link href={v.chemin}>{v.chemin}</Link></td>
              <td className="meta">{v.origine ? (/^\//.test(v.origine) ? <Link href={v.origine}>{v.origine}</Link> : v.origine) : "–"}</td>
              <td className="meta">{v.ip ?? "–"}</td>
              <td className="meta">{v.user_agent ?? "–"}</td>
            </tr>))}
          </tbody>
        </table></div>
      </>}
    </>
  );
}