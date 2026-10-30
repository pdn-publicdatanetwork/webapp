"use client";
import { useMemo, useState } from "react";

// Recherche d'un élu dans un classement : on tape un nom, ses chiffres
// s'affichent (pas de liste complète à l'écran).
export type LigneElu = { nom: string; groupe: string; href: string; rang?: number; valeurs: string[] };

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export default function RechercheStatElu({ id, lignes, colonnes, placeholder }: { id: string; lignes: LigneElu[]; colonnes: string[]; placeholder: string }) {
  const [q, setQ] = useState("");
  const index = useMemo(() => lignes.map((l) => ({ l, t: norm(l.nom).split(" ") })), [lignes]);
  const mots = norm(q).split(" ").filter(Boolean);
  const trouves = mots.length && norm(q).length >= 2
    ? index.filter(({ t }) => mots.every((m) => t.some((x) => x.startsWith(m)))).slice(0, 8).map((x) => x.l)
    : [];
  return (
    <div className="recherche-stat">
      <label htmlFor={id} className="sr-only">{placeholder}</label>
      <input id={id} type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoComplete="off" />
      <div aria-live="polite">
        {norm(q).length >= 2 && trouves.length === 0 && <p className="meta">Aucun élu trouvé pour « {q} ».</p>}
        {trouves.length > 0 && (
          <div className="defile">
            <table className="stats">
              <thead><tr><th>Élu</th><th>Groupe</th>{colonnes.map((c) => <th key={c} className="num">{c}</th>)}</tr></thead>
              <tbody>{trouves.map((l) => (
                <tr key={l.href}><td><a href={l.href}>{l.nom}</a>{l.rang ? <span className="meta">, {l.rang}{l.rang === 1 ? "er" : "e"}</span> : null}</td><td>{l.groupe}</td>
                  {l.valeurs.map((v, i) => <td key={i} className="num">{v}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
