import type { Metadata } from "next";
import BarresAnnuelles from "@/app/_components/BarresAnnuelles";
import CartesBarres, { type CarteBarre } from "@/app/_components/CartesBarres";
import Partage from "@/app/_components/Partage";
import RechercheStatElu from "@/app/_components/RechercheStatElu";
import { familleDe, FAMILLES } from "@/lib/familles";
import { CHAMBRE_LONG, idParlementaire, nomAffiche } from "@/lib/format";
import {
  agreger, equipeEligible, mixite, mixiteMoyenne, partFemmes, pct, segmentDe, statsElus, statsMixiteAnnuelle, tauxMixite,
  type StatElu, type StatMixiteAnnuelle,
} from "@/lib/stats";

export const metadata: Metadata = {
  title: { absolute: "MixiParl' : la mixité des équipes parlementaires" },
  description: "Le taux de mixité des équipes de collaborateurs parlementaires, par élu, groupe et chambre.",
  alternates: { canonical: "/mixiparl" },
};
export const revalidate = 3600;

const CHAMBRES = ["assemblee", "senat"] as const;
const court = (c: string) => (c === "assemblee" ? "AN" : "Sénat");

export default async function MixiParl() {
  let rows: StatElu[] = [];
  let annees: StatMixiteAnnuelle[] = [];
  let indisponible = false;
  try { [rows, annees] = await Promise.all([statsElus(), statsMixiteAnnuelle().catch(() => [])]); } catch { indisponible = true; }
  rows = rows.filter((r) => r.chambre !== "europarl");
  const parChambre = Object.fromEntries(agreger(rows, (r) => r.chambre).map((a) => [a.cle, a]));
  const de = (c: string) => rows.filter((r) => r.chambre === c);
  const m = mixite(rows);

  const carte = (id: string, libelle: string, lignes: StatElu[], href: string, detail?: string, section?: string): CarteBarre | null => {
    const mm = mixiteMoyenne(lignes);
    if (!mm.equipes) return null;
    const f = lignes.reduce((a, r) => a + r.femmes, 0), h = lignes.reduce((a, r) => a + r.hommes, 0);
    return { id, libelle, detail, section, taux: mm.taux, valeur: pct(mm.taux), complement: `${pct(partFemmes({ femmes: f, hommes: h }))} de femmes`, elus: mm.equipes, href };
  };
  const tri = (a: CarteBarre, b: CarteBarre) => (b.taux ?? 0) - (a.taux ?? 0);
  const codeFamille = (r: StatElu) => familleDe(r.chambre, r.elu_groupe)?.code ?? "Autres";
  const familles = [...new Set(rows.map(codeFamille))]
    .map((code) => {
      const lignes = rows.filter((r) => codeFamille(r) === code);
      const an = lignes.some((r) => r.chambre === "assemblee");
      return lignes.reduce((a, r) => a + r.femmes + r.hommes, 0) >= 10
        ? carte(`famille-${code}`, code, lignes, `/mixiparl/${an ? "an" : "senat"}/parlementaires?famille=${encodeURIComponent(code)}`, FAMILLES.find((x) => x.code === code)?.libelle) : null;
    }).filter((x): x is CarteBarre => !!x).sort(tri);
  const groupes = CHAMBRES.flatMap((c) => [...new Set(de(c).map((r) => r.elu_groupe))]
    .map((g) => carte(`groupe-${segmentDe(c)}-${(g || "sans").replace(/[^\p{L}\p{N}]+/gu, "-")}`, g || "Sans groupe", de(c).filter((r) => r.elu_groupe === g),
      `/mixiparl/${segmentDe(c)}/parlementaires?groupe=${encodeURIComponent(g)}`, undefined, CHAMBRE_LONG[c]))
    .filter((x): x is CarteBarre => !!x).sort(tri));
  const an = mixiteMoyenne(de("assemblee"));

  return (
    <>
      <h1>La <span className="surligne-mixi">mixité</span> des équipes</h1>
      <p className="lead">
        Les équipes parlementaires sont-elles mixtes ? Le taux de mixité vaut 100 % pour une équipe à moitié féminine,
        à moitié masculine, et 0 % pour une équipe composée uniquement de femmes ou uniquement d&apos;hommes.
      </p>
      {indisponible && <p className="erreur">Les statistiques sont momentanément indisponibles. Réessaie dans quelques minutes.</p>}
      {/* Trois lignes, une case par chambre (le Parlement européen s'ajoutera sur chaque ligne). */}
      <div className="chiffres mixi paires">
        {CHAMBRES.map((c) => de(c).length > 0 && (
          <div key={c}>
            <strong>{pct(mixiteMoyenne(de(c)).taux)}</strong>
            <span>de mixité en moyenne dans les équipes {c === "assemblee" ? "de l'Assemblée" : "du Sénat"}</span>
            <a className="definition" href="/mixiparl/methode#taux-de-mixite">Définition</a>
          </div>
        ))}
        {CHAMBRES.map((c) => de(c).length > 0 && (
          <div key={`n-${c}`}>
            <strong>{mixite(de(c)).nonMixtes}</strong>
            <span>équipes non mixtes, à 0 % de mixité ({court(c)})</span>
            <a className="definition" href="/mixiparl/methode#non-mixite">Définition</a>
          </div>
        ))}
        {CHAMBRES.map((c) => parChambre[c] && (
          <div key={`f-${c}`}>
            <strong>{pct(partFemmes(parChambre[c]))}</strong>
            <span>de femmes parmi les collaborateurs ({court(c)})</span>
            <a className="definition" href="/mixiparl/methode#part-femmes">Définition</a>
          </div>
        ))}
      </div>
      <p className="meta">
        Calculé sur {m.eligibles.toLocaleString("fr-FR")} équipes de 2 personnes ou plus ; {m.exclues.toLocaleString("fr-FR")} équipes comptant un membre de genre indéterminé sont écartées.
        {m.eligibles > 0 && <> {pct(m.paritaires / m.eligibles)} des équipes sont à parité (40 à 60 % de femmes, soit 80 % de mixité ou plus).</>}
      </p>
      {an.taux !== null && (
        <Partage url="https://www.dataparl.fr/mixiparl" titre="MixiParl'"
          texte={`${pct(an.taux)} de mixité en moyenne dans les équipes de l'Assemblée, ${m.nonMixtes} équipes non mixtes au Parlement : élu par élu sur MixiParl'`} />
      )}

      {annees.length > 0 && (
        <>
          <h2><a className="titre-lien" href="/mixiparl/timeline">L&apos;évolution année par année →</a></h2>
          <div className="graphiques">
            {CHAMBRES.map((c) => (
              <BarresAnnuelles key={c} titre={`Taux de mixité moyen : ${CHAMBRE_LONG[c]}`} couleur="var(--mixi)" max={1} format={(v) => pct(v)}
                points={annees.filter((a) => a.chambre === c).map((a) => ({ an: a.an, valeur: a.mixite_moyenne, detail: `${a.equipes} équipes, dont ${a.non_mixtes} non mixtes` }))} />
            ))}
          </div>
          <p className="meta">Équipes en poste au 1er janvier de chaque année. <a href="/mixiparl/timeline">Voir la série complète, année par année →</a></p>
        </>
      )}

      {familles.length > 0 && (
        <>
          <h2 id="classement">Par famille politique et par groupe</h2>
          <CartesBarres couleur="mixi" entete="Taux de mixité moyen" vues={[
            { cle: "famille", titre: "Par famille", note: "Les groupes équivalents des deux chambres réunis (ex. ECO : GEST au Sénat, EcoS à l'Assemblée). Le nombre d'élus est celui des équipes éligibles.", lignes: familles },
            { cle: "groupe", titre: "Par groupe", lignes: groupes },
          ]} />
        </>
      )}

      {CHAMBRES.map((c) => {
        const eligibles = de(c).filter(equipeEligible).sort((a, b) => (tauxMixite(b) ?? 0) - (tauxMixite(a) ?? 0));
        if (!de(c).length) return null;
        return (
          <section key={c}>
            <h2>{CHAMBRE_LONG[c]}, par élu</h2>
            <RechercheStatElu id={`mixi-${c}`} placeholder={`Chercher un élu ${c === "assemblee" ? "de l'Assemblée" : "du Sénat"}`}
              colonnes={["Femmes", "Hommes", "Taux de mixité"]}
              lignes={de(c).map((r) => ({
                nom: nomAffiche(r.elu_nom), groupe: r.elu_groupe,
                href: `/parlementaires/${encodeURIComponent(idParlementaire(r.chambre, r.elu_id, r.elu_cle, r.elu_nom))}`,
                valeurs: [String(r.femmes), String(r.hommes), equipeEligible(r) ? pct(tauxMixite(r)) : "–"],
              }))} />
            <p><a href={`/mixiparl/${segmentDe(c)}/parlementaires`}>Voir les {eligibles.length} élus, de l&apos;équipe la plus mixte à la moins mixte →</a></p>
          </section>
        );
      })}

      <h2>Méthode</h2>
      <p>
        Taux de mixité = 1 − |2 × part de femmes − 1|, calculé par équipe puis moyenné. Sénat : genre d&apos;après la civilité publiée.
        Assemblée : genre déduit du prénom ; les prénoms mixtes ou inconnus restent indéterminés
        {parChambre.assemblee ? ` (${parChambre.assemblee.indetermines} collaborateurs, soit ${pct(parChambre.assemblee.indetermines / parChambre.assemblee.effectif)})` : ""}.
        Parlement européen : suivi en pause.{" "}
        <a href="/mixiparl/methode">La méthode complète, avec des exemples →</a>
      </p>
    </>
  );
}
