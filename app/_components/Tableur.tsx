"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import BlocRetenir from "./BlocRetenir";

// DataParl' Sheets, tableur maison, sans serveur : la grille vit dans le
// navigateur (sauvegarde automatique en localStorage), les données de base
// viennent de l'API DataParl'. Formules inspirées des tableurs classiques :
// =SOMME(A2:A10), =MOYENNE(B2:B19), =MIN, =MAX, =NB, références et
// arithmétique (+ - * / ^, parenthèses). Logiciel libre, style MIT.
// Affichage : lignes zébrées, 25 lignes par page, bouton plein écran et
// recherche dans la grille (Ctrl+F). L'export CSV porte la source
// (dataparl.fr) et chaque téléchargement est journalisé (compte ou visiteur + IP).
// En lecture seule, la prop facultative « liens » rend certaines cellules
// cliquables (une par ligne de donnees) : la grille devient alors une
// navigation vers les fiches détaillées.

const LETTRES = (c: number): string => { let s = ""; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
const INDICE = (l: string): number => { let n = 0; for (const ch of l.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
const PAR_PAGE = 25;

// ── Évaluateur de formules (recursive descent) ────────────────────────────
type Tok = { t: "num" | "ref" | "fn" | "op"; v: string };
// Motifs construits sans antislash littéral dans ce fichier (compatibilité push).
const BS = String.fromCharCode(92);
const RC = String.fromCharCode(13, 10);
const BOM = String.fromCharCode(0xfeff);
const RX_TOK = "=" + BS + "|" + BS + "d+(?:" + BS + "." + BS + "d+)?|[A-Za-z_]+[A-Za-z0-9_]*|[" + BS + "+" + BS + "-" + BS + "*/^();:]|" + BS + "s+";
const RX_ESPACES = "^" + BS + "s+$";
const RX_NUM = "^" + BS + "d";
const RX_LETTRE = "^[A-Za-z_]";
const RX_REF = "^([A-Za-z]+)(" + BS + "d+)$";
const TOK = new RegExp(RX_TOK, "y");
const ESPACES = new RegExp(RX_ESPACES);
const DEBUT_NUM = new RegExp(RX_NUM);
const DEBUT_LETTRE = new RegExp(RX_LETTRE);
const REF = new RegExp(RX_REF);

function lexer(f: string): Tok[] {
  const out: Tok[] = [];
  let i = 1; // saute le '='
  while (i < f.length) {
    TOK.lastIndex = i;
    const m = TOK.exec(f);
    if (!m) throw new Error("#ERREUR!");
    const s = m[0];
    i += s.length;
    if (ESPACES.test(s)) continue;
    if (DEBUT_NUM.test(s)) out.push({ t: "num", v: s });
    else if (DEBUT_LETTRE.test(s)) out.push(f[i] === "(" ? { t: "fn", v: s.toUpperCase() } : { t: "ref", v: s });
    else out.push({ t: "op", v: s });
  }
  return out;
}

function valeurCellule(grille: string[][], r: number, c: number, vus: Set<string>): number | string {
  if (r < 0 || c < 0 || r >= grille.length || c >= (grille[0]?.length ?? 0)) return 0;
  return evaluer(grille, r, c, vus);
}

export function evaluer(grille: string[][], r: number, c: number, vus: Set<string>): number | string {
  const cle = `${r}:${c}`;
  if (vus.has(cle)) return "#CYCLE!";
  const brut = (grille[r]?.[c] ?? "").trim();
  if (!brut.startsWith("=")) {
    const n = Number(brut.replace(",", "."));
    return brut !== "" && !Number.isNaN(n) ? n : brut;
  }
  vus.add(cle);
  let toks: Tok[];
  try { toks = lexer(brut); } catch { return "#ERREUR!"; }
  let p = 0;
  const peek = () => toks[p];
  const manger = (v: string) => { if (toks[p]?.v === v) { p++; return true; } return false; };

  const plageVals = (a: string, b: string): number[] => {
    const m1 = REF.exec(a), m2 = REF.exec(b);
    if (!m1 || !m2) throw new Error("#REF!");
    const c1 = INDICE(m1[1]), c2 = INDICE(m2[1]), r1 = +m1[2] - 1, r2 = +m2[2] - 1;
    const out: number[] = [];
    for (let rr = Math.min(r1, r2); rr <= Math.max(r1, r2); rr++)
      for (let cc = Math.min(c1, c2); cc <= Math.max(c1, c2); cc++) {
        const v = valeurCellule(grille, rr, cc, vus);
        if (typeof v === "number") out.push(v);
      }
    return out;
  };

  const est = (v: string) => toks[p]?.v === v;
  function expr(): number {
    let v = terme();
    while (est("+") || est("-")) { const op = toks[p].v; p++; const d = terme(); v = op === "+" ? v + d : v - d; }
    return v;
  }
  function terme(): number {
    let v = unaire();
    while (est("*") || est("/")) { const op = toks[p].v; p++; const d = unaire(); if (op === "/" && d === 0) throw new Error("#DIV/0!"); v = op === "*" ? v * d : v / d; }
    return v;
  }
  function unaire(): number {
    if (manger("-")) return -unaire();
    return puissance();
  }
  function puissance(): number {
    const b = primaire();
    if (manger("^")) return Math.pow(b, unaire());
    return b;
  }
  function primaire(): number {
    const t = peek();
    if (!t) throw new Error("#ERREUR!");
    if (t.t === "num") { p++; return Number(t.v); }
    if (t.t === "ref") {
      p++;
      if (peek()?.v === ":") { p++; const fin = toks[p++]; const vals = plageVals(t.v, fin.v); return vals[0] ?? 0; }
      const m = REF.exec(t.v);
      if (!m) throw new Error("#NOM?");
      const v = valeurCellule(grille, +m[2] - 1, INDICE(m[1]), vus);
      if (typeof v === "number") return v;
      throw new Error("#VALEUR!");
    }
    if (t.t === "fn") {
      p++;
      if (!manger("(")) throw new Error("#ERREUR!");
      const args: number[][] = [];
      if (peek()?.v !== ")") {
        // une plage entière ?
        if (peek()?.t === "ref" && toks[p + 1]?.v === ":") {
          const a = toks[p].v; p += 2; const b = toks[p++].v;
          if (peek()?.v === ";") { p++; args.push(plageVals(a, b), exprListe()); } else args.push(plageVals(a, b));
        } else args.push(exprListe());
      }
      if (!manger(")")) throw new Error("#ERREUR!");
      const plats = args.flat();
      switch (t.v) {
        case "SOMME": case "SUM": return plats.reduce((a, b) => a + b, 0);
        case "MOYENNE": case "AVERAGE": return plats.length ? plats.reduce((a, b) => a + b, 0) / plats.length : 0;
        case "MIN": return plats.length ? Math.min(...plats) : 0;
        case "MAX": return plats.length ? Math.max(...plats) : 0;
        case "NB": case "COUNT": return plats.length;
        default: throw new Error("#NOM?");
      }
    }
    if (t.v === "(") { p++; const v = expr(); if (!manger(")")) throw new Error("#ERREUR!"); return v; }
    throw new Error("#ERREUR!");
  }
  function exprListe(): number[] {
    const out: number[] = [];
    for (;;) {
      const t = peek();
      if (t?.t === "ref" && toks[p + 1]?.v === ":") { const a = toks[p].v; p += 2; const b = toks[p++].v; out.push(...plageVals(a, b)); }
      else { const v = expr(); if (typeof v === "number") out.push(v); }
      if (!manger(";")) break;
    }
    return out;
  }

  try {
    const v = expr();
    if (p < toks.length) throw new Error("#ERREUR!");
    return v;
  } catch (e) {
    return (e as Error).message.startsWith("#") ? (e as Error).message : "#ERREUR!";
  } finally {
    vus.delete(cle);
  }
}

// ── Composant ─────────────────────────────────────────────────────────────
type Props = {
  id: string;
  titre: string;
  description: string;
  provenance: string;
  entetes: string[];
  donnees: (string | number | null)[][];
  lectureSeule?: boolean;
  // Liens par cellule, alignés sur donnees (ligne à ligne) : en lecture
  // seule, la cellule devient un lien cliquable vers une fiche DataParl'.
  liens?: (string | null)[][];
};

export default function Tableur({ id, provenance, entetes, donnees, lectureSeule = false, liens }: Props) {
  const CLE = `dp-sheets-${id}`;
  const initiales = useMemo(() => {
    const g: string[][] = [entetes.map(String), ...donnees.map((l) => l.map((v) => (v === null || v === undefined ? "" : String(v))))];
    const cols = entetes.length + 2;
    const lignes = Math.min(g.length + 15, 520);
    return Array.from({ length: lignes }, (_, r) => Array.from({ length: cols }, (_, c) => g[r]?.[c] ?? ""));
  }, [entetes, donnees]);

  const [grille, setGrille] = useState<string[][]>(initiales);
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 1, c: 0 });
  const [edition, setEdition] = useState("");
  const [charge, setCharge] = useState(false);
  const [page, setPage] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [plein, setPlein] = useState(false);
  const [exporte, setExporte] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const champRecherche = useRef<HTMLInputElement>(null);

  // Restaurer les modifications sauvegardées (une seule fois, hors lecture seule).
  useEffect(() => {
    if (lectureSeule) { setCharge(true); return; }
    try {
      const sauve = localStorage.getItem(CLE);
      if (sauve) { const g = JSON.parse(sauve) as string[][]; if (Array.isArray(g) && g.length) setGrille(g); }
    } catch {}
    setCharge(true);
  }, [CLE, lectureSeule]);
  // Sauvegarde automatique (jamais en lecture seule).
  useEffect(() => { if (charge && !lectureSeule) { try { localStorage.setItem(CLE, JSON.stringify(grille)); } catch {} } }, [grille, charge, CLE, lectureSeule]);

  // Grille calculée (une passe, mémo par évaluation).
  const calculee = useMemo(() => grille.map((ligne, r) => ligne.map((_, c) => evaluer(grille, r, c, new Set()))), [grille]);

  const pages = Math.max(1, Math.ceil(grille.length / PAR_PAGE));
  useEffect(() => { if (page > pages - 1) setPage(0); }, [pages, page]);

  // Ctrl+F (et Cmd+F) : la recherche du navigateur cède la place à la
  // recherche dans la grille, champ dédié dans la barre du tableur.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        champRecherche.current?.focus();
        champRecherche.current?.select();
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, []);

  // État du plein écran (bouton + Échap pour sortir).
  useEffect(() => {
    const maj = () => setPlein(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", maj);
    return () => document.removeEventListener("fullscreenchange", maj);
  }, []);

  function pleinEcran() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else zone.current?.requestFullscreen?.().catch(() => {});
  }

  const choisir = useCallback((r: number, c: number) => {
    if (!lectureSeule) setGrille((g) => { const n = [...g]; n[sel.r] = [...n[sel.r]]; n[sel.r][sel.c] = edition; return n; });
    setSel({ r, c });
    setEdition(grille[r]?.[c] ?? "");
    setPage(Math.floor(r / PAR_PAGE));
  }, [grille, sel, edition, lectureSeule]);

  const deplacer = useCallback((dr: number, dc: number) => {
    const r = Math.max(0, Math.min(grille.length - 1, sel.r + dr));
    const c = Math.max(0, Math.min(grille[0].length - 1, sel.c + dc));
    choisir(r, c);
  }, [grille, sel, choisir]);

  const poser = useCallback((v: string) => {
    setGrille((g) => { const n = [...g]; n[sel.r] = [...n[sel.r]]; n[sel.r][sel.c] = v; return n; });
  }, [sel]);

  const reinitialiser = () => { if (confirm("Revenir aux données DataParl' (l'API) et perdre les modifications ?")) { localStorage.removeItem(CLE); setGrille(initiales); setEdition(""); } };

  // En lecture seule, aucune saisie ne peut partir : les touches d'édition sont sans effet.

  // Recherche dans la grille : cellules dont la valeur affichée contient le
  // texte (sans casse ni accents). Entrée : résultat suivant, en boucle.
  const DIACRITIQUES = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g");
  const norm = (s: string) => s.normalize("NFD").replace(DIACRITIQUES, "").toLowerCase();
  const resultats = useMemo(() => {
    const q = norm(recherche.trim());
    if (q.length < 2) return [] as { r: number; c: number }[];
    const out: { r: number; c: number }[] = [];
    calculee.forEach((ligne, r) => ligne.forEach((v, c) => {
      if (norm(String(v)).includes(q)) out.push({ r, c });
    }));
    return out;
  }, [recherche, calculee]);

  const rechercheRef = useRef(-1);
  function resultatSuivant() {
    if (resultats.length === 0) return;
    rechercheRef.current = resultats.findIndex((m) => m.r > sel.r || (m.r === sel.r && m.c > sel.c));
    if (rechercheRef.current === -1) rechercheRef.current = 0;
    const m = resultats[rechercheRef.current];
    choisir(m.r, m.c);
  }

  function exporterCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const nombres = (v: number | string) => typeof v === "number" ? String(v).replace(".", ",") : esc(v);
    const csv = [grille.map((l, r) => l.map((_, c) => (r === 0 ? esc(String(calculee[r][c])) : nombres(calculee[r][c]))).join(";")).join(RC)].join(RC);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([BOM + csv], { type: "text/csv;charset=utf-8" }));
    // La source voyage avec le fichier : nom « dataparl.fr-<feuille>.csv ».
    a.download = `dataparl.fr-${id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExporte(true);
    // Journal du téléchargement (compte ou visiteur anonyme, + IP), côté serveur.
    sessionActuelle().then((s) => {
      fetch("/api/sheets/telechargement", {
        method: "POST",
        headers: { ...(s ? { Authorization: `Bearer ${s.access_token}` } : {}), "Content-Type": "application/json" },
        body: JSON.stringify({ feuille: id, lignes: grille.length }),
      }).catch(() => {});
    });
  }

  const aff = (v: number | string) => {
    if (typeof v === "number") return Math.abs(v % 1) > 1e-9 ? v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : v.toLocaleString("fr-FR");
    return v;
  };

  const premiere = page * PAR_PAGE;
  const lignesVisibles = grille.slice(premiere, premiere + PAR_PAGE);

  return (
    <div className="tableur-zone" ref={zone}>
      <p className="meta">Données de base : {provenance}. Licence ODbL.</p>

      <div className="tableur-barre">
        <span className="mono ref-active">{LETTRES(sel.c)}{sel.r + 1}</span>
        <input className="formule" type="text" value={edition} aria-label="Contenu de la cellule" readOnly={lectureSeule}
          placeholder="Valeur ou formule, ex. =SOMME(A2:A19)"
          onChange={(e) => { setEdition(e.target.value); poser(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); deplacer(1, 0); } }} />
        <input ref={champRecherche} className="recherche-grille" type="search" value={recherche}
          aria-label="Rechercher dans le tableau (Ctrl+F)" placeholder="Rechercher (Ctrl+F)…"
          onChange={(e) => { setRecherche(e.target.value); rechercheRef.current = -1; }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); resultatSuivant(); } }} />
        {recherche.trim().length >= 2 && <span className="meta">{resultats.length} résultat(s)</span>}
        {!lectureSeule && <button className="secondaire" onClick={reinitialiser}>Réinitialiser</button>}
        <button className="secondaire" onClick={exporterCsv}>Exporter (CSV)</button>
        <button className="secondaire" onClick={pleinEcran} aria-pressed={plein}>{plein ? "Quitter le plein écran" : "Plein écran"}</button>
      </div>

      <div className="defile grille-feuille" tabIndex={0}
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).tagName === "INPUT") return;
          const fleches: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
          if (fleches[e.key]) { e.preventDefault(); deplacer(...fleches[e.key]); }
          if (!lectureSeule && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); poser(""); setEdition(""); }
        }}>
        <table className="feuille-grille">
          <thead>
            <tr>
              <th className="coin"></th>
              {grille[0].map((_, c) => <th key={c} className={c === sel.c ? "col-active" : ""}>{LETTRES(c)}</th>)}
            </tr>
          </thead>
          <tbody>
            {lignesVisibles.map((ligne, i) => {
              const r = premiere + i;
              return (
                <tr key={r}>
                  <th className={r === sel.r ? "row-active" : ""}>{r + 1}</th>
                  {ligne.map((_, c) => {
                    const actif = r === sel.r && c === sel.c;
                    const v = calculee[r][c];
                    const saisie = actif && !lectureSeule;
                    const trouve = recherche.trim().length >= 2 && resultats.some((m) => m.r === r && m.c === c);
                    const lien = lectureSeule ? (liens?.[r - 1]?.[c] ?? null) : null;
                    return (
                      <td key={c} className={actif ? "cell-active" : trouve ? "cell-trouvee" : ""} onClick={() => choisir(r, c)}>
                        {saisie ? (
                          <input type="text" autoFocus value={edition}
                            onChange={(e) => { setEdition(e.target.value); poser(e.target.value); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); deplacer(1, 0); }
                              if (e.key === "Tab") { e.preventDefault(); (e.target as HTMLInputElement).blur(); deplacer(0, e.shiftKey ? -1 : 1); }
                            }} />
                        ) : (
                          r === 0 ? <strong>{String(v)}</strong> : lien ? <a href={lien}>{aff(v)}</a> : <span>{aff(v)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="tableur-pages" aria-label="Pagination de la feuille">
        <button className="lien" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Précédente</button>
        <span className="meta">Page {page + 1} / {pages}, {grille.length} lignes</span>
        <button className="lien" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>Suivante →</button>
      </div>

      <p className="meta">
        {lectureSeule
          ? "Feuille en lecture seule : seule l'équipe DataParl' peut modifier une grille. Les données peuvent être exportées en CSV (source dataparl.fr)."
          : "Formules : =SOMME(A2:A19), =MOYENNE(B2:B19), =MIN, =MAX, =NB, références (=B2*2), opérations + - * / ^. Ligne 1 : en-têtes. Les modifications sont conservées dans le navigateur de l'équipe."}
      </p>

      {/* Rétention : l'export réussi est LE moment de forte valeur : proposer
          les alertes email juste après (inscription newsletter incluse). */}
      {exporte && <BlocRetenir compact />}
    </div>
  );
}
