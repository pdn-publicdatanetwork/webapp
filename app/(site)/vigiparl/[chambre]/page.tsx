import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarresMensuelles, CourbeMensuelle } from "@/app/_components/CourbesMensuelles";
import ClassementTop from "@/app/_components/ClassementTop";
import { eluDepuisId, statsElu } from "@/lib/elus";
import { historiqueMensuel } from "@/lib/indicateurs";
import { CHAMBRE_LONG, idParlementaire, nomAffiche } from "@/lib/format";
import { pct, statsElus, tauxTurnover, type StatElu } from "@/lib/stats";

export const revalidate = 86400;
type Props = { params: Promise<{ chambre: string }> };

// /vigiparl/{an,senat,pe} : la page Turnover de chaque chambre : le mot-clé
// « turnover » est celui des recherches ; le site parle de renouvellement.
// /vigiparl/<id-parlementaire> : historique mensuel de l'équipe d'un élu.
const SEGMENTS: Record<string, "assemblee" | "senat" | "europarl"> = { an: "assemblee", senat: "senat", pe: "europarl" };
const AU: Record<string, string> = { assemblee: "à l'Assemblée nationale", senat: "au Sénat", europarl: "au Parlement européen" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent((await params).chambre);
  if (SEGMENTS[id]) {
    const c = SEGMENTS[id];
    return {
      title: "Turnover " + CHAMBRE_LONG[c] + " : le renouvellement des équipes de collaborateurs",
      description: "Le turnover (taux de renouvellement) des équipes de collaborateurs " + AU[c] + " sur 12 mois : les équipes les plus renouvelées et le classement complet, élu par élu.",
      alternates: { canonical: "/vigiparl/" + id },
    };
  }
  const e = await eluDepuisId(id).catch(() => null);
  if (!e) return { title: "VigiParl'" };
  return {
    title: nomAffiche(e.nom) + " : le renouvellement de son équipe, mois par mois",
    description: "Historique mensuel de l'équipe de collaborateurs de " + nomAffiche(e.nom) + " : effectif, arrivées et départs depuis le début du mandat, et taux de renouvellement sur 12 mois.",
    alternates: { canonical: "/vigiparl/" + encodeURIComponent(idParlementaire(e.chambre, e.id, e.cle, e.nom)) },
  };
}

// Page Turnover d'une chambre : l'aperçu chiffré et le top 10, avec le
// classement complet élu par élu à la clé.
async function PageTurnover({ seg, chambre }: { seg: string; chambre: "assemblee" | "senat" | "europarl" }) {
  const stats = (await statsElus().catch((): StatElu[] => [])).filter((r) => r.chambre === chambre);
  const suivis = stats.filter((r) => r.effectif > 0);
  const enPoste = suivis.reduce((n, r) => n + r.effectif, 0);
  const departs = suivis.reduce((n, r) => n + r.departs_12m, 0);
  const top = stats
    .filter((r) => r.effectif + r.departs_12m >= 3)
    .sort((a, b) => (tauxTurnover(b) ?? 0) - (tauxTurnover(a) ?? 0))
    .slice(0, 10);
  return (
    <>
      <p className="meta"><a href="/vigiparl">VigiParl&apos;</a></p>
      <h1>Turnover <span className="surligne-vigi">{CHAMBRE_LONG[chambre]}</span></h1>
      <p className="lead">
        Le turnover (le taux de renouvellement) des équipes de collaborateurs {AU[chambre]} : qui garde son
        équipe, qui la renouvelle sans cesse, sur les 12 derniers mois. Le classement complet, élu par élu :{" "}
        <a href={"/vigiparl/" + seg + "/parlementaires"}>voir les {top.length > 0 ? stats.filter((r) => r.effectif + r.departs_12m >= 3).length + " élus" : "la liste"}</a>.{" "}
        <a href="/vigiparl/methode">Méthode</a>
      </p>
      {suivis.length === 0 ? (
        <p className="meta">
          {chambre === "europarl"
            ? "Parlement européen : le suivi des équipes a repris le 8 octobre 2026 : les indicateurs de renouvellement arriveront avec 12 mois de recul."
            : "Pas encore d'équipe suivie pour cette chambre pour l'instant."}
        </p>
      ) : (
        <>
          <div className="chiffres vigi paires">
            <div><strong>{enPoste.toLocaleString("fr-FR")}</strong><span>collaborateurs en poste</span></div>
            <div><strong>{departs.toLocaleString("fr-FR")}</strong><span>départs sur 12 mois</span></div>
            <div><strong>{suivis.length.toLocaleString("fr-FR")}</strong><span>équipes suivies</span></div>
          </div>
          <ClassementTop
            titre="Les 10 équipes les plus renouvelées sur 12 mois"
            barre="surligne-vigi"
            note={<span className="meta">Départs rapportés à l&apos;effectif moyen, <a href={"/vigiparl/" + seg + "/parlementaires"}>classement complet</a></span>}
            items={top.map((r) => ({
              nom: nomAffiche(r.elu_nom),
              lien: "/parlementaires/" + encodeURIComponent(idParlementaire(r.chambre, r.elu_id, r.elu_cle, r.elu_nom)),
              libelle: r.elu_groupe ?? "",
              valeur: tauxTurnover(r) ?? 0,
              texte: pct(tauxTurnover(r)) + ", " + r.departs_12m + " départs, équipe de " + r.effectif,
            }))}
          />
        </>
      )}
      <p className="meta">
        Le renouvellement des équipes, chambre par chambre :{" "}
        {(["an", "senat", "pe"] as const).filter((s) => s !== seg).map((s, i, a) => (
          <span key={s}>{i > 0 ? ", " : ""}<a href={"/vigiparl/" + s}>{"Turnover " + (s === "an" ? "Assemblée nationale" : s === "senat" ? "Sénat" : "Parlement européen")}</a></span>
        ))}, <a href="/mixiparl">MixiParl&apos;</a> (la mixité des équipes)
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "Turnover " + CHAMBRE_LONG[chambre],
            description: "Taux de renouvellement (turnover) sur 12 mois des équipes de collaborateurs parlementaires " + AU[chambre] + ", élu par élu.",
            url: "https://www.dataparl.fr/vigiparl/" + seg,
            creator: { "@type": "Organization", name: "DataParl'", url: "https://www.dataparl.fr" },
            isAccessibleForFree: true,
          }),
        }}
      />
    </>
  );
}

