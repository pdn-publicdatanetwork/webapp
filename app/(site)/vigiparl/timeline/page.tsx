import type { Metadata } from "next";
import BarresAnnuelles from "@/app/_components/BarresAnnuelles";
import { CHAMBRE_LONG } from "@/lib/format";
import { pct, statsAnnuelles, turnoverAnnuel } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Le renouvellement des équipes, année par année",
  description: "La série complète du taux de renouvellement annuel des collaborateurs parlementaires, à l'Assemblée nationale et au Sénat.",
  alternates: { canonical: "/vigiparl/timeline" },
};
export const revalidate = 3600;
const n = (x: number) => x.toLocaleString("fr-FR");

export default async function Timeline() {
  const annees = await statsAnnuelles().catch(() => []);
  const courante = new Date().getFullYear();
  return (
    <>
      <p className="meta"><a href="/vigiparl">VigiParl&apos;</a></p>
      <h1>Le renouvellement, <span className="surligne-vigi">année par année</span></h1>
      <p className="lead">Départs de l&apos;année ÷ effectif moyen (1er janvier de l&apos;année et de la suivante), hors départs liés à la fin de mandat de l&apos;élu. <a href="/vigiparl/methode#taux-annuel">Définition</a></p>
      {annees.length === 0 && <p className="erreur">Les statistiques sont momentanément indisponibles.</p>}
      {(["assemblee", "senat"] as const).map((c) => {
        const serie = annees.filter((a) => a.chambre === c);
        if (!serie.length) return null;
        return (
          <section key={c}>
            <h2>{CHAMBRE_LONG[c]}</h2>
            <BarresAnnuelles titre={`Renouvellement annuel : ${CHAMBRE_LONG[c]}`} couleur="var(--vigi)" enCours={courante} format={(v) => pct(v)} max={0.8}
              points={serie.map((a) => ({ an: a.an, valeur: turnoverAnnuel(a), detail: `${a.departs} départs` }))} />
            <div className="defile">
              <table className="stats">
                <thead><tr><th>Année</th><th className="num">Effectif 1er janv.</th><th className="num">Départs comptés</th><th className="num">Départs exclus (fin de mandat)</th><th className="num">Arrivées</th><th className="num">Taux</th></tr></thead>
                <tbody>{serie.map((a) => (
                  <tr key={a.an}><td>{a.an}{a.an === courante ? " (en cours)" : ""}</td><td className="num">{n(a.effectif)}</td><td className="num">{n(a.departs)}</td>
                    <td className="num">{n(a.departs_fin_mandat ?? 0)}</td><td className="num">{n(a.arrivees)}</td><td className="num">{pct(turnoverAnnuel(a), 1)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        );
      })}
      <p className="meta">L&apos;année en cours est partielle. Parlement européen : suivi en pause.</p>
    </>
  );
}
