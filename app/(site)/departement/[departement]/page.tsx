import type { Metadata } from "next";
import Link from "next/link";
import ListeElus from "@/app/_components/ListeElus";
import { anciensDuDepartement, departementsExistants, elusDuDepartement } from "@/lib/collectifsData";
import { hrefDepartement } from "@/lib/collectifs";
import { nomDepartement, slugDepartement } from "@/lib/senatorialesClassement";

export const revalidate = 86400;
type Props = { params: Promise<{ departement: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).departement;
  const nom = (await departementsExistants().catch(() => [])).find((d) => slugDepartement(d) === slug);
  if (!nom) return { title: "Département" };
  return {
    title: `Élus de ${nom} : députés, sénateurs, députés européens`,
    description: `Tous les élus de ${nom} : députés à l'Assemblée nationale, sénateurs, députés européens : leurs fiches, leurs biographies, leurs groupes et leurs équipes de collaborateurs.`,
    alternates: { canonical: `/departement/${slug}` },
  };
}

export default async function FicheDepartement({ params }: Props) {
  const slug = (await params).departement;
  const deps = await departementsExistants().catch(() => []);
  const nom = deps.find((d) => slugDepartement(d) === slug);
  if (!nom) {
    return (
      <>
        <h1>Département introuvable</h1>
        <p className="meta">Ce département n&apos;a pas (ou plus) d&apos;élu actif enregistré. <Link href="/departement">Voir tous les départements</Link>.</p>
      </>
    );
  }
  const elus = await elusDuDepartement(nom).catch(() => []);
  const anciens = await anciensDuDepartement(nom).catch(() => []);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "ItemList",
    name: `Élus de ${nom}`, numberOfItems: elus.length,
  };
  const filAriane = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Départements", item: "https://www.dataparl.fr/departement" },
      { "@type": "ListItem", position: 2, name: nom },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane).replace(/</g, "\\u003c") }} />
      <p className="meta" style={{ marginTop: 0 }}>
        <a href="/senatoriales2026">← Sénatoriales 2026</a>, <Link href="/departement">← Tous les départements</Link>
      </p>
      <h1>Élus de <span className="surligne">{nom}</span></h1>
      <p className="lead">
        Les {elus.length} élu{elus.length > 1 ? "s" : ""} de {nom} (députés, sénateurs, députés européens) avec
        pour chacun sa fiche, sa biographie, son groupe politique et l&apos;équipe de ses collaborateurs.
      </p>
      <p className="meta">
        Voir aussi : <a href={`/senatoriales2026/${slug}`}>le scrutin 2026 en {nom}</a>
        <Link href="/parlementaires">, tous les parlementaires</Link>
      </p>
      <h2>Les élus</h2>
      <ListeElus elus={elus} afficher="departement" />

      {anciens.length > 0 && (
        <>
          <h2>Anciens élus de {nom}</h2>
          <p className="meta">
            {anciens.length} parlementaire{anciens.length > 1 ? "s" : ""} ayant siégé pour {nom}, dont le mandat est terminé :
            fiche conservée avec l&apos;équipe et le parcours complets.
          </p>
          <ul className="gouvernement">
            {anciens.map((e) => (
              <li key={e.personne_id + e.chambre}>
                <a href={`/parlementaires/${encodeURIComponent(e.slug)}`}>
                  {e.prenom} {e.nom}
                </a>
                <span className="meta">
                  {", "}{e.chambre === "assemblee" ? "ex-député" : e.chambre === "senat" ? "ex-sénateur" : "ex-député européen"}
                  {e.groupe ? `, groupe ${e.groupe}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
