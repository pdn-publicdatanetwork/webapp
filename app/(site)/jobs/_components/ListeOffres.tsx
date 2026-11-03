"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CHAMBRES, SIGLE, slugOffre, type Chambre } from "@/lib/jobs";
import { couleurChambre } from "@/lib/couleurs";
import {
  CONTRATS,
  CHAMBRE_NOM,
  extrait,
  ilYA,
  nomElu,
  tempsTravail,
  titreCourt,
  typeContrat,
} from "@/lib/jobsTexte";
import { PastilleProvenance, type OffreListe } from "./communJobs";
import ModalOffre from "./ModalOffre";

const uniques = (xs: (string | null | undefined)[]) =>
  [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "fr"));

// Liste des offres : initialisation depuis l'URL (?q=, ?chambre=, ?type=),
// sidebar avec cases à cocher et compteurs, cartes à la Google Careers.
// Un clic sur une carte ouvre la modal de détail ; le lien reste navigable
// (clic milieu, maj, ctrl) pour la page indexable /jobs/<slug>.
export default function ListeOffres({ offres }: { offres: OffreListe[] }) {
  const params = useSearchParams();
  const [source, setSource] = useState<"" | "collectee" | "deposee">("");
  const [chambres, setChambres] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [departement, setDepartement] = useState("");
  const [groupe, setGroupe] = useState("");
  const [elu, setElu] = useState("");
  const [q, setQ] = useState("");
  const [tri, setTri] = useState<"recente" | "ancienne" | "limite">("recente");
  const [ouverte, setOuverte] = useState<OffreListe | null>(null);

  // La recherche du hero et les pastilles rapides pilotent l'URL.
  useEffect(() => {
    setQ(params.get("q") ?? "");
    const c = params.get("chambre");
    setChambres(c ? [c] : []);
    const t = params.get("type");
    setTypes(t ? [t] : []);
  }, [params]);

  const elus = useMemo(() => uniques(offres.map(nomElu)), [offres]);
  const groupes = useMemo(() => uniques(offres.map((o) => o.groupe_politique)), [offres]);
  const departements = useMemo(() => uniques(offres.map((o) => o.departement)), [offres]);

  const compteChambre = (v: string) => offres.filter((o) => o.chambre === v).length;
  const compteType = (v: string) => offres.filter((o) => typeContrat(o) === v).length;

  const visibles = useMemo(() => {
    const out = offres.filter((o) => {
      if (source === "deposee" && o.source_connector !== "proposition") return false;
      if (source === "collectee" && o.source_connector === "proposition") return false;
      if (chambres.length && !chambres.includes(o.chambre ?? "")) return false;
      if (types.length && !types.includes(typeContrat(o))) return false;
      if (departement && (o.departement ?? "") !== departement) return false;
      if (groupe && (o.groupe_politique ?? "") !== groupe) return false;
      if (elu && nomElu(o) !== elu) return false;
      if (q) {
        const t = (o.titre + " " + nomElu(o) + " " + o.description).toLowerCase();
        if (!t.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    if (tri === "ancienne") out.sort((a, b) => String(a.publie_le ?? "").localeCompare(String(b.publie_le ?? "")));
    else if (tri === "limite")
      out.sort((a, b) => String(a.expire_le ?? "9999").localeCompare(String(b.expire_le ?? "9999")));
    else out.sort((a, b) => String(b.publie_le ?? "").localeCompare(String(a.publie_le ?? "")));
    return out;
  }, [offres, source, chambres, types, departement, groupe, elu, q, tri]);

  const reset = () => {
    setSource(""); setChambres([]); setTypes([]); setDepartement(""); setGroupe(""); setElu(""); setQ(""); setTri("recente");
  };
  const unFiltre = !!(source || chambres.length || types.length || departement || groupe || elu || q || tri !== "recente");
  const nbFiltres = [source, chambres.length && "x", types.length && "x", departement, groupe, elu, q].filter(Boolean).length;

  // Clic simple : modal. Clic milieu / modificateurs : navigation normale.
  const clicCarte = (e: React.MouseEvent, o: OffreListe) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setOuverte(o);
  };

  return (
    <div className="liste-jobs">
      <style jsx>{`
        .liste-jobs { display: grid; grid-template-columns: 250px 1fr; gap: 28px; align-items: start; margin-top: 26px; }
        details.filtres-details { position: sticky; top: 84px; }
        details.filtres-details summary { list-style: none; cursor: pointer; display: none; font-weight: 700;
          padding: 12px 16px; background: var(--card); border: 1px solid var(--line); border-radius: 12px;
          box-shadow: 0 1px 3px rgba(7,26,65,.05); }
        details.filtres-details summary::-webkit-details-marker { display: none; }
        .filtres { display: grid; gap: 18px; padding: 18px 16px; background: var(--card);
          border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 1px 3px rgba(7,26,65,.05); }
        .filtres fieldset { border: 0; padding: 0; margin: 0; }
        .filtres legend { font-size: .78rem; font-weight: 700; color: var(--muted); text-transform: uppercase;
          letter-spacing: .04em; margin-bottom: 8px; }
        .filtres label.radio, .filtres label.coche { display: flex; align-items: center; gap: 8px;
          font-weight: 400; font-size: .92rem; margin: 4px 0; cursor: pointer; }
        .filtres .compteur { color: var(--muted); font-size: .82rem; margin-left: auto; }
        .filtres select, .filtres input[type=text] { margin-top: 0; font-size: .92rem; padding: 8px 10px; }
        .filtres .raz { margin-top: 2px; }
        .resultats { min-width: 0; }
        .resultats .compteur { margin: 0 0 14px; }
        .grille-offres { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
        .carte-offre { display: flex; flex-direction: column; background: var(--card); border: 1px solid var(--line);
          border-radius: 16px; padding: 18px 20px; text-decoration: none; color: var(--ink); cursor: pointer;
          box-shadow: 0 1px 3px rgba(7,26,65,.05); transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease; }
        .carte-offre:hover, .carte-offre:focus-visible { transform: translateY(-3px);
          border-color: color-mix(in srgb, var(--bleu) 30%, var(--line)); box-shadow: 0 8px 22px rgba(7,26,65,.1); }
        .carte-offre:hover h2, .carte-offre:focus-visible h2 { color: var(--bleu); }
        .carte-tete { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 10px; }
        .pastille-chambre { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px;
          border-radius: 999px; font-size: .76rem; font-weight: 600; border: 1px solid var(--line); background: var(--bg); }
        .pastille-chambre i { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
        .pastille-source { display: inline-block; border-radius: 999px; padding: 3px 10px; font-size: .76rem; font-weight: 700; }
        .pastille-source.deposee { background: var(--jaune); color: var(--ink); }
        .pastille-source.collectee { border: 1px solid var(--line); color: var(--muted); background: var(--bg); }
        .badge-jobs { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: .76rem;
          font-weight: 600; border: 1px solid var(--line); color: var(--muted); background: var(--bg); }
        .badge-jobs.violet { background: color-mix(in srgb, var(--jaune) 40%, #fff); color: var(--ink); border-color: transparent; }
        .carte-date { margin-left: auto; color: var(--muted); font-size: .76rem; }
        .carte-offre h2 { margin: 0 0 4px; font-size: 1.08rem; line-height: 1.3; }
        .carte-offre .elu { margin: 0 0 8px; font-size: .88rem; font-weight: 600; color: var(--muted); }
        .carte-offre .elu .sep { color: var(--line); margin: 0 4px; }
        .carte-offre p.extrait { margin: 0 0 14px; color: var(--muted); font-size: .9rem; line-height: 1.55;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }
        .carte-pied { display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding-top: 12px; border-top: 1px solid var(--line); font-size: .85rem; color: var(--muted); }
        .carte-offre .voir { font-weight: 700; color: var(--bleu); white-space: nowrap; }
        .aucun { background: var(--card); border: 1px dashed var(--line); border-radius: 12px; padding: 28px;
          text-align: center; color: var(--muted); }
        .aucun .btn { margin-top: 12px; }
        @media (max-width: 880px) {
          .liste-jobs { grid-template-columns: 1fr; }
          details.filtres-details { position: static; }
          details.filtres-details summary { display: block; }
        }
      `}</style>

      <details className="filtres-details" open={nbFiltres > 0 || undefined}>
        <summary>Filtres {nbFiltres > 0 ? "(" + nbFiltres + ")" : ""}</summary>
        <aside className="filtres" aria-label="Filtrer les offres">
          <fieldset>
            <legend>Recherche</legend>
            <input type="text" placeholder="Intitulé, élu, mot-clé…" value={q} onChange={(e) => setQ(e.target.value)} />
          </fieldset>

          <fieldset>
            <legend>Source</legend>
            <label className="radio">
              <input type="radio" name="source" checked={source === ""} onChange={() => setSource("")} /> Toutes
            </label>
            <label className="radio">
              <input type="radio" name="source" checked={source === "collectee"} onChange={() => setSource("collectee")} /> Collectées
            </label>
            <label className="radio">
              <input type="radio" name="source" checked={source === "deposee"} onChange={() => setSource("deposee")} /> Déposées par l&apos;élu
            </label>
          </fieldset>

          <fieldset>
            <legend>Chambre</legend>
            {CHAMBRES.map((c) => (
              <label className="coche" key={c.valeur}>
                <input
                  type="checkbox"
                  checked={chambres.includes(c.valeur)}
                  onChange={(e) =>
                    setChambres((prev) =>
                      e.target.checked ? [...prev, c.valeur] : prev.filter((x) => x !== c.valeur)
                    )
                  }
                />
                {c.libelle}
                <span className="compteur">({compteChambre(c.valeur)})</span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Type de contrat</legend>
            {CONTRATS.map((t) => (
              <label className="coche" key={t}>
                <input
                  type="checkbox"
                  checked={types.includes(t)}
                  onChange={(e) =>
                    setTypes((prev) => (e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)))
                  }
                />
                {t}
                <span className="compteur">({compteType(t)})</span>
              </label>
            ))}
          </fieldset>

          {departements.length > 0 && (
            <fieldset>
              <legend>Localisation</legend>
              <select value={departement} onChange={(e) => setDepartement(e.target.value)} aria-label="Département">
                <option value="">Tous les départements</option>
                {departements.map((x) => (<option key={x} value={x}>{x}</option>))}
              </select>
            </fieldset>
          )}

          {groupes.length > 0 && (
            <fieldset>
              <legend>Groupe politique</legend>
              <select value={groupe} onChange={(e) => setGroupe(e.target.value)} aria-label="Groupe politique">
                <option value="">Tous les groupes</option>
                {groupes.map((x) => (<option key={x} value={x}>{x}</option>))}
              </select>
            </fieldset>
          )}

          {elus.length > 3 && (
            <fieldset>
              <legend>Élu</legend>
              <select value={elu} onChange={(e) => setElu(e.target.value)} aria-label="Élu">
                <option value="">Tous</option>
                {elus.map((x) => (<option key={x} value={x}>{x}</option>))}
              </select>
            </fieldset>
          )}

          <fieldset>
            <legend>Trier par</legend>
            <select value={tri} onChange={(e) => setTri(e.target.value as "recente" | "ancienne" | "limite")} aria-label="Tri">
              <option value="recente">Publication, plus récentes</option>
              <option value="ancienne">Publication, plus anciennes</option>
              <option value="limite">Date limite de candidature</option>
            </select>
          </fieldset>

          {unFiltre && (
            <button type="button" className="btn secondaire raz" onClick={reset}>Réinitialiser</button>
          )}
        </aside>
      </details>

      <div className="resultats">
        <p className="meta compteur">
          {visibles.length} offre{visibles.length > 1 ? "s" : ""}
          {visibles.length !== offres.length ? " sur " + offres.length : ""}
        </p>

        {visibles.length === 0 ? (
          <div className="aucun">
            <p style={{ margin: 0 }}>
              Aucune offre ne correspond à vos critères actuels. Élargissez les filtres, ou créez une
              alerte e-mail pour être prévenu des prochaines publications.
            </p>
            <p style={{ margin: "10px 0 0" }}>
              <a href="/jobs#alerte">Créer une alerte pour cette recherche</a>
            </p>
            {unFiltre && (
              <button type="button" className="btn secondaire" onClick={reset}>Réinitialiser les filtres</button>
            )}
          </div>
        ) : (
          <div className="grille-offres">
            {visibles.map((o) => {
              const contrat = typeContrat(o);
              const travail = tempsTravail(o.description ?? "");
              const ex = extrait(o.description);
              return (
                <Link
                  key={o.id}
                  href={"/jobs/" + slugOffre(o as Parameters<typeof slugOffre>[0])}
                  className="carte-offre"
                  onClick={(e) => clicCarte(e, o)}
                >
                  <div className="carte-tete">
                    {o.chambre && (
                      <span className="pastille-chambre">
                        <i style={{ background: couleurChambre(o.chambre) }} />
                        {SIGLE[o.chambre as Chambre] ?? o.chambre}
                      </span>
                    )}
                    <PastilleProvenance connector={o.source_connector} avecLibelle />
                    <span className="badge-jobs violet">{contrat}</span>
                    {travail && <span className="badge-jobs">{travail}</span>}
                    {o.publie_le && <span className="carte-date">{ilYA(o.publie_le)}</span>}
                  </div>
                  <h2>{titreCourt(o.titre)}</h2>
                  <p className="elu">
                    {nomElu(o) || "Équipe parlementaire"}
                    {o.groupe_politique && (<><span className="sep">•</span>{o.groupe_politique}</>)}
                    {o.chambre && (<><span className="sep">•</span>{CHAMBRE_NOM[o.chambre] ?? o.chambre}</>)}
                  </p>
                  {ex && <p className="extrait">{ex}</p>}
                  <div className="carte-pied">
                    <span>{o.localisation ?? o.departement ?? ""}</span>
                    <span className="voir">Voir l&apos;offre →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {ouverte && <ModalOffre offre={ouverte} onClose={() => setOuverte(null)} />}
    </div>
  );
}
