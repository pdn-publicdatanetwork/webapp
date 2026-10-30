"use client";
import Link from "next/link";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";

type Visiteur = { visiteur: string; pages: number; premiere: string; derniere: string; ip: string | null; chemins: string[] };

export default function VisiteursAnonymes() {
  const { data, err } = useRessource<{ total: number; visiteurs: Visiteur[] }>("/api/admin/anon");
  return (
    <>
      <h1>Visiteurs sans compte</h1>
      <p className="meta"><Link href="/admin/users">← Comptes</Link>, parcours des visiteurs anonymes ayant consenti à la mesure d'audience (90 jours).</p>
      {err && <p className="erreur">{err}</p>}
      {data && <>
        <p className="meta">{data.total} visiteur(s) récent(s)</p>
        <div className="defile"><table className="stats">
          <thead><tr><th>Visiteur</th><th>Pages vues</th><th>Dernière activité</th><th>Première visite</th><th>IP</th><th>Pages principales</th></tr></thead>
          <tbody>{data.visiteurs.map((v) => (
            <tr key={v.visiteur}>
              <td><Link href={`/admin/users/anon/${v.visiteur}`}>{v.visiteur.slice(0, 8)}…</Link></td>
              <td className="meta">{v.pages}</td>
              <td className="meta">{dateHeure(v.derniere)}</td>
              <td className="meta">{dateHeure(v.premiere)}</td>
              <td className="meta">{v.ip ?? "–"}</td>
              <td className="meta">{v.chemins.join(", ")}</td>
            </tr>))}
          </tbody>
        </table></div>
      </>}
    </>
  );
}