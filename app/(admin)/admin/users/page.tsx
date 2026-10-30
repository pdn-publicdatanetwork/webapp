"use client";
import Link from "next/link";
import { useState } from "react";
import { LIBELLE_ROLE } from "@/app/_components/admin/EnTete";
import type { Role } from "@/app/_components/admin/Porte";
import { libellesFournisseurs } from "@/app/_components/admin/fournisseurs";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";
import Pagination from "@/app/_components/admin/Pagination";

type Compte = { id: string; email: string; nom: string; cree_le: string; derniere_connexion: string | null; fournisseurs: string[]; equipe: Role | null; alerte: { active: boolean; frequence: string } | null };

export default function Comptes() {
  const [page, setPage] = useState(0);
  const { data, err } = useRessource<{ total: number; par_page: number; comptes: Compte[] }>("/api/admin/users", { page });
  return (
    <>
      <h1>Comptes utilisateurs</h1>
      <p className="meta">Les personnes qui ont un compte sur dataparl.fr : ce sont les destinataires possibles d&apos;un mailing. Cliquer sur un compte pour voir toutes ses requêtes.</p>
      {err && <p className="erreur">{err}</p>}
      {data && <>
        <p className="meta">{data.total} compte(s)</p>
        <div className="defile"><table className="stats">
          <thead><tr><th>Nom</th><th>Email</th><th>Connexion</th><th>Alertes</th><th>Créé</th><th>Dernière connexion</th></tr></thead>
          <tbody>{data.comptes.map((c) => (
            <tr key={c.id}>
              <td>{c.nom || <span className="meta">–</span>}</td>
              <td><Link href={`/admin/users/${c.id}`}>{c.email}</Link>{c.equipe && <> <span className={`badge-role ${c.equipe}`}>{LIBELLE_ROLE[c.equipe]}</span></>}</td>
              <td className="meta">{libellesFournisseurs(c.fournisseurs).join(", ") || "–"}</td>
              <td className="meta">{c.alerte ? `${c.alerte.active ? "" : "(inactive) "}${c.alerte.frequence === "hebdomadaire" ? "Weekly" : "Daily"}` : "–"}</td>
              <td className="meta">{dateHeure(c.cree_le)}</td><td className="meta">{dateHeure(c.derniere_connexion)}</td>
            </tr>
          ))}</tbody>
        </table></div>
        <Pagination page={page} total={data.total} parPage={data.par_page} onPage={setPage} />
      </>}
    </>
  );
}
