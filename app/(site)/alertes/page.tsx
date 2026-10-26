import type { Metadata } from "next";
import { decaler, messageAlerte, type MvtAlerte } from "@/lib/alertes";
import { COLONNES_PUBLIQUES, dataQuery } from "@/lib/data";
import { gabarit } from "@/lib/gabarit";
import { authAdmin } from "@/lib/supabaseAdmin";
import ReglageAlertes from "./ReglageAlertes";

export const metadata: Metadata = {
  title: "Alertes par email",
  description: "Recevez un email dès qu'un collaborateur arrive ou quitte l'équipe d'un élu que vous suivez. Gratuit, une alerte par jour au plus, désinscription en un clic.",
  alternates: { canonical: "/alertes" },
};
export const revalidate = 3600;

// Aperçus construits avec de vrais mouvements récents, rendus par le même
// code que les alertes envoyées (lib/alertes.ts).
async function apercus(): Promise<{ quotidien: string; hebdo: string; jour: string } | null> {
  const p = new URLSearchParams({ select: `${COLONNES_PUBLIQUES},elu_origine_cle,elu_origine_id`, order: "date_event.desc,id.asc", limit: "300" });
  const { rows } = await dataQuery<MvtAlerte>("mouvements", p, 3600);
  if (!rows.length) return null;
  const arrivee = rows.find((m) => m.type === "arrivee");
  const depart = rows.find((m) => m.type === "depart");
  const deux = [arrivee, depart].filter((m): m is MvtAlerte => !!m);
  const jour = deux[0]?.date_event ?? rows[0].date_event;
  // Récapitulatif : les trois groupes les plus actifs de la dernière semaine publiée, deux lignes chacun.
  const semaine = rows.filter((m) => m.date_event >= decaler(rows[0].date_event, -6));
  const parGroupe = new Map<string, MvtAlerte[]>();
  for (const m of semaine) if (m.elu_groupe) parGroupe.set(`${m.chambre}|${m.elu_groupe}`, [...(parGroupe.get(`${m.chambre}|${m.elu_groupe}`) ?? []), m]);
  const hebdoMvts = [...parGroupe.values()].sort((a, b) => b.length - a.length).slice(0, 3).flatMap((ms) => ms.slice(0, 2));
  const rendu = (ms: MvtAlerte[], f: "quotidienne" | "hebdomadaire") => {
    const m = messageAlerte(ms, f, jour);
    return gabarit({ titre: m.titre, corpsHtml: m.html, edition: m.edition, adressage: { date: jour, pour: "Émilie DURAND" }, lireUrl: "#", pied: "<a href=\"https://www.dataparl.fr/mon-compte\" style=\"color:#4A5670\">Mon compte</a> · <a href=\"#\" style=\"color:#4A5670\">Me désinscrire des alertes</a> · <a href=\"#\" style=\"color:#4A5670\">Mes préférences</a>" });
  };
  return { quotidien: rendu(deux, "quotidienne"), hebdo: rendu(hebdoMvts, "hebdomadaire"), jour };
}

async function abonnes(): Promise<number> {
  try {
    const { count } = await authAdmin().from("alert_subscriptions").select("id", { count: "exact", head: true }).eq("active", true);
    return count ?? 0;
  } catch { return 0; }
}

const SEUIL_COMPTEUR = 25; // en dessous, le compteur dessert plus qu'il ne rassure

export default async function Alertes() {
  const [ap, n] = await Promise.all([apercus().catch(() => null), abonnes()]);
  return (
    <>
      <h1><span className="surligne">Alertes</span> par email</h1>
      <p className="lead">
        Choisissez les élus, groupes, chambres et types de mouvements à suivre : DataParl&apos; vous écrit dès
        qu&apos;un changement apparaît dans les publications officielles.
      </p>

      <ul className="atouts">
        <li><strong>Vérifié chaque matin</strong><span>sur les listes officielles de l&apos;Assemblée nationale, du Sénat et du Parlement européen.</span></li>
        <li><strong>Daily ou Weekly</strong><span>DataParl&apos; Daily les jours où quelque chose bouge pour vous, ou DataParl&apos; Weekly, le récapitulatif du lundi.</span></li>
        <li><strong>Gratuit, sans pub dans les mails</strong><span>désinscription en un clic depuis chaque message. <a href="/notice/ads">La publicité du site</a>, en toute transparence.</span></li>
        {n >= SEUIL_COMPTEUR && <li><strong>{n.toLocaleString("fr-FR")} lecteurs</strong><span>reçoivent déjà leurs alertes.</span></li>}
      </ul>

      <ReglageAlertes />

      {ap && (
        <>
          <h2>À quoi ressemble une alerte</h2>
          <p className="meta">Aperçus construits avec de vrais mouvements récents, tels qu&apos;ils arriveraient dans votre boîte.</p>
          <div className="apercus-mail">
            <figure>
              <figcaption><strong>DataParl&apos; Daily</strong><span>Chaque matin où ça bouge</span></figcaption>
              <iframe title="Exemple d'alerte quotidienne" srcDoc={ap.quotidien} sandbox="" loading="lazy" />
            </figure>
            <figure>
              <figcaption><strong>DataParl&apos; Weekly</strong><span>La semaine, rangée par groupe suivi</span></figcaption>
              <iframe title="Exemple de récapitulatif hebdomadaire" srcDoc={ap.hebdo} sandbox="" loading="lazy" />
            </figure>
          </div>
        </>
      )}
    </>
  );
}
