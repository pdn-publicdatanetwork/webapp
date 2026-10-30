import type { Metadata } from "next";
import BarresAnnuelles from "@/app/_components/BarresAnnuelles";
import { PiedMethode, VersionMethode } from "@/app/_components/EnTeteMethode";
import { derniersJours } from "@/lib/daily";
import { CHAMBRE_LONG } from "@/lib/format";
import {
  agreger, dernieresExtractions, HISTORIQUE_METHODE, mois, pct, statsAnnuelles, statsDurees, statsElus, statsFenetre, tauxTurnover, turnoverAnnuel,
  type StatAnnuelle, type StatDuree, type StatElu, type StatFenetre,
} from "@/lib/stats";

export const metadata: Metadata = {
  title: "Méthode VigiParl' : le taux de renouvellement",
  description: "Comment DataParl' calcule le renouvellement des équipes parlementaires : formules, exclusions, exemple chiffré, limites et données brutes.",
  alternates: { canonical: "/vigiparl/methode" },
};
export const revalidate = 3600;

const n = (x: number) => x.toLocaleString("fr-FR");
const CH = ["assemblee", "senat"] as const;
const dans = (c: string) => (c === "assemblee" ? "à l'Assemblée" : "au Sénat");

export default async function MethodeVigiParl() {
  let rows: StatElu[] = [], annees: StatAnnuelle[] = [], durees: StatDuree[] = [], fenetre: StatFenetre[] = [];
  let donnees: string | null = null;
  const extractions = await dernieresExtractions().catch(() => []);
  [rows, annees, durees, fenetre, donnees] = await Promise.all([
    statsElus().catch(() => []), statsAnnuelles().catch(() => []), statsDurees().catch(() => []), statsFenetre().catch(() => []),
    derniersJours(1).then((j) => j[0]?.date ?? null).catch(() => null),
  ]);
  const parChambre = Object.fromEntries(agreger(rows, (r) => r.chambre).map((a) => [a.cle, a]));
  const f = Object.fromEntries(fenetre.map((x) => [x.chambre, x]));
  const d = Object.fromEntries(durees.map((x) => [x.chambre, x]));
  const anneeCourante = new Date().getFullYear();
  // Exemple : la dernière année complète de l'Assemblée.
  const ex = [...annees].filter((a) => a.chambre === "assemblee" && a.an < anneeCourante).sort((a, b) => b.an - a.an)[0];
  const ex2024 = annees.find((a) => a.chambre === "assemblee" && a.an === 2024);

  return (
    <div className="methode">
      <p className="meta"><a href="/vigiparl">VigiParl&apos;</a></p>
      <h1>Méthode <span className="surligne-vigi">VigiParl&apos;</span></h1>
      <VersionMethode donnees={donnees} historique={HISTORIQUE_METHODE.vigiparl} />
      <p className="lead">
        La question : <strong>les élus gardent-ils leurs collaborateurs ?</strong> Le taux de renouvellement mesure la part
        d&apos;une équipe qui part en un an. Il ne dit rien des raisons d&apos;un départ (fin de contrat, promotion, conflit) :
        c&apos;est un signal à mettre en contexte, pas un jugement.
      </p>

      <h2 id="donnees-de-base">Les données de base</h2>
      <ul>
        <li><strong>Population</strong> : tous les collaborateurs parlementaires présents dans les listes officielles publiées par l&apos;Assemblée nationale et le Sénat. Le Parlement européen est suivi mais sans statistiques pour l&apos;instant (suivi en pause).</li>
        <li><strong>Un poste</strong> : la période continue pendant laquelle une personne travaille pour un même élu.</li>
        <li><strong>Un départ</strong> est daté au jour de la publication officielle du retrait. Les listes ne donnent pas la date réelle de fin de contrat : nous retenons la date de publication.</li>
        <li><strong>Un transfert</strong> (passage d&apos;un élu à un autre) compte comme un départ pour l&apos;élu quitté et une arrivée pour le nouvel élu.</li>
      </ul>

      <h2 id="exclusions">Ce qui est exclu, et pourquoi</h2>
      <p>
        Les départs liés à la <strong>fin de mandat de l&apos;élu</strong> (non-réélection, démission, décès, dissolution) ne sont pas
        comptés : quand l&apos;élu s&apos;en va, toute l&apos;équipe part avec lui, ce qui ne dit rien de sa capacité à garder ses
        collaborateurs. De même, les recrutements d&apos;un élu qui arrive ne comptent pas comme des arrivées. Ces mouvements sont
        recensés à part et restent visibles dans les chiffres bruts.
      </p>
      {fenetre.length > 0 && (
        <div className="defile"><table className="stats">
          <thead><tr><th>12 derniers mois</th><th className="num">Départs comptés</th><th className="num">Départs exclus (fin de mandat)</th><th className="num">Arrivées comptées</th><th className="num">Arrivées exclues (début de mandat)</th></tr></thead>
          <tbody>{CH.filter((c) => f[c]).map((c) => (
            <tr key={c}><td>{CHAMBRE_LONG[c]}</td><td className="num">{n(f[c].departs)}</td><td className="num">{n(f[c].departs_fin_mandat)}</td><td className="num">{n(f[c].arrivees)}</td><td className="num">{n(f[c].arrivees_debut_mandat)}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      {ex2024 && (ex2024.departs_fin_mandat ?? 0) > 0 && (
        <p className="meta">
          Exemple : en 2024, la dissolution de l&apos;Assemblée a entraîné {n(ex2024.departs_fin_mandat ?? 0)} départs de fin de mandat,
          exclus du taux, contre {n(ex2024.departs)} départs comptés.
        </p>
      )}

      <h2 id="taux-annuel">Le taux de renouvellement annuel</h2>
      <p>C&apos;est le chiffre des graphiques « année par année ».</p>
      <div className="formule">
        <p><code>Taux (année N) = départs de l&apos;année N (hors fin de mandat) ÷ effectif moyen</code></p>
        <p><code>Effectif moyen = (effectif au 1er janvier N + effectif au 1er janvier N+1) ÷ 2</code></p>
      </div>
      {ex && (
        <div className="exemple">
          <strong>Exemple chiffré : Assemblée nationale, {ex.an}</strong>
          <p style={{ margin: "6px 0 0" }}>
            Effectif au 1er janvier {ex.an} : {n(ex.effectif)} ; au 1er janvier {ex.an + 1} : {n(ex.effectif_suivant)}.
            Effectif moyen : ({n(ex.effectif)} + {n(ex.effectif_suivant)}) ÷ 2 = {n((ex.effectif + ex.effectif_suivant) / 2)}.
            Départs comptés : {n(ex.departs)}. Taux : {n(ex.departs)} ÷ {n((ex.effectif + ex.effectif_suivant) / 2)} = <strong>{pct(turnoverAnnuel(ex), 1)}</strong>.
          </p>
        </div>
      )}
      <p>L&apos;année en cours est partielle : sa barre est atténuée et marquée « année en cours ».</p>

      <h2 id="taux-12-mois">Le taux de renouvellement sur 12 mois</h2>
      <p>C&apos;est le chiffre en tête de VigiParl&apos;, et celui de chaque élu, groupe et famille : une fenêtre glissante des 365 derniers jours, avec la même formule.</p>
      <div className="formule">
        <p><code>Taux = départs des 12 derniers mois (hors fin de mandat) ÷ effectif moyen</code></p>
        <p><code>Effectif moyen = (effectif il y a 12 mois + effectif actuel) ÷ 2</code>, où l&apos;effectif d&apos;il y a 12 mois = effectif actuel − arrivées + départs.</p>
      </div>
      {CH.filter((c) => parChambre[c]).map((c) => {
        const a = parChambre[c];
        const moyen = a.effectif + (a.departs_12m - a.arrivees_12m) / 2;
        return (
          <p key={c}>
            {CHAMBRE_LONG[c]} : {n(a.effectif)} collaborateurs aujourd&apos;hui, {n(a.arrivees_12m)} arrivées et {n(a.departs_12m)} départs
            en 12 mois, soit un effectif moyen de {n(Math.round(moyen))} et un taux de <strong>{pct(tauxTurnover(a))}</strong> {dans(c)}.
          </p>
        );
      })}
      <p className="meta">Un taux supérieur à 100 % signifie que l&apos;équipe a été renouvelée plus d&apos;une fois dans l&apos;année. Les élus dont l&apos;équipe compte moins de 3 personnes sur la période sont écartés du classement par élu.</p>

      <h2 id="duree-mediane">La durée médiane d&apos;un poste</h2>
      <p>
        La moitié des postes ont duré moins, l&apos;autre moitié plus. Elle est calculée sur les <strong>postes terminés</strong> dont
        l&apos;arrivée et le départ sont datés : durée = date de fin − date de début.
      </p>
      <ul>
        {CH.filter((c) => d[c]).map((c) => {
          const x = d[c];
          const couverture = x.postes_termines_tous ? x.postes_termines / x.postes_termines_tous : null;
          return (
            <li key={c}>
              {CHAMBRE_LONG[c]} : <strong>{mois(x.duree_mediane_jours)}</strong>, calculée sur {n(x.postes_termines)} postes
              {couverture !== null ? `, soit ${pct(couverture)} des postes terminés` : ""}.
            </li>
          );
        })}
      </ul>
      <p className="meta">
        Les postes dont l&apos;arrivée est antérieure aux archives (présents dès la première liste, sans date d&apos;arrivée) sont exclus.
        Les postes en cours n&apos;ont pas encore de durée définitive : les ignorer sous-estime un peu les longues durées (biais de censure).
      </p>

      <h2 id="cas-particuliers">Cas particuliers</h2>
      <ul>
        <li><strong>Transferts entre élus</strong> : le poste chez A se termine, un poste chez B commence (un départ compté, une arrivée comptée).</li>
        <li><strong>Renouvellements sénatoriaux</strong> : tous les trois ans, la moitié du Sénat est renouvelée ; les départs des équipes des sénateurs non réélus sont exclus du taux mais visibles dans les chiffres bruts.</li>
        <li><strong>Arrivées sans départ connu</strong> : la personne compte dans l&apos;effectif, pas dans le taux.</li>
        <li><strong>Homonymes</strong> : un collaborateur est reconnu à son nom ; deux homonymes dans la même chambre peuvent être confondus.</li>
      </ul>

      <h2 id="limites">Limites</h2>
      <ul>
        <li>Les dates sont celles de publication, pas les dates réelles d&apos;embauche ou de fin de contrat.</li>
        <li>Sur les périodes couvertes par des archives espacées (avant le suivi quotidien), plusieurs mouvements peuvent être regroupés à une même date.</li>
        <li>Les archives commencent en 2015 au Sénat et en 2017 à l&apos;Assemblée pour les durées ; les séries annuelles commencent en {annees.length ? Math.min(...annees.map((a) => a.an)) : 2016}.</li>
        <li>L&apos;année en cours est partielle.</li>
      </ul>

      {annees.length > 0 && (
        <>
          <h2 id="table-annuelle">La table annuelle</h2>
          <p>
            Les graphiques « année par année » de VigiParl&apos;, chiffre par chiffre : effectifs au 1er janvier,
            arrivées et départs, en distinguant les mouvements comptés dans le taux et ceux exclus
            (fin ou début de mandat de l&apos;élu).
          </p>
          <div className="graphes-annuels">
            {CH.filter((c) => annees.some((a) => a.chambre === c)).map((c) => (
              <BarresAnnuelles key={c} titre={`Renouvellement annuel, ${CHAMBRE_LONG[c]}`} couleur="var(--vigi)" enCours={anneeCourante}
                format={(v) => pct(v)} max={0.8}
                points={annees.filter((a) => a.chambre === c).map((a) => ({ an: a.an, valeur: turnoverAnnuel(a), detail: `${a.departs} départs, ${a.effectif} collaborateurs au 1er janvier` }))} />
            ))}
          </div>
          <div className="defile">
            <table className="stats">
              <thead><tr><th>Année</th><th>Chambre</th><th className="num">Effectif 1er janv.</th><th className="num">Effectif 1er janv. suivant</th><th className="num">Arrivées comptées</th><th className="num">Arrivées exclues (début de mandat)</th><th className="num">Départs comptés</th><th className="num">Départs exclus (fin de mandat)</th><th className="num">Taux</th></tr></thead>
              <tbody>{annees.map((a) => (
                <tr key={`${a.chambre}-${a.an}`}><td>{a.an}{a.an === anneeCourante ? " (en cours)" : ""}</td><td>{CHAMBRE_LONG[a.chambre]}</td>
                  <td className="num">{n(a.effectif)}</td><td className="num">{n(a.effectif_suivant)}</td><td className="num">{n(a.arrivees ?? 0)}</td>
                  <td className="num">{n(a.arrivees_debut_mandat ?? 0)}</td><td className="num">{n(a.departs)}</td>
                  <td className="num">{n(a.departs_fin_mandat ?? 0)}</td><td className="num">{pct(turnoverAnnuel(a), 1)}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="meta">
            Cette table est consultable en direct dans <strong>DataParl&apos; Sheets</strong>, le tableur maison de
            DataParl&apos; (données lues en continu sur l&apos;API, tri, filtre, export) :
            <a href="https://media.dataparl.fr/sheets/vigiparl-annual-chart"> media.dataparl.fr/sheets/vigiparl-annual-chart</a>.
          </p>
        </>
      )}
      <PiedMethode historique={HISTORIQUE_METHODE.vigiparl} extractions={extractions} />
    </div>
  );
}
