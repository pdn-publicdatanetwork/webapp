import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CourbeMensuelle } from "@/app/_components/CourbesMensuelles";
import { eluDepuisId, statsElu } from "@/lib/elus";
import { historiqueMensuel } from "@/lib/indicateurs";
import { CHAMBRE_LONG, idParlementaire, nomAffiche } from "@/lib/format";
import { pct, tauxMixite } from "@/lib/stats";

export const revalidate = 86400;
type Props = { params: Promise<{ chambre: string }> };

// /mixiparl/<id-parlementaire> : mixité de l'équipe d'un élu, mois par mois.
// /mixiparl/{an,senat,pe} renvoient vers le classement correspondant.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent((await params).chambre);
  const e = await eluDepuisId(id).catch(() => null);
  if (!e) return { title: "MixiParl'" };
  return {
    title: nomAffiche(e.nom) + " : la mixité de son équipe, mois par mois",
    description: "Historique mensuel de la mixité de l'équipe de collaborateurs de " + nomAffiche(e.nom) + " : part de femmes et taux de mixité depuis le début du mandat.",
    alternates: { canonical: "/mixiparl/" + encodeURIComponent(idParlementaire(e.chambre, e.id, e.cle, e.nom)) },
  };
}

export default async function Page({ params }: Props) {
  const id = decodeURIComponent((await params).chambre);
  if (id === "an" || id === "senat" || id === "pe") redirect("/mixiparl/" + id + "/parlementaires");
  const e = await eluDepuisId(id).catch(() => null);
  if (!e) notFound();
  const nom = nomAffiche(e.nom);
  const [{ points, debutSuivi }, stat] = await Promise.all([
    historiqueMensuel(e).catch(() => ({ points: [] as { mois: string; femmes: number; hommes: number; arrivees: number; departs: number }[], debutSuivi: null as string | null })),
    statsElu(e).catch(() => null),
  ]);
  const hrefFiche = "/parlementaires/" + encodeURIComponent(idParlementaire(e.chambre, e.id, e.cle, e.nom));
  const dernier = points[points.length - 1] ?? null;
  const partFemmes = (f: number, h: number): number | null => (f + h > 0 ? f / (f + h) : null);
  const seriePart = points.map((p) => ({ mois: p.mois, valeur: partFemmes(p.femmes, p.hommes) }));
  const serieMixite = points.map((p) => ({ mois: p.mois, valeur: tauxMixite(p) }));
  const eligible = dernier ? dernier.femmes + dernier.hommes >= 2 : false;

  return (
    <>
      <p className="meta"><a href="/mixiparl">MixiParl&apos;</a>, <a href={"/mixiparl/" + (e.chambre === "assemblee" ? "an" : e.chambre === "senat" ? "senat" : "pe") + "/parlementaires"}>Classement {CHAMBRE_LONG[e.chambre]}</a></p>
      <h1>La mixité de l&apos;équipe de <span className="surligne-mixi">{nom}</span></h1>
      <p className="lead">
        Femmes et hommes dans l&apos;équipe de collaborateurs de {nom}{e.groupe ? " (" + e.groupe + ")" : ""}, mois par mois depuis le début du
        mandat. <a href={hrefFiche}>Voir la fiche complète</a>. <a href="/mixiparl/methode#taux-de-mixite">Définition du taux de mixité</a>
      </p>

      <div className="chiffres mixi paires">
        <div>
          <strong>{dernier ? dernier.femmes + " / " + dernier.hommes : "–"}</strong>
          <span>femmes / hommes aujourd&apos;hui</span>
        </div>
        <div>
          <strong>{dernier ? pct(partFemmes(dernier.femmes, dernier.hommes)) : "–"}</strong>
          <span>part de femmes</span>
        </div>
        <div>
          <strong>{dernier && eligible ? pct(tauxMixite(dernier), 1) : "–"}</strong>
          <span>taux de mixité (100 % à 50/50)</span>
        </div>
      </div>
      {!eligible && <p className="meta">L&apos;indicateur de mixité compte pour les équipes de 2 personnes ou plus : l&apos;équipe actuelle n&apos;est pas (ou plus) éligible, la série reste néanmoins tracée.</p>}

      {points.length < 2 ? (
        <p className="erreur">Pas encore assez de mois de suivi pour tracer l&apos;historique de cette équipe.</p>
      ) : (
        <>
          <CourbeMensuelle titre="Part de femmes dans l'équipe, fin de mois" points={seriePart} couleur="var(--mixi, #7B3FE4)" max={1} format={(v) => pct(v, 0)} legende={debutSuivi ? "suivi depuis " + debutSuivi : undefined} />
          <CourbeMensuelle titre="Taux de mixité de l'équipe, fin de mois" points={serieMixite} couleur="var(--bleu)" max={1} format={(v) => pct(v, 0)} />

          <div className="defile">
            <table className="stats">
              <thead><tr><th>Mois</th><th className="num">Femmes</th><th className="num">Hommes</th><th className="num">Part de femmes</th><th className="num">Taux de mixité</th><th className="num">Arrivées</th><th className="num">Départs</th></tr></thead>
              <tbody>
                {points.slice().reverse().map((p) => (
                  <tr key={p.mois}>
                    <td>{p.mois}</td>
                    <td className="num">{p.femmes}</td>
                    <td className="num">{p.hommes}</td>
                    <td className="num">{partFemmes(p.femmes, p.hommes) === null ? "–" : pct(partFemmes(p.femmes, p.hommes))}</td>
                    <td className="num">{tauxMixite(p) === null ? "–" : pct(tauxMixite(p), 0)}</td>
                    <td className="num">{p.arrivees || "–"}</td>
                    <td className="num">{p.departs || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {stat && stat.indetermines > 0 && <p className="meta">{stat.indetermines} collaborateur(s) de genre indéterminé ne sont pas comptés dans la mixité.</p>}
    </>
  );
}
