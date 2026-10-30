import type { Metadata } from "next";
import CartePermanences from "@/app/_components/CartePermanences";
import { PERMANENCES } from "@/lib/permanences";

export const metadata: Metadata = {
  title: "Carte des permanences parlementaires",
  description:
    "Toutes les adresses des permanences des députés et sénateurs en fonction, géocodées et réunies sur une seule carte.",
  alternates: { canonical: "/parlementaires/map" },
};
export const revalidate = 86400;

const NOM_CHAMBRE = { assemblee: "députés", senat: "sénateurs", europarl: "eurodéputés" } as const;

export default function CartePermanencesPage() {
  const points = PERMANENCES.points;
  const compte: Record<string, number> = {};
  points.forEach((p) => { compte[p.c] = (compte[p.c] ?? 0) + 1; });
  const chambres = (["assemblee", "senat", "europarl"] as const).filter((c) => compte[c]);
  return (
    <>
      <h1>La carte des <span className="surligne">permanences</span></h1>
      <p className="lead">
        Où trouver un parlementaire sur le terrain : les adresses des permanences des députés et des
        sénateurs en fonction, géocodées et réunies sur une seule carte. Cliquez sur un point pour
        voir l&apos;adresse et ouvrir la fiche de l&apos;élu.
      </p>
      {points.length ? (
        <>
          <div className="chiffres">
            {chambres.map((c) => (
              <div key={c}><strong>{compte[c].toLocaleString("fr-FR")}</strong><span>permanences de {NOM_CHAMBRE[c]}</span></div>
            ))}
          </div>
          <CartePermanences points={points} maj={PERMANENCES.maj} />
        </>
      ) : (
        <p className="meta">
          La collecte des adresses n&apos;a pas encore été exécutée : lancez le workflow
          « Permanences » (ou <code>node scripts/permanences.mjs</code> en local) pour générer les données.
        </p>
      )}
      <p className="meta" style={{ marginTop: 20 }}>
        Sources : fiches officielles des députés (assemblee-nationale.fr) et des sénateurs (senat.fr),
        géocodage par la Base Adresse Nationale. Les permanences des eurodéputés français arriveront
        ensuite. Molette ou boutons pour zoomer, glisser pour déplacer la carte.
      </p>
    </>
  );
}
