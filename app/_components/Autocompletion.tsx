"use client";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { suggererGroupes } from "@/lib/familles";
import { prenomNom } from "@/lib/format";

// Champ de saisie avec autocomplétion (combobox ARIA) : élus, groupes
// politiques (familles inter-chambres), recherche globale élus + collabs,
// ou collaborateurs seuls (association de fiche).

export type Option = { valeur: string; libelle: string; detail?: string; href?: string; image?: string; groupe?: string };
type EluCompact = { s: string; p: string; n: string; c: string; g: string; a: boolean; d: string };

const CHAMBRE_COURT: Record<string, string> = { assemblee: "AN", senat: "Sénat", europarl: "PE" };
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

let cacheElus: Promise<EluCompact[]> | null = null;
export function chargerElus(): Promise<EluCompact[]> {
  cacheElus ??= fetch("/api/elus").then((r) => (r.ok ? r.json() : [])).catch(() => []);
  return cacheElus;
}

export function filtrerElus(elus: EluCompact[], saisie: string, chambre?: string, max = 10): Option[] {
  const mots = norm(saisie).split(" ").filter(Boolean);
  if (!mots.length) return [];
  const res: { e: EluCompact; score: number }[] = [];
  for (const e of elus) {
    if (chambre && e.c !== chambre) continue;
    const toks = norm(`${e.p} ${e.n}`).split(" ");
    if (!mots.every((m) => toks.some((t) => t.startsWith(m)))) continue;
    res.push({ e, score: (e.a ? 2 : 0) + (norm(e.n).startsWith(mots[0]) ? 1 : 0) });
  }
  res.sort((a, b) => b.score - a.score || a.e.n.localeCompare(b.e.n, "fr"));
  return res.slice(0, max).map(({ e }) => ({
    valeur: e.s,
    libelle: prenomNom(e.p, e.n),
    detail: [CHAMBRE_COURT[e.c], e.g, e.d, e.a ? "" : "ancien mandat"].filter(Boolean).join(" · "),
    href: `/parlementaires/${encodeURIComponent(e.s)}`,
  }));
}

type Props = {
  id?: string;
  source: "elus" | "groupes" | "global" | "collabs";
  chambre?: string;
  placeholder?: string;
  valeurInitiale?: string;
  onChoix?: (o: Option | null) => void; // null : saisie effacée
  navigation?: boolean; // ouvrir la fiche au choix (recherche globale)
  ariaLabel?: string;
  outil?: string; // « vigiparl » | « mixiparl » : les élus pointent vers leur page d'indicateurs
};

export default function Autocompletion({ id, source, chambre, placeholder, valeurInitiale = "", onChoix, navigation, ariaLabel, outil }: Props) {
  const auto = useId();
  const idListe = `${id ?? auto}-liste`;
  const [saisie, setSaisie] = useState(valeurInitiale);
  const [options, setOptions] = useState<Option[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const [elus, setElus] = useState<EluCompact[]>([]);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (source === "elus") chargerElus().then(setElus); }, [source]);
  useEffect(() => { setSaisie(valeurInitiale); }, [valeurInitiale]);

  const locales = useMemo(() => {
    if (source === "elus") return filtrerElus(elus, saisie, chambre);
    if (source === "groupes") return suggererGroupes(saisie, 12).map((s) => ({ valeur: s.valeur, libelle: s.libelle, detail: s.detail }));
    return null;
  }, [source, elus, saisie, chambre]);

  useEffect(() => {
    if (locales) { setOptions(locales); return; }
    if (minuteur.current) clearTimeout(minuteur.current);
    if (norm(saisie).length < 2) { setOptions([]); return; }
    minuteur.current = setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(saisie)}&limit=${source === "collabs" ? 20 : 8}`).catch(() => null);
      const d = r?.ok ? await r.json() : { resultats: [] };
      let res = (d.resultats ?? []) as Option[];
      // Association de fiche : uniquement des collaborateurs.
      if (source === "collabs") res = res.filter((o) => o.valeur.startsWith("collab:"));
      // Sur les pages d'indicateurs (VigiParl'/MixiParl'), un élu proposé
      // ouvre sa page d'indicateurs, pas sa fiche.
      setOptions(res.map((o) =>
        outil && typeof o.href === "string" && o.href.startsWith("/parlementaires/")
          ? { ...o, href: `/${outil}/${o.href.slice("/parlementaires/".length)}`, detail: [o.detail, "indicateurs"].filter(Boolean).join(" · ") }
          : o,
      ));
    }, 200);
  }, [locales, saisie, source, outil]);

  function choisir(o: Option) {
    setSaisie(source === "groupes" ? o.valeur : o.libelle);
    setOuvert(false);
    setActif(-1);
    onChoix?.(o);
    if (navigation && o.href) window.location.href = o.href;
  }

  function clavier(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOuvert(true); setActif((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActif((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && ouvert && actif >= 0 && options[actif]) { e.preventDefault(); choisir(options[actif]); }
    else if (e.key === "Escape") setOuvert(false);
  }

  const visible = ouvert && options.length > 0;
  return (
    <div className="autocompletion">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={visible}
        aria-controls={idListe}
        aria-autocomplete="list"
        aria-activedescendant={actif >= 0 ? `${idListe}-${actif}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        placeholder={placeholder}
        value={saisie}
        onChange={(e) => { setSaisie(e.target.value); setOuvert(true); setActif(-1); if (!e.target.value) onChoix?.(null); }}
        onFocus={() => setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        onKeyDown={clavier}
      />
      {visible && (
        <ul id={idListe} role="listbox" className="suggestions">
          {options.map((o, i) => (
            <Fragment key={`${o.valeur}-${i}`}>
              {o.groupe && o.groupe !== options[i - 1]?.groupe && <li role="presentation" aria-hidden="true" className="suggestion-groupe">{o.groupe}</li>}
              <li id={`${idListe}-${i}`} role="option" aria-selected={i === actif} aria-label={o.groupe ? `${o.libelle}${o.detail ? `, ${o.detail}` : ""} (${o.groupe})` : undefined}
                onMouseDown={(e) => { e.preventDefault(); choisir(o); }} onMouseEnter={() => setActif(i)}>
                <span className="suggestion-libelle">{o.libelle}</span>
                {o.detail && <span className="suggestion-detail">{o.detail}</span>}
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
