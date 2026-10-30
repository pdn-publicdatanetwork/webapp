import type { Metadata } from "next";
import Carte, { type DonneesDep } from "./Carte";
import { OUTRE_MER, SCRUTIN_2026, slugDepartement, senatoriales2026, type Senatoriales2026 as Donnees } from "@/lib/senatoriales";
import { libelleElection } from "@/lib/senatorialesClassement";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Sénatoriales 2026 : les nouveaux sénateurs, département par département",
  description:
    "Résultats des sénatoriales 2026 : les nouveaux sénateurs élus et les sortants, pour chaque département renouvelé (métropole et outre-mer). Leur groupe politique, leur fiche, leur équipe de collaborateurs.",
  alternates: { canonical: "/senatoriales2026" },
  openGraph: {
    siteName: "DataParl'",
    title: "Sénatoriales 2026 : les nouveaux sénateurs",
    description: "Nouveaux sénateurs et sortants, département par département, avec leurs groupes et leurs équipes.",
    url: "https://www.dataparl.fr/senatoriales2026",
    type: "website",
  },
};

export default async function Senatoriales2026() {
  const vide: Donnees = { departements: [], nouveaux: [], sortants: [], reelus: [] };
  const { departements, nouveaux, sortants, reelus } = await senatoriales2026().catch(() => vide);
  const parSlug: Record<string, DonneesDep> = {};
  for (const d of departements) parSlug[d.slug] = { n: d.nouveaux.length + d.reelus.length, s: d.sortants.length };
  const om = OUTRE_MER.map((o) => {
    const slug = slugDepartement(o.nom);
    const d = departements.find((x) => x.slug === slug);
    return { nom: o.nom, slug, n: d ? d.nouveaux.length + d.reelus.length : 0 };
  });
  const siege = nouveaux.length + reelus.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Sénatoriales 2026 : les nouveaux sénateurs",
    numberOfItems: nouveaux.length,
    itemListElement: departements.slice(0, 60).map((d, i) => ({
      "@type": "ListItem", position: i + 1, name: `Sénatoriales 2026 : ${d.nom}`,
      url: `https://www.dataparl.fr/senatoriales2026/${d.slug}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1>Sénatoriales 2026 : <span className="surligne">les nouveaux sénateurs</span></h1>
      <p className="lead">
        Le {libelleElection()}, une partie du Sénat a été renouvelée : dans chaque département concerné,
        les grands électeurs ont désigné 178 sénateurs pour six ans. Voici, département par département,
        les élus qui entrent au Palais du Luxembourg, ceux qui y sont réélus, ceux qui le quittent, leur groupe
        politique, et leur équipe de collaborateurs, suivie chaque jour par DataParl&apos;.
      </p>

      <div className="chiffres">
        <div><strong>{departements.length}</strong><span>département{departements.length > 1 ? "s" : ""} renouvelé{departements.length > 1 ? "s" : ""} en {SCRUTIN_2026.annee}</span></div>
        <div><strong>{siege}</strong><span>sénateur{siege > 1 ? "s" : ""} élu{siege > 1 ? "s" : ""} : {nouveaux.length} nouveau{nouveaux.length > 1 ? "x" : ""}, {reelus.length} réélu{reelus.length > 1 ? "s" : ""}</span></div>
        <div><strong>{sortants.length}</strong><span>sortant{sortants.length > 1 ? "s" : ""} (non réélu{sortants.length > 1 ? "s" : ""})</span></div>
      </div>

      <h2>La carte des départements renouvelés</h2>
      <p className="meta">
        En bleu, les territoires où des sénateurs ont été élus en {SCRUTIN_2026.annee} : départements métropolitains
        et outre-mer, dessinés sur la même carte (DROM et COM dans le bandeau du bas, en gris ceux qui ne sont pas
        renouvelés cette année). Cliquez sur un territoire pour voir les nouveaux sénateurs et les sortants.
      </p>
      <Carte parSlug={parSlug} om={om} />

      <h2>Tous les départements</h2>
      {departements.length === 0 ? (
        <p className="meta">Les résultats du scrutin de {SCRUTIN_2026.annee} seront publiés ici dès leur parution au Journal officiel.</p>
      ) : (
        <ul className="liste-deps">
          {departements.map((d) => (
            <li key={d.slug}>
              <a href={`/senatoriales2026/${d.slug}`}>{d.nom}</a>
              <span className="meta">, {d.nouveaux.length} nouveau{d.nouveaux.length > 1 ? "x" : ""} sénateur{d.nouveaux.length > 1 ? "s" : ""}{d.reelus.length ? `, ${d.reelus.length} réélu${d.reelus.length > 1 ? "s" : ""}` : ""}{d.sortants.length ? `, ${d.sortants.length} sortant${d.sortants.length > 1 ? "s" : ""}` : ""}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 id="comprendre">Comment se déroulent les sénatoriales ?</h2>
      <p>
        Le Sénat est renouvelé par moitié : chaque scrutin, comme en {SCRUTIN_2026.annee}, renouvelle l&apos;une des
        deux séries de sénateurs pour un mandat de six ans. L&apos;élection se fait au suffrage indirect universel :
        ce sont les « grands électeurs » du département (députés et conseillers départementaux, régionaux et
        municipaux, ou leurs délégués) qui votent. Le mode de scrutin dépend du nombre de sièges du département :
        scrutin majoritaire à deux tours pour les départements qui élisent un à quatre sénateurs, représentation
        proportionnelle avec prime majoritaire au-delà.
      </p>
      <p>
        DataParl&apos; complète ces résultats avec ce que les sources officielles ne donnent pas : pour chaque nouveau
        sénateur, la liste de ses collaborateurs parlementaires, les arrivées et les départs dans son équipe, et pour
        chaque sortant, l&apos;historique complet de son mandat. Chaque fiche relie aussi le parcours des personnes qui
        changent de chambre : un député devenu sénateur, un collaborateur devenu parlementaire.
      </p>
      <p className="meta">
        Voir aussi : <a href="https://www.resultats-elections.interieur.gouv.fr/Senatoriales2026/nouvelle_assemblee/index.html" target="_blank" rel="noopener noreferrer">les résultats officiels du ministère de l&apos;Intérieur</a>, <a href="/parlementaires">tous les parlementaires</a>, <a href="/mouvements/senat">les mouvements
        au Sénat</a>, <a href="/vigiparl/senat/parlementaires">VigiParl&apos; au Sénat</a>
      </p>
    </>
  );
}
