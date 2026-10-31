"use client";

import { useMemo, useState, type ReactNode } from "react";

// Liste interactive de collaborateurs d'une chambre : recherche instantanée,
// filtre par initiale, tri par colonne, groupement par élu et pagination.
// Deux rendus : tableau (listes) ou cartes avec initiales (trombinoscopes).
// Toutes les lignes sont rendues côté serveur puis filtrées dans le
// navigateur : la page reste indexable, l'interaction est immédiate.

export type LigneCollab = { nom: string; elu: string; fonction: string; href?: string };

const PAR_PAGE = 200;
const PAR_PAGE_ELUS = 50;

function sansAccentMin(s: string): string {
  return (s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function initiale(s: string): string {
  const n = sansAccentMin(s).trim();
  return n ? n[0].toUpperCase() : "#";
}

function Initiales({ nom }: { nom: string }) {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  const deux = ((mots[0]?.[0] ?? "") + (mots[1]?.[0] ?? "")).toUpperCase();
  return (
    <span aria-hidden style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 44, height: 44, borderRadius: 22, background: "#f3efe6",
      color: "#6b5d3f", fontWeight: 700, fontSize: 16, flexShrink: 0,
    }}>{deux}</span>
  );
}

export default function TableauCollabs({ rows, mode }: { rows: LigneCollab[]; mode: "table" | "trombi" }) {
  const [q, setQ] = useState("");
  const [lettre, setLettre] = useState<string | null>(null);
  const [tri, setTri] = useState<"nom" | "elu" | "fonction">("nom");
  const [groupeParElu, setGroupeParElu] = useState(false);
  const [page, setPage] = useState(1);

  const filt = useMemo(() => {
    const mots = sansAccentMin(q).split(/\s+/).filter(Boolean);
    if (!mots.length) return rows;
    return rows.filter((r) => {
      const c = sansAccentMin(r.nom + " " + r.elu + " " + r.fonction);
      return mots.every((m) => c.includes(m));
    });
  }, [rows, q]);

  const lettres = useMemo(() => [...new Set(rows.map((r) => initiale(r.nom)))].sort(), [rows]);

  const visibles = useMemo(() => {
    const out = lettre ? filt.filter((r) => initiale(r.nom) === lettre) : filt;
    return [...out].sort((a, b) => {
      if (tri === "elu") return a.elu.localeCompare(b.elu, "fr") || a.nom.localeCompare(b.nom, "fr");
      if (tri === "fonction") return (a.fonction ?? "").localeCompare(b.fonction ?? "", "fr") || a.nom.localeCompare(b.nom, "fr");
      return a.nom.localeCompare(b.nom, "fr");
    });
  }, [filt, lettre, tri]);

  const parElu = useMemo(() => {
    const m = new Map<string, LigneCollab[]>();
    for (const r of visibles) {
      const l = m.get(r.elu) ?? [];
      l.push(r);
      m.set(r.elu, l);
    }
    return [...m.entries()].map(([elu, lignes]) => ({ elu, lignes })).sort((a, b) => a.elu.localeCompare(b.elu, "fr"));
  }, [visibles]);

  const totalPages = Math.max(1, Math.ceil(groupeParElu ? parElu.length / PAR_PAGE_ELUS : visibles.length / PAR_PAGE));
  const pageOk = Math.min(page, totalPages);
  // Deux tranches typées séparément : groupes d'élus ou lignes plates.
  const trancheElus = groupeParElu
    ? parElu.slice((pageOk - 1) * PAR_PAGE_ELUS, pageOk * PAR_PAGE_ELUS)
    : null;
  const trancheLignes = groupeParElu
    ? null
    : visibles.slice((pageOk - 1) * PAR_PAGE, pageOk * PAR_PAGE);

  const reset = (f: () => void) => () => { f(); setPage(1); };
  const boutonTri = (colonne: "nom" | "elu" | "fonction", libelle: string): ReactNode => (
    <button type="button" onClick={reset(() => setTri(colonne))} style={{ all: "unset", cursor: "pointer", font: "inherit" }}>
      {libelle}{tri === colonne ? " ▾" : ""}
    </button>
  );

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "16px 0" }}>
        <input
          type="search" value={q} placeholder="Filtrer : nom, élu ou fonction…"
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          style={{ flex: "1 1 220px", minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid #d8d2c4", font: "inherit" }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, font: "inherit", fontSize: 14 }}>
          <input type="checkbox" checked={groupeParElu} onChange={(e) => { setGroupeParElu(e.target.checked); setPage(1); }} />
          Regrouper par élu
        </label>
        <span className="meta">{visibles.length.toLocaleString("fr-FR") + " collaborateur" + (visibles.length > 1 ? "s" : "") + (filt.length !== rows.length ? " (filtrés sur " + rows.length.toLocaleString("fr-FR") + ")" : "")}</span>
      </div>
      <p style={{ margin: "0 0 12px", display: "flex", flexWrap: "wrap", gap: 4 }}>
        <button type="button" onClick={reset(() => setLettre(null))}
          style={{ padding: "2px 8px", borderRadius: 6, border: lettre === null ? "1px solid #b7a777" : "1px solid #e3ddcd", background: lettre === null ? "#f6f1e3" : "transparent", cursor: "pointer", font: "inherit", fontSize: 13 }}>
          Tous
        </button>
        {lettres.map((l) => (
          <button key={l} type="button" onClick={reset(() => setLettre(l))}
            style={{ padding: "2px 8px", borderRadius: 6, border: lettre === l ? "1px solid #b7a777" : "1px solid #e3ddcd", background: lettre === l ? "#f6f1e3" : "transparent", cursor: "pointer", font: "inherit", fontSize: 13 }}>
            {l}
          </button>
        ))}
      </p>

      {trancheElus ? (
        trancheElus.map(({ elu, lignes }) => (
          <section key={elu} style={{ marginBottom: 20 }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17 }}>
              {elu}
              <span className="meta">{", " + lignes.length + " collaborateur" + (lignes.length > 1 ? "s" : "")}</span>
            </h3>
            {mode === "trombi" ? <Cartes lignes={lignes} /> : <Tableau lignes={lignes} tri={tri} boutonTri={boutonTri} />}
          </section>
        ))
      ) : mode === "trombi" ? (
        <Cartes lignes={trancheLignes ?? []} />
      ) : (
        <Tableau lignes={trancheLignes ?? []} tri={tri} boutonTri={boutonTri} />
      )}

      {totalPages > 1 && (
        <p className="meta" style={{ margin: "16px 0" }}>
          {"Page " + pageOk + " sur " + totalPages + ", "}
          {pageOk > 1 && <button type="button" onClick={() => setPage(pageOk - 1)} style={{ all: "unset", cursor: "pointer", color: "inherit", textDecoration: "underline" }}>précédente</button>}
          {pageOk > 1 && pageOk < totalPages ? " " : ""}
          {pageOk < totalPages && <button type="button" onClick={() => setPage(pageOk + 1)} style={{ all: "unset", cursor: "pointer", color: "inherit", textDecoration: "underline" }}>suivante</button>}
        </p>
      )}
    </>
  );
}