export default async function Page({ params }: Props) {
  const id = decodeURIComponent((await params).chambre);
  if (SEGMENTS[id]) return PageTurnover({ seg: id, chambre: SEGMENTS[id] });
  const e = await eluDepuisId(id).catch(() => null);
  if (!e) notFound();
  const nom = nomAffiche(e.nom);
  const [{ points, debutSuivi }, stat] = await Promise.all([
    historiqueMensuel(e).catch(() => ({ points: [] as { mois: string; femmes: number; hommes: number; arrivees: number; departs: number }[], debutSuivi: null as string | null })),
    statsElu(e).catch(() => null),
  ]);
  const hrefFiche = "/parlementaires/" + encodeURIComponent(idParlementaire(e.chambre, e.id, e.cle, e.nom));
  const effectifs = points.map((p) => ({ mois: p.mois, valeur: p.femmes + p.hommes }));
  const maxEffectif = Math.max(2, ...effectifs.map((p) => p.valeur ?? 0));
  const dernier = points[points.length - 1];

  return (
    <>
      <p className="meta"><a href="/vigiparl">VigiParl&apos;</a>, <a href={"/vigiparl/" + (e.chambre === "assemblee" ? "an" : e.chambre === "senat" ? "senat" : "pe")}>Turnover {CHAMBRE_LONG[e.chambre]}</a></p>
      <h1>Le renouvellement de l&apos;équipe de <span className="surligne-vigi">{nom}</span></h1>
      <p className="lead">
        L&apos;équipe de collaborateurs de {nom}{e.groupe ? " (" + e.groupe + ")" : ""}, mois par mois depuis le début du mandat : effectif,
        arrivées et départs. <a href={hrefFiche}>Voir la fiche complète</a>. <a href="/vigiparl/methode">Méthode</a>
      </p>

      <div className="chiffres vigi paires">
        <div>
          <strong>{dernier ? dernier.femmes + dernier.hommes : e.n_collabs}</strong>
          <span>collaborateur{dernier && dernier.femmes + dernier.hommes > 1 ? "s" : ""} aujourd&apos;hui</span>
        </div>
        <div>
          <strong>{stat?.departs_12m ?? "–"}</strong>
          <span>départs sur 12 mois</span>
        </div>
        <div>
          <strong>{stat ? pct(tauxTurnover(stat)) : "–"}</strong>
          <span>taux de renouvellement (12 mois)</span>
        </div>
      </div>

      {points.length < 2 ? (
        <p className="erreur">Pas encore assez de mois de suivi pour tracer l&apos;historique de cette équipe.</p>
      ) : (
        <>
          <CourbeMensuelle titre="Effectif de l'équipe, fin de mois" points={effectifs} couleur="var(--vigi, #C8102E)" max={maxEffectif} format={(v) => String(Math.round(v))} legende={debutSuivi ? "suivi depuis " + debutSuivi : undefined} />
          <BarresMensuelles titre="Arrivées et départs par mois" points={points.map((p) => ({ mois: p.mois, arrivees: p.arrivees, departs: p.departs }))} />

          <div className="defile">
            <table className="stats">
              <thead><tr><th>Mois</th><th className="num">Équipe (fin de mois)</th><th className="num">Arrivées</th><th className="num">Départs</th></tr></thead>
              <tbody>
                {points.slice().reverse().map((p) => (
                  <tr key={p.mois}>
                    <td>{p.mois}</td>
                    <td className="num">{p.femmes + p.hommes}</td>
                    <td className="num">{p.arrivees || "–"}</td>
                    <td className="num">{p.departs || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {stat?.premier_depart && (
        <p className="meta">
          Premier départ enregistré dans l&apos;équipe :{" "}
          {new Date(stat.premier_depart).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}.
        </p>
      )}
    </>
  );
}
