import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Tableur from "@/app/_components/Tableur";
import ClassementTop from "@/app/_components/ClassementTop";
import { CHAMBRE_LONG, idParlementaire, nomAffiche } from "@/lib/format";
import { pct, SEGMENT_CHAMBRE, statsElus, tauxTurnover } from "@/lib/stats";

export const revalidate = 3600;
type Props = { params: Promise<{ chambre: string }> };

// /vigiparl/{an|senat|pe}/parlementaires : le classement du renouvellement
// des équipes de collaborateurs, élu par élu, chambre par chambre. Le top 10
// en barres donne le classement d'un coup d'œil ; la grille DataParl' Sheets
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
    title: "Renouvellement des équipes par élu : " + CHAMBRE_LONG[c],
    description: "Le classement des élus " + (LE_DE[c] ?? CHAMBRE_LONG[c]) + " selon le renouvellement de leur équipe de collaborateurs sur 12 mois.",
    alternates: { canonical: "/vigiparl/" + seg + "/parlementaires" },
  };
}

export default async function Page({ params }: Props) {
  const { chambre: seg } = await params;
  const c = chambreDuSegment(seg);
  if (!c) notFound();
  const autres = ["an", "senat", "pe"].filter((s) => s !== seg);
  const tous = (await statsElus().catch(() => []))
    .filter((r) => r.chambre === c && r.effectif + r.departs_12m >= 3)
    .sort((a, b) => (tauxTurnover(b) ?? 0) - (tauxTurnover(a) ?? 0));
  const top10 = tous.slice(0, 10);
  const entetes = ["Rang", "Élu", "Groupe", "Équipe actuelle", "Départs 12 mois", "Arrivées 12 mois", "Taux"];
  const donnees = tous.map((r, i) => [i + 1, nomAffiche(r.elu_nom), r.elu_groupe ?? "", r.effectif, r.departs_12m, r.arrivees_12m, pct(tauxTurnover(r))]);
  const liens = tous.map((r) => [
    null,
    "/parlementaires/" + encodeURIComponent(idParlementaire(r.chambre, r.elu_id, r.elu_cle, r.elu_nom)),
    null, null, null, null, null,
  ]);
  return (
    <>
      <p className="meta"><a href="/vigiparl">VigiParl&apos;</a></p>
      <h1>{CHAMBRE_LONG[c]} : le renouvellement <span className="surligne-vigi">élu par élu</span></h1>
      <p className="lead">
        Du renouvellement le plus fort au plus faible, sur les 12 derniers mois, dans la grille DataParl&apos; Sheets
        (recherche Ctrl+F, export CSV). Les équipes de moins de 3 personnes sur la période sont écartées.{" "}
        <a href="/vigiparl/methode#taux-12-mois">Définition</a>, {"Voir aussi : "}
        {autres.map((s, i) => (
          <span key={s}>
            {i > 0 ? ", " : ""}
            <a href={"/vigiparl/" + s + "/parlementaires"}>{LIBELLE[s]}</a>
          </span>
        ))}
      </p>
      {top10.length > 0 && (
        <ClassementTop
          titre="Les 10 équipes les plus renouvelées, en un coup d'œil"
          barre="surligne-vigi"
          note={<span className="meta">Sur 12 mois : le classement complet suit dans la grille ci-dessous.</span>}
          items={top10.map((r) => ({
            nom: nomAffiche(r.elu_nom),
            lien: "/parlementaires/" + encodeURIComponent(idParlementaire(r.chambre, r.elu_id, r.elu_cle, r.elu_nom)),
            libelle: r.elu_groupe ?? "",
            valeur: tauxTurnover(r) ?? 0,
            texte: pct(tauxTurnover(r)) + ", " + r.departs_12m + " départs, " + r.arrivees_12m + " arrivées (équipe de " + r.effectif + ")",
          }))}
        />
      )}
      {tous.length === 0 ? (
        <p className="meta">Aucune équipe suivie pour cette chambre pour l&apos;instant : pas encore assez de mois d&apos;historique.</p>
      ) : (
        <Tableur
          id={"vigiparl-elus-" + seg}
          titre="Renouvellement des équipes, élu par élu"
          description=""
          provenance="Vue stats_turnover_elus (API DataParl'/Supabase), méthode VigiParl'"
          entetes={entetes}
          donnees={donnees}
          liens={liens}
          lectureSeule
        />
      )}
    </>
  );
}
