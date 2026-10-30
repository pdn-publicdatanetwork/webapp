"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CHAMBRES, slugOffre, titreStandard } from "@/lib/jobs";

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

const dateFr = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

// Pastille de provenance : une offre déposée directement par l'élu (via le
// formulaire, adresse parlementaire vérifiée) se distingue d'une offre
// collectée automatiquement sur une source publique.
export function PastilleProvenance({ connector, avecLibelle }: { connector: string; avecLibelle?: boolean }) {
  const parElu = connector === "proposition";
  if (!parElu && !avecLibelle) return null;
  return (
    <span
      style={parElu
        ? { background: "var(--jaune)", color: "#071A41", borderRadius: 999, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.02em" }
        : { border: "1px solid var(--line)", color: "var(--muted)", borderRadius: 999, padding: "3px 10px", fontSize: "0.75rem" }}
    >
      {parElu ? "★ Offre déposée par l'élu" : "Collectée"}
    </span>
  );
}

// Liste publique des offres avec filtres : chambre, élu, groupe, département + recherche libre.
export default function ListeOffres({ offres }: { offres: OffreListe[] }) {
  const [chambre, setChambre] = useState("");
  const [elu, setElu] = useState("");
  const [groupe, setGroupe] = useState("");
  const [departement, setDepartement] = useState("");
  const [q, setQ] = useState("");
  const [parLElu, setParLElu] = useState(false);

  const elus = useMemo(
    () => uniques(offres.map((o) => [o.elu_prenom, o.elu_nom].filter(Boolean).join(" "))),
    [offres]
  );
  const groupes = useMemo(() => uniques(offres.map((o) => o.groupe_politique)), [offres]);
  const departements = useMemo(() => uniques(offres.map((o) => o.departement)), [offres]);

  const nomElu = (o: OffreListe) => [o.elu_prenom, o.elu_nom].filter(Boolean).join(" ");

  const visibles = offres.filter((o) => {
    if (chambre && (o.chambre ?? "") !== chambre) return false;
    if (elu && nomElu(o) !== elu) return false;
    if (groupe && (o.groupe_politique ?? "") !== groupe) return false;
    if (departement && (o.departement ?? "") !== departement) return false;
    if (parLElu && o.source_connector !== "proposition") return false;
    if (q) {
      const t = (titreStandard(o) + " " + o.description).toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const reset = () => { setChambre(""); setElu(""); setGroupe(""); setDepartement(""); setQ(""); setParLElu(false); };
  const unFiltre = !!(chambre || elu || groupe || departement || q || parLElu);

  return (
    <>
      {/* Filtres */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, margin: "24px 0 4px" }}>
        <select value={chambre} onChange={(e) => setChambre(e.target.value)} aria-label="Chambre">
          <option value="">Toutes les chambres</option>
          {CHAMBRES.map((c) => (
            <option key={c.valeur} value={c.valeur}>{c.libelle}</option>
          ))}
        </select>
        <select value={elu} onChange={(e) => setElu(e.target.value)} aria-label="Élu">
          <option value="">Tous les élus</option>
          {elus.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
        <select value={groupe} onChange={(e) => setGroupe(e.target.value)} aria-label="Groupe">
          <option value="">Tous les groupes</option>
          {groupes.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
        <select value={departement} onChange={(e) => setDepartement(e.target.value)} aria-label="Département">
          <option value="">Tous les départements</option>
          {departements.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
        <input type="text" placeholder="Rechercher un poste…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="meta" style={{ margin: "0 0 24px" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={parLElu} onChange={(e) => setParLElu(e.target.checked)} />
          Uniquement les offres déposées par les élus
        </label>
        {", "}
        {visibles.length} offre{visibles.length > 1 ? "s" : ""}
        {visibles.length !== offres.length ? " (filtrée" + (visibles.length > 1 ? "s" : "") + " sur " + offres.length + ")" : ""}
        {unFiltre && (
          <>
            {", "}
            <button type="button" onClick={reset} style={{ background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>
              réinitialiser
            </button>
          </>
        )}
      </p>

      {/* Cartes */}
      {visibles.length === 0 ? (
        <p>Aucune offre ne correspond à ces critères.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {visibles.map((o) => (
            <article key={o.id} className="card">
              <p style={{ margin: "0 0 8px" }}>
                <PastilleProvenance connector={o.source_connector} avecLibelle />
              </p>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.08rem" }}>
                <Link href={"/jobs/" + slugOffre(o)}>{titreStandard(o)}</Link>
              </h2>
              <p className="meta" style={{ margin: "0 0 10px" }}>
                {[o.type_poste, o.localisation].filter(Boolean).join(", ")}
                {o.publie_le ? ", publiée le " + dateFr(o.publie_le) : ""}
              </p>
              {o.description && (
                <p style={{ margin: 0 }}>
                  {o.description.length > 220 ? o.description.slice(0, 220) + "…" : o.description}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
