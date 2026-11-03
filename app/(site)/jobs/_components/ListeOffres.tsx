"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CHAMBRES, SIGLE, slugOffre, type Chambre } from "@/lib/jobs";
import { couleurChambre } from "@/lib/couleurs";

export type OffreListe = {
  id: string;
  titre: string;
  description: string;
  chambre: string | null;
  departement: string | null;
  elu_prenom: string | null;
  elu_nom: string | null;
  groupe_politique: string | null;
  type_poste: string | null;
  localisation: string | null;
  publie_le: string | null;
  expire_le: string | null;
  source_connector: string;
};

const uniques = (xs: (string | null | undefined)[]) =>
  [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "fr"));

const dateCourte = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : null;

// Pastille de provenance, avec le niveau de confiance en info-bulle.
export function PastilleProvenance({ connector, avecLibelle }: { connector: string; avecLibelle?: boolean }) {
  const parElu = connector === "proposition";
  if (!parElu && !avecLibelle) return null;
  return (
    <span
      className={parElu ? "pastille-source deposee" : "pastille-source collectee"}
      title={parElu ? "Publiée directement par l'équipe de l'élu" : "Collectée automatiquement et relue"}
    >
      {parElu ? "★ Offre déposée par l'élu" : "Collectée"}
    </span>
  );
}

const nomElu = (o: OffreListe) => [o.elu_prenom, o.elu_nom].filter(Boolean).join(" ");

// Titre court de la card : jamais le titre standard à rallonge.
const titreCourt = (t: string) => (t.length > 80 ? t.slice(0, 78) + "…" : t);

// Extrait de 2-3 lignes : le chapeau de l'annonce, jusqu'à la première section.
const extrait = (desc: string) => {
  if (!desc) return "";
  const coupe = desc.split(/\n(?=Vos missions|Profil recherché|Lieu|Rémunération|Pour candidater)/i)[0]
    .replace(/\s+/g, " ")
    .trim();
  const texte = coupe || desc.replace(/\s+/g, " ").trim();
  return texte.length > 190 ? texte.slice(0, 188) + "…" : texte;
};