function Cartes({ lignes }: { lignes: LigneCollab[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "8px 0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8 }}>
      {lignes.map((r, i) => (
        <li key={r.nom + "-" + r.elu + "-" + i} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #e3e3e3", borderRadius: 10, padding: "8px 12px" }}>
          <Initiales nom={r.nom} />
          <span style={{ overflow: "hidden" }}>
            <strong style={{ display: "block" }}>
              {r.href ? <a href={r.href} style={{ color: "inherit", textDecoration: "none" }}>{r.nom}</a> : r.nom}
            </strong>
            <span className="meta">{"Collaborateur de " + r.elu}</span>
            {r.fonction && <span className="meta" style={{ display: "block" }}>{r.fonction}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Tableau({ lignes, tri, boutonTri }: { lignes: LigneCollab[]; tri: string; boutonTri: (c: "nom" | "elu" | "fonction", l: string) => ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="stats">
        <thead>
          <tr>
            <th>{boutonTri("nom", "Collaborateur")}</th>
            <th>{boutonTri("elu", "Élu employeur")}</th>
            <th>{boutonTri("fonction", "Fonction")}</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((r, i) => (
            <tr key={r.nom + "-" + r.elu + "-" + i}>
              <td>{r.href ? <a href={r.href} style={{ color: "inherit" }}>{r.nom}</a> : r.nom}</td>
              <td>{r.elu}</td>
              <td>{r.fonction || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
