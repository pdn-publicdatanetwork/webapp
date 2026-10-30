import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Tableur from "@/app/_components/Tableur";
import ClassementTop from "@/app/_components/ClassementTop";
import { CHAMBRE_LONG, idParlementaire, nomAffiche } from "@/lib/format";
import { equipeEligible, pct, SEGMENT_CHAMBRE, statsElus, tauxMixite } from "@/lib/stats";

export const revalidate = 3600;
type Props = { params: Promise<{ chambre: string }>; searchParams: Promise<{ ordre?: string }> };

// /mixiparl/{an|senat|pe}/parlementaires : le classement de la mixité des
// équipes de collaborateurs, élu par élu, chambre par chambre. Le top 10 en
// barres donne le classement d'un coup d'œil ; la grille DataParl' Sheets
// reste la vue de référence (recherche Ctrl+F, export CSV).
const LE_DE: Record<string, string> = { assemblee: "de l'Assemblée nationale", senat: "du Sénat", europarl: "du Parlement européen" };
const LIBELLE: Record<string, string> = { an: "l'Assemblée nationale", senat: "le Sénat", pe: "le Parlement européen" };

function chambreDuSegment(seg: string): string | null {
  return SEGMENT_CHAMBRE[seg] ?? (seg === "pe" ? "europarl" : null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seg = (await params).chambre;
  const c = chambreDuSegment(seg);
  if (!c) return {};
  return {
    title: "Mixité des équipes par élu : " + CHAMBRE_LONG[c],
    description: "Le taux de mixité de l'équipe de chaque élu " + (LE_DE[c] ?? CHAMBRE_LONG[c]) + ".",
    alternates: { canonical: "/mixiparl/" + seg + "/parlementaires" },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { chambre: seg } = await params;
  const c = chambreDuSegment(seg);
  if (!c) notFound();
  const autres = ["an", "senat", "pe"].filter((s) => s !== seg);
  const croissant = (await searchParams).ordre === "moins";
  const tries = (await statsElus().catch(() => []))
    .filter((r) => r.chambre === c && equipeEligible(r))
    // À taux de mixité égal, l'élu qui a le plus de collaborateurs passe devant.
    .sort((a, b) => (tauxMixite(b) ?? 0) - (tauxMixite(a) ?? 0) || (b.femmes + b.hommes) - (a.femmes + a.hommes) || a.elu_nom.localeCompare(b.elu_nom, "fr"))
    .map((r, i) => ({ r, rang: i + 1 }));
  const top10 = tries.slice(0, 10);
  if (croissant) {
    tries.sort((a, b) => (tauxMixite(a.r) ?? 0) - (tauxMixite(b.r) ?? 0) || (b.r.femmes + b.r.hommes) - (a.r.femmes + a.r.hommes) || a.rang - b.rang);
  }
  const base = "/mixiparl/" + seg + "/parlementaires";
  const entetes = ["Rang", "Élu", "Groupe", "Équipe", "Femmes", "Hommes", "Part de femmes", "Taux de mixité"];
  const donnees = tries.map(({ r, rang }) => [rang, nomAffiche(r.elu_nom), r.elu_groupe ?? "", r.femmes + r.hommes, r.femmes, r.hommes, pct(r.femmes / (r.femmes + r.hommes)), pct(tauxMixite(r))]);
  const liens = tries.map(({ r }) => [
    null,
    "/parlementaires/" + encodeURIComponent(idParlementaire(r.chambre, r.elu_id, r.elu_cle, r.elu_nom)),
    null, null, null, null, null, null,
  ]);
  return (
    <>
      <h1>{CHAMBRE_LONG[c]} : la mixité <span className="surligne-mixi">élu par élu</span></h1>
      <p className="lead">
        {croissant ? "De l'équipe la moins mixte à la plus mixte." : "De l'équipe la plus mixte à la moins mixte."} À taux
        égal, la plus grande équipe passe devant. Équipes de 2 personnes ou plus, toutes de genre déterminé, dans la
        grille DataParl&apos; Sheets (recherche Ctrl+F, export CSV).{" "}
        <a href="/mixiparl/methode#taux-de-mixite">Définition</a>,{" "}
        <a href={croissant ? base : base + "?ordre=moins"}>{croissant ? "Les plus mixtes d'abord" : "Les moins mixtes d'abord"}</a>, {"Voir aussi : "}
        {autres.map((s, i) => (
          <span key={s}>
            {i > 0 ? ", " : ""}
            <a href={"/mixiparl/" + s + "/parlementaires"}>{LIBELLE[s]}</a>
          </span>
        ))}
      </p>
      <p className="meta">
        Comment lire le taux de mixité : 100 % pour une équipe paritaire (autant de femmes que d&apos;hommes), 0 % pour
        une équipe entièrement féminine ou entièrement masculine. Il vaut 1 − |2 × part de femmes − 1| : une équipe
        comptant 70 % de femmes affiche ainsi 60 %. La part de femmes reste affichée en complément dans la grille.
      </p>
      {top10.length > 0 && (
        <ClassementTop
          titre="Les 10 équipes les plus mixtes, en un coup d'œil"
          barre="surligne-mixi"
          note={<span className="meta">Le classement complet (et l&apos;ordre inverse) suit dans la grille ci-dessous.</span>}
          items={top10.map(({ r }) => ({
            nom: nomAffiche(r.elu_nom),
            lien: "/parlementaires/" + encodeURIComponent(idParlementaire(r.chambre, r.elu_id, r.elu_cle, r.elu_nom)),
            libelle: r.elu_groupe ?? "",
            valeur: tauxMixite(r) ?? 0,
            texte: pct(tauxMixite(r)) + ", " + r.femmes + " femmes, " + r.hommes + " hommes",
          }))}
        />
      )}
      {tries.length === 0 ? (
        <p className="meta">Aucune équipe suivie pour cette chambre pour l&apos;instant : pas encore assez de mois d&apos;historique.</p>
      ) : (
        <Tableur
          id={"mixiparl-elus-" + seg}
          titre="Mixité des équipes, élu par élu"
          description=""
          provenance="Vue stats_turnover_elus (API DataParl'/Supabase), méthode MixiParl'"
          entetes={entetes}
          donnees={donnees}
          liens={liens}
          lectureSeule
        />
      )}
    </>
  );
}
