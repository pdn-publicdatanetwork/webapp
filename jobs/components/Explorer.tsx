"use client";
import { useMemo, useState } from "react";
import ModalOffre from "@/components/ModalOffre";
import { CHAMBRES, type Chambre } from "@/lib/jobs";
import { CHAMBRE_NOM, CONTRATS, dateFr, extrait, ilYA, nomElu, titrePoste, typeContrat } from "@/lib/jobsTexte";
import type { OffreListe } from "@/lib/types";

// Exploration des offres : recherche centrale, filtres sidebar avec
// compteurs, pills de raccourci, cartes maquette et modal de détail.

type Source = "toutes" | "proposition" | "collecte";
type Tri = "recentes" | "anciennes";

const PASTILLE_CHAMBRE: Record<string, string> = { senat: "🏛️", an: "🇫🇷", pe: "🇪🇺" };

export default function Explorer({ offres }: { offres: OffreListe[] }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState<Source>("toutes");
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [contrats, setContrats] = useState<string[]>([]);
  const [tri, setTri] = useState<Tri>("recentes");
  const [ouverte, setOuverte] = useState<OffreListe | null>(null);

  const bascule = <T,>(liste: T[], valeur: T, set: (l: T[]) => void) =>
    set(liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur]);

  const compteChambres = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of offres) if (o.chambre) m[o.chambre] = (m[o.chambre] ?? 0) + 1;
    return m;
  }, [offres]);

  const compteContrats = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of offres) {
      const c = typeContrat(o);
      m[c] = (m[c] ?? 0) + 1;
    }
    return m;
  }, [offres]);

  const filtrees = useMemo(() => {
    const req = q.toLowerCase().trim();
    const res = offres.filter((o) => {
      const texte = (o.titre + " " + (o.description ?? "") + " " + nomElu(o) + " " + (o.groupe_politique ?? "") + " " + (o.localisation ?? "")).toLowerCase();
      const okQ = !req || texte.includes(req);
      const okSource = source === "toutes" || o.source_connector === source;
      const okChambre = chambres.length === 0 || (o.chambre && chambres.includes(o.chambre as Chambre));
      const okContrat = contrats.length === 0 || contrats.includes(typeContrat(o));
      return okQ && okSource && okChambre && okContrat;
    });
    res.sort((a, b) => (b.publie_le ?? "").localeCompare(a.publie_le ?? ""));
    if (tri === "anciennes") res.reverse();
    return res;
  }, [offres, q, source, chambres, contrats, tri]);

  const reinitialiser = () => {
    setQ("");
    setSource("toutes");
    setChambres([]);
    setContrats([]);
    setTri("recentes");
  };

  const elusUniques = new Set(offres.map((o) => o.parlementaire_slug ?? nomElu(o) ?? o.id)).size;
  const deptsUniques = new Set(offres.map((o) => o.departement).filter(Boolean)).size;

  const pill = (label: string, actif: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border font-medium text-xs sm:text-sm transition-colors ${
        actif
          ? "bg-[#4E2E53] text-white border-[#4E2E53]"
          : "bg-slate-100 text-slate-700 border-slate-200/60 hover:bg-[#E4BDE9]/50 hover:text-[#4E2E53]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#4E2E53] leading-tight">
            Travailler au <span className="bg-[#E4BDE9] px-2 py-0.5 rounded-lg inline-block">Parlement</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#6C84B0] leading-relaxed">
            Toutes les offres de collaborateur parlementaire : Assemblée nationale, Sénat, Parlement européen.
            Collectées sur les sources officielles ou déposées directement par les élus. Gratuit et sans publicité.
          </p>
        </div>

        {/* Recherche */}
        <div className="mt-8 relative max-w-4xl">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">🔍</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un poste, un député, un sénateur, une compétence (ex : communication, loi, Paris)..."
            className="w-full pl-12 pr-28 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4E2E53] focus:bg-white text-sm sm:text-base shadow-inner"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 px-2.5 py-1.5 rounded-lg"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <span className="text-slate-500 font-medium mr-1">Suggestions :</span>
          {CHAMBRES.map((c) => pill(PASTILLE_CHAMBRE[c.valeur] + " " + c.libelle, chambres.includes(c.valeur), () => bascule(chambres, c.valeur, setChambres)))}
          {CONTRATS.filter((c) => c !== "Alternance").map((c) =>
            pill((c === "Stage" ? "🎓 " : c === "CDI" ? "💼 " : "📄 ") + c, contrats.includes(c), () => bascule(contrats, c, setContrats))
          )}
        </div>

        {/* KPI */}
        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 text-center sm:text-left max-w-2xl">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#4E2E53]">{offres.length}</div>
            <div className="text-xs sm:text-sm text-[#6C84B0] font-medium">Offres actives</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#4E2E53]">{elusUniques}</div>
            <div className="text-xs sm:text-sm text-[#6C84B0] font-medium">Élus concernés</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-[#4E2E53]">{deptsUniques}</div>
            <div className="text-xs sm:text-sm text-[#6C84B0] font-medium">Départements</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* SIDEBAR */}
        <aside className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-6 lg:sticky lg:top-28">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-bold text-[#4E2E53] text-sm">🎛️ Filtres</h2>
            <button onClick={reinitialiser} className="text-xs text-[#6C84B0] underline hover:text-[#4E2E53]">
              Réinitialiser
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400">Origine</span>
            {([
              ["toutes", "Toutes les sources"],
              ["proposition", "✨ Déposée par l'élu"],
              ["collecte", "Collectée"],
            ] as [Source, string][]).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-[#4E2E53]">
                <input type="radio" name="source" checked={source === v} onChange={() => setSource(v)} className="text-[#4E2E53] focus:ring-[#4E2E53]" />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2 text-xs pt-4 border-t border-slate-100">
            <span className="font-bold uppercase tracking-wider text-slate-400">Chambre</span>
            {CHAMBRES.map((c) => (
              <label key={c.valeur} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-[#4E2E53]">
                <input
                  type="checkbox"
                  checked={chambres.includes(c.valeur)}
                  onChange={() => bascule(chambres, c.valeur, setChambres)}
                  className="rounded text-[#4E2E53] focus:ring-[#4E2E53]"
                />
                <span>{c.libelle}</span>
                <span className="text-slate-400 ml-auto">{compteChambres[c.valeur] ?? 0}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2 text-xs pt-4 border-t border-slate-100">
            <span className="font-bold uppercase tracking-wider text-slate-400">Contrat</span>
            {[...CONTRATS].map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-[#4E2E53]">
                <input
                  type="checkbox"
                  checked={contrats.includes(c)}
                  onChange={() => bascule(contrats, c, setContrats)}
                  className="rounded text-[#4E2E53] focus:ring-[#4E2E53]"
                />
                <span>{c}</span>
                <span className="text-slate-400 ml-auto">{compteContrats[c] ?? 0}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2 text-xs pt-4 border-t border-slate-100">
            <label className="font-bold uppercase tracking-wider text-slate-400">Trier par</label>
            <select
              value={tri}
              onChange={(e) => setTri(e.target.value as Tri)}
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4E2E53]"
            >
              <option value="recentes">Plus récentes d&apos;abord</option>
              <option value="anciennes">Plus anciennes d&apos;abord</option>
            </select>
          </div>
        </aside>

        {/* LISTE */}
        <section className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>
              {filtrees.length} offre{filtrees.length > 1 ? "s" : ""} affichée{filtrees.length > 1 ? "s" : ""} sur {offres.length}
            </span>
            <a href="https://www.dataparl.fr/jobs/old-jobs" target="_blank" rel="noopener noreferrer" className="text-[#6C84B0] hover:text-[#4E2E53] underline">
              Anciennes offres →
            </a>
          </div>

          {filtrees.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <p className="text-2xl">🔎</p>
              <p className="text-sm text-slate-600">Aucune offre ne correspond exactement à vos critères.</p>
              <button onClick={reinitialiser} className="text-xs font-semibold text-[#4E2E53] underline">
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            filtrees.map((offre) => (
              <article
                key={offre.id}
                onClick={() => setOuverte(offre)}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#4E2E53]/30 transition-all cursor-pointer group"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {offre.source_connector === "proposition" ? (
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200/60">✨ Déposée par l&apos;élu</span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium border border-slate-200">Collectée</span>
                    )}
                    <span className="bg-[#E4BDE9]/40 text-[#4E2E53] text-xs font-semibold px-2.5 py-1 rounded-full">{typeContrat(offre)}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium" title={offre.publie_le ? "Publiée le " + dateFr(offre.publie_le) : undefined}>{ilYA(offre.publie_le) ?? dateFr(offre.publie_le)}</span>
                </div>

                <h3 className="text-xl font-serif-title font-bold text-[#4E2E53] group-hover:text-[#6C84B0] transition-colors leading-snug">
                  {titrePoste(offre.titre)}
                </h3>

                <p className="mt-1 text-sm font-medium text-slate-600 flex flex-wrap items-center gap-2">
                  <span>{nomElu(offre) || "Équipe parlementaire"}</span>
                  {offre.groupe_politique && (<><span className="text-slate-300">•</span><span>{offre.groupe_politique}</span></>)}
                  {offre.chambre && (<><span className="text-slate-300">•</span><span className="text-[#6C84B0] font-semibold">{CHAMBRE_NOM[offre.chambre] ?? offre.chambre}</span></>)}
                </p>

                <p className="mt-3 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {extrait(offre.description)}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    📍 {offre.localisation ?? offre.departement ?? (offre.chambre ? CHAMBRE_NOM[offre.chambre] : "Paris")}
                  </span>
                  <span className="text-[#4E2E53] font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Voir l&apos;offre <span aria-hidden>→</span>
                  </span>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {ouverte && <ModalOffre offre={ouverte} onFermer={() => setOuverte(null)} />}
    </div>
  );
}
