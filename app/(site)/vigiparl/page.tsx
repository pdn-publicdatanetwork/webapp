import type { Metadata } from "next";
import BarresAnnuelles from "@/app/_components/BarresAnnuelles";
import CartesBarres, { type CarteBarre } from "@/app/_components/CartesBarres";
import Partage from "@/app/_components/Partage";
import RechercheStatElu from "@/app/_components/RechercheStatElu";
import { familleDe, FAMILLES } from "@/lib/familles";
import { CHAMBRE, CHAMBRE_LONG, idParlementaire, nomAffiche } from "@/lib/format";
import {
  agreger, mois, pct, segmentDe, statsAnnuelles, statsDurees, statsElus, tauxTurnover, turnoverAnnuel,
  type StatAnnuelle, type StatDuree, type StatElu,
} from "@/lib/stats";

export const metadata: Metadata = {
  title: { absolute: "VigiParl' : le renouvellement des équipes parlementaires" },
  description: "Taux de renouvellement (turnover) des équipes de collaborateurs, par élu, groupe et chambre.",
  alternates: { canonical: "/vigiparl" },
};
export const revalidate = 3600;

const CHAMBRES = ["assemblee", "senat"] as const;
const court = (c: string) => (c === "assemblee" ? "AN" : "Sénat");

