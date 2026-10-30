import type { Metadata } from "next";
import BarresAnnuelles from "@/app/_components/BarresAnnuelles";
import { CHAMBRE_LONG } from "@/lib/format";
import { partFemmes, pct, statsAnnuelles, statsMixiteAnnuelle } from "@/lib/stats";

export const metadata: Metadata = {
  title: "La mixité des équipes, année par année",
  description: "La série complète du taux de mixité des équipes de collaborateurs parlementaires, à l'Assemblée nationale et au Sénat.",
  alternates: { canonical: "/mixiparl/timeline" },
};
export const revalidate = 3600;
const n = (x: number) => x.toLocaleString("fr-FR");

export default async function Timeline() {
  const [mix, annees] = await Promise.all([statsMixiteAnnuelle().catch(() => []), statsAnnuelles().catch(() => [])]);
  return (
    <>
      <p className="meta"><a href="/mixiparl">MixiParl&apos;</a></p>
      <h1>La mixité, <span className="surligne-mixi">année par année</span></h1>
      <p className="lead">Le taux de mixité moyen des équipes en poste au 1er janvier de chaque année, et la part de femmes parmi les collaborateurs. <a href="/mixiparl/methode#taux-de-mixite">Définition</a></p>
      {mix.length === 0 && <p className="erreur">Les statistiques sont momentanément indisponibles.</p>}
      {(["assemblee", "senat"] as const).map((c) => {
        const serie = mix.filter((a) => a.chambre === c);
        if (!serie.length) return null;
        const pf = new Map(annees.filter((a) => a.chambre === c).map((a) => [a.an, a]));
        return (
          <section key={c}>
            <h2>{CHAMBRE_LONG[c]}</h2>
            <BarresAnnuelles titre={`Taux de mixité moyen : ${CHAMBRE_LONG[c]}`} couleur="var(--mixi)" max={1} format={(v) => pct(v)}
              points={serie.map((a) => ({ an: a.an, valeur: a.mixite_moyenne, detail: `${a.equipes} équipes` }))} />
            <div className="defile">
              <table className="stats">
                <thead><tr><th>1er janvier</th><th className="num">Équipes éligibles</th><th className="num">Équipes écartées</th><th className="num">Non mixtes</th><th className="num">Taux de mixité moyen</th><th className="num">Femmes</th><th className="num">Hommes</th><th className="num">Part de femmes</th></tr></thead>
                <tbody>{serie.map((a) => {
                  const p = pf.get(a.an);
                  return (
                    <tr key={a.an}><td>{a.an}</td><td className="num">{n(a.equipes)}</td><td className="num">{n(a.equipes_exclues)}</td><td className="num">{n(a.non_mixtes)}</td>
                      <td className="num">{pct(a.mixite_moyenne, 1)}</td><td className="num">{p ? n(p.femmes) : "–"}</td><td className="num">{p ? n(p.hommes) : "–"}</td><td className="num">{p ? pct(partFemmes(p), 1) : "–"}</td></tr>
                  );
                })}</tbody>
              </table>
            </div>
          </section>
        );
      })}
      <p className="meta">Équipes écartées : celles qui comptent un membre de genre indéterminé. Parlement européen : suivi en pause.</p>
    </>
  );
}