// Liste publique des offres, interface v3 : sidebar de filtres (repliable en
// mobile), cartes scannables sur 1 ou 2 colonnes à la Google Careers.
export default function ListeOffres({ offres }: { offres: OffreListe[] }) {
  const [source, setSource] = useState<"" | "collectee" | "deposee">("");
  const [chambre, setChambre] = useState("");
  const [type, setType] = useState("");
  const [departement, setDepartement] = useState("");
  const [groupe, setGroupe] = useState("");
  const [elu, setElu] = useState("");
  const [q, setQ] = useState("");
  const [tri, setTri] = useState<"recente" | "ancienne" | "limite">("recente");

  const elus = useMemo(() => uniques(offres.map(nomElu)), [offres]);
  const groupes = useMemo(() => uniques(offres.map((o) => o.groupe_politique)), [offres]);
  const departements = useMemo(() => uniques(offres.map((o) => o.departement)), [offres]);
  const types = useMemo(() => uniques(offres.map((o) => o.type_poste)), [offres]);

  const visibles = useMemo(() => {
    const out = offres.filter((o) => {
      if (source === "deposee" && o.source_connector !== "proposition") return false;
      if (source === "collectee" && o.source_connector === "proposition") return false;
      if (chambre && (o.chambre ?? "") !== chambre) return false;
      if (type && (o.type_poste ?? "") !== type) return false;
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
  }, [offres, source, chambre, type, departement, groupe, elu, q, tri]);

  const reset = () => {
    setSource(""); setChambre(""); setType(""); setDepartement(""); setGroupe(""); setElu(""); setQ(""); setTri("recente");
  };
  const unFiltre = !!(source || chambre || type || departement || groupe || elu || q || tri !== "recente");
  const nbFiltres = [source, chambre, type, departement, groupe, elu, q].filter(Boolean).length;

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
        .filtres label.radio { display: flex; align-items: center; gap: 8px; font-weight: 400; font-size: .92rem;
          margin: 4px 0; cursor: pointer; }
        .filtres select, .filtres input[type=text] { margin-top: 0; font-size: .92rem; padding: 8px 10px; }
        .filtres .raz { margin-top: 2px; }
        .resultats { min-width: 0; }
        .resultats .compteur { margin: 0 0 14px; }
        .grille-offres { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
        .carte-offre { display: flex; flex-direction: column; background: var(--card); border: 1px solid var(--line);
          border-radius: 12px; padding: 18px 20px; text-decoration: none; color: var(--ink);
          box-shadow: 0 1px 3px rgba(7,26,65,.05); transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease; }
        .carte-offre:hover, .carte-offre:focus-visible { transform: translateY(-2px);
          border-color: color-mix(in srgb, var(--bleu) 30%, var(--line)); box-shadow: 0 6px 18px rgba(7,26,65,.1); }
        .carte-offre:hover h2, .carte-offre:focus-visible h2 { color: var(--bleu); }
        .carte-offres-badges { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 10px; }
        .badge-jobs { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: .76rem;
          font-weight: 600; border: 1px solid var(--line); color: var(--muted); background: var(--bg); }
        .pastille-source { display: inline-block; border-radius: 999px; padding: 3px 10px; font-size: .76rem; font-weight: 700; }
        .pastille-source.deposee { background: var(--jaune); color: #071A41; }
        .pastille-source.collectee { border: 1px solid var(--line); color: var(--muted); background: var(--bg); }
        .pastille-chambre { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px;
          border-radius: 999px; font-size: .76rem; font-weight: 600; border: 1px solid var(--line); background: var(--bg); }
        .pastille-chambre i { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
        .carte-offre h2 { margin: 0 0 6px; font-size: 1.06rem; line-height: 1.35;
          font-family: var(--font-dm-sans), system-ui, sans-serif; }
        .carte-offre .elu { margin: 0 0 2px; font-weight: 600; font-size: .92rem; }
        .carte-offre .elu span, .carte-offre .ou { color: var(--muted); font-weight: 400; }
        .carte-offre p.extrait { margin: 10px 0 14px; color: var(--muted); font-size: .9rem; line-height: 1.55;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }
        .carte-offre .voir { font-size: .92rem; font-weight: 700; color: var(--bleu); }
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
            <select value={chambre} onChange={(e) => setChambre(e.target.value)} aria-label="Chambre">
              <option value="">Toutes</option>
              {CHAMBRES.map((c) => (
                <option key={c.valeur} value={c.valeur}>{c.libelle}</option>
              ))}
            </select>
          </fieldset>

          {types.length > 0 && (
            <fieldset>
              <legend>Type de contrat</legend>
              <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type de contrat">
                <option value="">Tous</option>
                {types.map((x) => (<option key={x} value={x}>{x}</option>))}
              </select>
            </fieldset>
          )}

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
              Aucune offre ne correspond à ces critères. Élargissez la recherche, ou laissez votre
              e-mail sur la page d&apos;accueil pour être prévenu des prochaines publications.
            </p>
            {unFiltre && (
              <button type="button" className="btn secondaire" onClick={reset}>Réinitialiser les filtres</button>
            )}
          </div>
        ) : (
          <div className="grille-offres">
            {visibles.map((o) => (
              <Link key={o.id} href={"/jobs/" + slugOffre(o)} className="carte-offre">
                <div className="carte-offres-badges">
                  <PastilleProvenance connector={o.source_connector} avecLibelle />
                  {o.chambre && (
                    <span className="pastille-chambre">
                      <i style={{ background: couleurChambre(o.chambre) }} />
                      {SIGLE[o.chambre as Chambre] ?? o.chambre}
                    </span>
                  )}
                  <span className="badge-jobs">{o.type_poste ?? "Contrat à préciser"}</span>
                  {o.publie_le && <span className="badge-jobs">{dateCourte(o.publie_le)}</span>}
                </div>
                <h2>{titreCourt(o.titre)}</h2>
                <p className="elu">
                  {nomElu(o) || "Équipe parlementaire"}
                  {o.groupe_politique && <span>, {o.groupe_politique}</span>}
                </p>
                {(o.localisation || o.departement) && (
                  <p className="ou" style={{ margin: 0, fontSize: ".88rem", color: "var(--muted)" }}>
                    {o.localisation ?? o.departement}
                    {o.departement && o.localisation && o.localisation !== o.departement ? ", " + o.departement : ""}
                  </p>
                )}
                {extrait(o.description) && <p className="extrait">{extrait(o.description)}</p>}
                <span className="voir">Voir l&apos;offre →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
