import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListeMouvements from "@/app/_components/ListeMouvements";
import Partage from "@/app/_components/Partage";
import { CHAMBRES, dateTitre, dateValide, joursPublies, LIBRES, mouvementsLibres, voisins } from "@/lib/daily";
import { CHAMBRE_LONG, nomAffiche, prenomNom, TYPE } from "@/lib/format";
import SuiteDuJour from "./SuiteDuJour";

// Revalidation courte : la page du jour peut être générée avant la synchro
// Supabase du matin (~06:08 UTC) et rester « Aucun mouvement » jusqu'à 1 h.
export const revalidate = 3600;
// Pages générées à la première visite, puis mises en cache (ISR) :
// PAS de generateStaticParams retournant [] : bug Next.js (issue #57996) :
// un tableau vide casse la route ISR à la demande (erreur 500 pour toutes les dates).

type Props = { params: Promise<{ date: string }> };

async function jourDe(date: string) {
  return (await joursPublies(date, date))[0];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  if (!dateValide(date)) return {};
  const jour = await jourDe(date).catch(() => undefined);
  const n = jour?.n ?? 0;
  const titre = `Arrivées et départs du ${dateTitre(date)}`;
  const description = n
    ? `Les ${n.toLocaleString("fr-FR")} mouvement${n > 1 ? "s" : ""} de collaborateurs parlementaires du ${dateTitre(date)} : arrivées, départs et transferts à l'Assemblée nationale, au Sénat et au Parlement européen.`
    : `Aucun mouvement de collaborateurs parlementaires publié le ${dateTitre(date)}.`;
  return {
    title: titre, description,
    alternates: { canonical: `/daily/${date}` },
    openGraph: { siteName: "DataParl'", title: `${titre} | DataParl'`, description, url: `/daily/${date}`, type: "article" },
    robots: n ? undefined : { index: false, follow: true },
  };
}

export default async function Daily({ params }: Props) {
  const { date } = await params;
  if (!dateValide(date)) notFound();
  const [jour, nav] = await Promise.all([jourDe(date), voisins(date).catch(() => ({ avant: null, apres: null }))]);
  const libres = await mouvementsLibres(date, jour);
  const total = jour?.n ?? 0;
  const url = `https://www.dataparl.fr/daily/${date}`;
  const jsonLd = total ? {
    "@context": "https://schema.org", "@type": "ItemList",
    name: `Mouvements de collaborateurs parlementaires du ${dateTitre(date)}`, numberOfItems: total, url,
    itemListElement: libres.map((m, i) => ({
      "@type": "ListItem", position: i + 1,
      name: `${TYPE[m.type]} : ${prenomNom(m.collab_prenom, m.collab_nom)}, équipe de ${nomAffiche(m.elu_nom)} (${CHAMBRE_LONG[m.chambre]})`,
    })),
  } : null;

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <p className="meta"><a href="/daily">Tous les jours</a></p>
      <h1>Les mouvements du <span className="surligne">{dateTitre(date)}</span></h1>
      {total ? (
        <p className="lead">
          {total.toLocaleString("fr-FR")} mouvement{total > 1 ? "s" : ""} publié{total > 1 ? "s" : ""} ce jour-là dans les listes officielles :{" "}
          {CHAMBRES.filter((c) => jour?.parChambre[c]).map((c) => `${jour!.parChambre[c].n.toLocaleString("fr-FR")} ${c === "assemblee" ? "à l'Assemblée" : c === "senat" ? "au Sénat" : "au Parlement européen"}`).join(", ")}.
        </p>
      ) : (
        <p className="lead">Aucun mouvement publié ce jour. Les listes officielles n&apos;ont pas changé, ou n&apos;ont pas été mises à jour.</p>
      )}
      {total > 0 && <Partage url={url} titre={`Les mouvements du ${dateTitre(date)}`} texte={`${total} mouvements de collaborateurs parlementaires le ${dateTitre(date)}, sur DataParl'`} />}

      {CHAMBRES.map((c) => {
        const ms = libres.filter((m) => m.chambre === c);
        const n = jour?.parChambre[c]?.n ?? 0;
        if (!n) return null;
        const d = jour!.parChambre[c];
        return (
          <section key={c}>
            <h2>{CHAMBRE_LONG[c]}</h2>
            <p className="meta">{[d.arrivees && `${d.arrivees} arrivée${d.arrivees > 1 ? "s" : ""}`, d.departs && `${d.departs} départ${d.departs > 1 ? "s" : ""}`, d.transferts && `${d.transferts} transfert${d.transferts > 1 ? "s" : ""}`].filter(Boolean).join(", ")}</p>
            <ListeMouvements mouvements={ms} />
            {n > ms.length && <p className="meta">+ {(n - ms.length).toLocaleString("fr-FR")} autre{n - ms.length > 1 ? "s" : ""} dans cette chambre.</p>}
          </section>
        );
      })}

      {total > libres.length && <SuiteDuJour date={date} reste={total - libres.length} />}

      <nav className="nav-jours" aria-label="Autres jours">
        {nav.avant ? <a href={`/daily/${nav.avant}`}>← {dateTitre(nav.avant)}</a> : <span />}
        {nav.apres ? <a href={`/daily/${nav.apres}`}>{dateTitre(nav.apres)} →</a> : <span />}
      </nav>
      <p className="meta">Accès libre : {LIBRES} mouvements par jour. Les dates sont celles de publication dans les listes officielles.</p>
    </>
  );
}
