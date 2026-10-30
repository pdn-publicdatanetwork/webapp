"use client";

import { useState } from "react";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";

// Parcours d'un compte : quelles pages il a consultées (90 derniers jours),
// pour comprendre son usage du site et l'améliorer. Module Journal, réservé
// aux administrateurs.

type Compte = { id: string; email: string; nom: string | null; derniere_connexion: string | null };
type Ligne = { cle: string; n: number };
type Parcours = {
  compte: Compte; total: number;
  pages: Ligne[]; jours: Ligne[];
  parcours: { le: string; chemin: string }[];
};

function Repartition({ titre, lignes }: { titre: string; lignes: Ligne[] }) {
  const max = Math.max(1, ...lignes.map((l) => l.n));
  return (
    <div>
      <h3>{titre}</h3>
      {lignes.length === 0 ? <p className="meta">Aucune page vue sur les 90 derniers jours.</p> : (
        <table className="stats"><tbody>{lignes.map((l) => (
          <tr key={l.cle}>
            <td className="mono" style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis" }}>{l.cle}</td>
            <td className="num">{l.n}</td>
            <td style={{ width: "40%" }}><div className="barre"><span style={{ width: `${(l.n / max) * 100}%`, background: "var(--bleu)" }} /></div></td>
          </tr>
        ))}</tbody></table>
      )}
    </div>
  );
}

export default function ParcoursCompte() {
  const [saisie, setSaisie] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const { data, err } = useRessource<Parcours>(email ? "/api/admin/journal/parcours" : "/api/admin/journal/parcours", email ? { email } : undefined);

  return (
    <>
      <h1>Parcours d&apos;un compte</h1>
      <p className="meta">
        Les pages consultées par un compte précis (90 derniers jours), pour comprendre son usage du site et l&apos;améliorer. Saisissez l&apos;email du compte.
      </p>
      <form className="card" style={{ maxWidth: 560 }} onSubmit={(e) => { e.preventDefault(); setEmail(saisie.trim().toLowerCase() || null); }}>
        <label htmlFor="email">Email du compte</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="email" type="email" required value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="prenom.nom@exemple.fr" style={{ flex: 1 }} />
          <button type="submit">Voir</button>
        </div>
      </form>
      {err && <p className="erreur">{err}</p>}
      {data && (
        <>
          <h2>{data.compte.nom || data.compte.email}</h2>
          <p className="meta">
            {data.compte.email}, {data.total} page(s) vue(s) sur 90 jours
            {data.compte.derniere_connexion ? <>, dernière connexion {dateHeure(data.compte.derniere_connexion)}</> : null}
          </p>
          <div className="deux-colonnes">
            <Repartition titre="Pages les plus consultées" lignes={data.pages} />
            <Repartition titre="Par jour" lignes={data.jours.sort((a, b) => a.cle.localeCompare(b.cle))} />
          </div>
          <h3>Chronologie (200 plus récentes)</h3>
          <div className="defile"><table className="stats">
            <thead><tr><th>Quand</th><th>Page</th></tr></thead>
            <tbody>{data.parcours.map((v, i) => (
              <tr key={i}><td className="meta">{dateHeure(v.le)}</td><td className="mono">{v.chemin}</td></tr>
            ))}</tbody>
          </table></div>
        </>
      )}
    </>
  );
}