export default async function VigiParl() {
  let rows: StatElu[] = [];
  let annees: StatAnnuelle[] = [];
  let durees: StatDuree[] = [];
  let indisponible = false;
  try { [rows, annees, durees] = await Promise.all([statsElus(), statsAnnuelles().catch(() => []), statsDurees().catch(() => [])]); } catch { indisponible = true; }
  rows = rows.filter((r) => r.chambre !== "europarl");
  const parChambre = Object.fromEntries(agreger(rows, (r) => r.chambre).map((a) => [a.cle, a]));
  const duree = Object.fromEntries(durees.map((d) => [d.chambre, d]));
  const anneeCourante = new Date().getFullYear();
  const carte = (id: string, libelle: string, a: ReturnType<typeof agreger>[number], href: string, detail?: string, section?: string): CarteBarre => ({
    id, libelle, detail, section, taux: tauxTurnover(a), valeur: pct(tauxTurnover(a)), complement: `${a.departs_12m} départs`, elus: a.elus, href,
  });
  const familles = agreger(rows, (r) => familleDe(r.chambre, r.elu_groupe)?.code ?? "Autres")
    .filter((f) => f.effectif >= 10)
    .sort((a, b) => (tauxTurnover(b) ?? 0) - (tauxTurnover(a) ?? 0))
    .map((f) => {
      const an = rows.some((r) => r.chambre === "assemblee" && (familleDe(r.chambre, r.elu_groupe)?.code ?? "Autres") === f.cle);
      return carte(`famille-${f.cle}`, f.cle, f, `/vigiparl/${an ? "an" : "senat"}/parlementaires?famille=${encodeURIComponent(f.cle)}`, FAMILLES.find((x) => x.code === f.cle)?.libelle);
    });
  const groupes = CHAMBRES.flatMap((c) => agreger(rows.filter((r) => r.chambre === c), (r) => r.elu_groupe)
    .sort((a, b) => (tauxTurnover(b) ?? 0) - (tauxTurnover(a) ?? 0))
    .map((g) => carte(`groupe-${segmentDe(c)}-${g.cle.replace(/[^\p{L}\p{N}]+/gu, "-")}`, g.cle, g, `/vigiparl/${segmentDe(c)}/parlementaires?groupe=${encodeURIComponent(g.cle)}`, undefined, CHAMBRE_LONG[c])));
  const maxBarre = Math.max(0.5, ...[...familles, ...groupes].map((l) => l.taux ?? 0));

  return (
    <>
      <h1>Le <span className="surligne-vigi">renouvellement</span> des équipes</h1>
      <p className="lead">
        Qui garde son équipe, qui la renouvelle sans cesse ? Le taux de renouvellement des collaborateurs sur les
        12 derniers mois, élu par élu.
      </p>

      {indisponible && <p className="erreur">Les statistiques sont momentanément indisponibles. Réessaie dans quelques minutes.</p>}
      {/* Trois lignes, une case par chambre (le Parlement européen s'ajoutera sur chaque ligne). */}
      <div className="chiffres vigi paires">
        {CHAMBRES.map((c) => parChambre[c] && (
          <div key={c}>
            <strong>{pct(tauxTurnover(parChambre[c]))}</strong>
            <span>de renouvellement {c === "assemblee" ? "à l'Assemblée" : "au Sénat"}</span>
            <a className="definition" href="/vigiparl/methode#taux-12-mois">Définition</a>
          </div>
        ))}
        {CHAMBRES.map((c) => parChambre[c] && (
          <div key={`d-${c}`}>
            <strong>{parChambre[c].departs_12m.toLocaleString("fr-FR")}</strong>
            <span>départs en 12 mois ({court(c)})</span>
            <a className="definition" href="/vigiparl/methode#exclusions">Définition</a>
          </div>
        ))}
        {CHAMBRES.map((c) => duree[c] && (
          <div key={`m-${c}`}>
            <strong>{mois(duree[c].duree_mediane_jours)}</strong>
            <span>durée médiane d&apos;un poste ({court(c)})</span>
            <a className="definition" href="/vigiparl/methode#duree-mediane">Définition</a>
          </div>
        ))}
      </div>
      {parChambre.assemblee && (
        <Partage url="https://www.dataparl.fr/vigiparl" titre="VigiParl'"
          texte={`${pct(tauxTurnover(parChambre.assemblee))} de renouvellement des collaborateurs de l'Assemblée en 12 mois, élu par élu sur VigiParl'`} />
      )}

      {annees.length > 0 && (
        <>
          <h2><a className="titre-lien" href="/vigiparl/timeline">L&apos;évolution année par année →</a></h2>
          <div className="graphiques">
            {CHAMBRES.map((c) => (
              <BarresAnnuelles key={c} titre={`Renouvellement annuel : ${CHAMBRE_LONG[c]}`} couleur="var(--vigi)" enCours={anneeCourante}
                format={(v) => pct(v)} max={0.8}
                points={annees.filter((a) => a.chambre === c).map((a) => ({ an: a.an, valeur: turnoverAnnuel(a), detail: `${a.departs} départs, ${a.effectif} collaborateurs au 1er janvier` }))} />
            ))}
          </div>
          <p className="meta">L&apos;année en cours est partielle (barre atténuée). <a href="/vigiparl/timeline">Voir la série complète, année par année →</a></p>
        </>
      )}

      {familles.length > 0 && (
        <>
          <h2 id="classement">Par famille politique et par groupe</h2>
          <CartesBarres couleur="vigi" entete="Renouvellement 12 mois" max={maxBarre} vues={[
            { cle: "famille", titre: "Par famille", note: "Les groupes équivalents des deux chambres réunis (ex. ECO : GEST au Sénat, EcoS à l'Assemblée).", lignes: familles },
            { cle: "groupe", titre: "Par groupe", lignes: groupes },
          ]} />
        </>
      )}

      {CHAMBRES.map((c) => {
        const tri = rows.filter((r) => r.chambre === c && r.effectif + r.departs_12m >= 3)
          .sort((a, b) => (tauxTurnover(b) ?? 0) - (tauxTurnover(a) ?? 0));
        if (!tri.length) return null;
        return (
          <section key={c}>
            <h2>{CHAMBRE_LONG[c]}, par élu</h2>
            <RechercheStatElu id={`vigi-${c}`} placeholder={`Chercher un élu ${c === "assemblee" ? "de l'Assemblée" : "du Sénat"}`}
              colonnes={["Équipe", "Départs 12 mois", "Taux"]}
              lignes={tri.map((r, i) => ({
                nom: nomAffiche(r.elu_nom), groupe: r.elu_groupe, rang: i + 1,
                href: `/parlementaires/${encodeURIComponent(idParlementaire(r.chambre, r.elu_id, r.elu_cle, r.elu_nom))}`,
                valeurs: [String(r.effectif), String(r.departs_12m), pct(tauxTurnover(r))],
              }))} />
            <p><a href={`/vigiparl/${segmentDe(c)}/parlementaires`}>Voir les {tri.length} élus, du renouvellement le plus fort au plus faible →</a></p>
          </section>
        );
      })}

      <h2>Méthode</h2>
      <p>
        Taux de renouvellement = départs ÷ effectif moyen de l&apos;équipe, hors départs liés à la fin de mandat de l&apos;élu.
        Dates de publication officielles, archives depuis 2015. {CHAMBRE.europarl} : suivi repris le 8 octobre 2026, indicateurs dès 12 mois de recul.{" "}
        <a href="/vigiparl/methode">La méthode complète, avec un exemple chiffré →</a>
      </p>
    </>
  );
}
