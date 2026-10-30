import type { Metadata } from "next";
import { dateLongue } from "@/lib/format";
import { dernierReleve, listeGouvernements, mandatsEtCabinets } from "@/lib/gouvernement";
import ExplorateurGouvernement from "../ExplorateurGouvernement";
import { collaborateursParId } from "@/lib/referentiel";

// Fraîcheur horaire : le balayage JORF du matin (cron ~07:10 UTC) apparaît
// sur le site dans la journée (avant : 24 h).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Tous les gouvernements et leurs cabinets depuis 2012",
  description: "La composition des gouvernements français depuis mai 2012 et la liste des membres de chaque cabinet ministériel (directeurs, chefs de cabinet, conseillers), d'après les nominations publiées au Journal officiel.",
  alternates: { canonical: "/gouv/explorer" },
};

const FAQ = [
  {
    q: "Qu'est-ce qu'un cabinet ministériel ?",
    r: "Le cabinet ministériel est l'équipe personnelle d'un ministre : directeur ou directrice de cabinet, chef de cabinet, conseillers et chargés de mission. Il l'assiste dans ses fonctions politiques, contrairement aux collaborateurs parlementaires qui travaillent pour un élu au Parlement.",
  },
  {
    q: "D'où viennent ces données ?",
    r: "Des nominations et cessations de fonctions publiées au Journal officiel (décrets et arrêtés de nomination), extraites du fonds JORF de la DILA et rattachées à chaque ministre en fonction à la date du décret. DataParl' couvre tous les gouvernements depuis mai 2012 et relève le JORF chaque jour.",
  },
  {
    q: "Que signifient les statuts « publication non retrouvée » et « en cours de vérification » ?",
    r: "« Cabinet documenté » : au moins un membre a été identifié au JORF. « Publication non retrouvée » : aucune nomination identifiée dans les sources consultées, le cabinet n'est pas documenté ici, pas nécessairement inexistant. « En cours de vérification » : mandat récent, le recensement suit les publications au fil de l'eau. Le Journal officiel publie en effet les nominations de cabinet avec un certain retard, surtout à la formation d'un gouvernement.",
  },
  {
    q: "Un membre de cabinet peut-il aussi être collaborateur parlementaire ?",
    r: "Oui, c'est fréquent : un même parcours peut passer d'un cabinet de député à un cabinet ministériel. Quand c'est la même personne, DataParl' relie sa fiche unique de collaborateur : l'appartenance aux deux mondes est visible sur la même page.",
  },
];

export default async function ExplorerGouvernements() {
  const [{ mandats, cabinets }, releve] = await Promise.all([
    mandatsEtCabinets(),
    dernierReleve().catch(() => null),
  ]);
  const personnes = new Set(cabinets.map((c) => c.collab_cle)).size;
  const avecEquipe = new Set(cabinets.map((c) => c.ministre_id));
  const documentes = mandats.filter((m) => avecEquipe.has(m.id)).length;
  const aVerifier = mandats.filter((m) => !avecEquipe.has(m.id) && Date.now() - Date.parse(m.debut.slice(0, 10) + "T00:00:00Z") < 183 * 24 * 3600 * 1000).length;
  const nonDocumentes = mandats.length - documentes;
  const derniere = cabinets.reduce((acc, c) => (c.debut > acc ? c.debut : acc), "0000-00-00");
  const courant = listeGouvernements(mandats)[0] ?? null;

  // Un membre rapproché à un collaborateur parlementaire pointe vers sa fiche
  // unique /collab/<slug> ; les autres vers la fiche de cabinet (anti-doublons).
  const idsCollab = [...new Set(cabinets.map((c) => c.collab_id).filter((x): x is string => !!x))];
  const raccordes = await collaborateursParId(idsCollab).catch(() => []);
  const slugCollab: Record<string, string> = Object.fromEntries(raccordes.map((x) => [x.collab_id, x.slug]));

  const kpi: [string | number, string][] = [
    [mandats.length, "mandats ministériels"],
    [personnes, "personnes en cabinet"],
    [documentes, "cabinets documentés"],
    [nonDocumentes, "sans publication identifiée"],
  ];

  return (
    <>
      <h1>Tous les <span className="surligne">gouvernements</span> et leurs cabinets</h1>
      <p className="lead">
        Qui gouverne, et qui travaille pour qui : la composition des gouvernements français depuis mai 2012, avec pour chaque ministre la liste des membres de son cabinet (directeurs, chefs de cabinet, conseillers) telle que publiée au Journal officiel.
        {courant && <> Le gouvernement en exercice a sa page dédiée : <a href={"/gouv/" + courant.slug}>gouvernement {courant.nom}</a>.</>}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, margin: "16px 0" }}>
        {kpi.map(([v, l]) => (
          <div key={l} className="card" style={{ maxWidth: "none", textAlign: "center" }}>
            <div style={{ fontSize: "1.7em", fontWeight: 700 }}>{v}</div>
            <div className="meta">{l}</div>
          </div>
        ))}
      </div>
      <p className="meta">
        {aVerifier > 0 ? aVerifier + " mandat" + (aVerifier > 1 ? "s" : "") + " récent" + (aVerifier > 1 ? "s" : "") + " en cours de vérification, " : ""}
        Dernière nomination identifiée : {dateLongue(derniere)}
        {releve ? ", dernier relevé du JORF : " + dateLongue(releve) : ""}, source : Journal officiel (DILA).
      </p>

      <ExplorateurGouvernement mandats={mandats} cabinets={cabinets} slugCollab={slugCollab} />

      <h2 id="faq">Questions fréquentes</h2>
      <dl>
        {FAQ.map((f) => (
          <div key={f.q}>
            <dt><strong>{f.q}</strong></dt>
            <dd>{f.r}</dd>
          </div>
        ))}
      </dl>
      <p className="meta">À voir aussi : <a href="/collab">la liste des collaborateurs parlementaires</a> : les mêmes personnes apparaissent parfois dans les deux, avec une fiche unique.</p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Dataset",
                name: "Gouvernements et cabinets ministériels français",
                description: "Composition des gouvernements français depuis mai 2012 et membres des cabinets ministériels (directeurs, chefs de cabinet, conseillers), d'après les nominations publiées au Journal officiel.",
                url: "https://www.dataparl.fr/gouv/explorer",
                creator: { "@type": "Organization", name: "DataParl'", url: "https://www.dataparl.fr" },
                isAccessibleForFree: true,
              },
              {
                "@type": "FAQPage",
                mainEntity: FAQ.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.r },
                })),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.dataparl.fr/" },
                  { "@type": "ListItem", position: 2, name: "Gouvernements", item: "https://www.dataparl.fr/gouv/explorer" },
                ],
              },
            ],
          }).replace(/</g, "\u003c"),
        }}
      />
    </>
  );
}
