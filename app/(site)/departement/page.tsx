import type { Metadata } from "next";
import Link from "next/link";
import { departementsExistants } from "@/lib/collectifsData";
import { hrefDepartement } from "@/lib/collectifs";
import { slugDepartement } from "@/lib/senatorialesClassement";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Départements : tous les élus, de l'Assemblée au Parlement européen",
  description: "Une fiche par département : ses députés, ses sénateurs, ses députés européens, et pour chaque élu, son équipe de collaborateurs suivie par DataParl'.",
  alternates: { canonical: "/departement" },
};

export default async function IndexDepartements() {
  const deps = await departementsExistants().catch(() => []);
  return (
    <>
      <h1>Départements</h1>
      <p className="lead">
        Une fiche par département : qui le représente à l&apos;Assemblée nationale, au Sénat et au Parlement
        européen, avec pour chaque élu sa fiche, sa biographie et son équipe de collaborateurs.
      </p>
      <ul className="liste-deps">
        {deps.map((d) => (
          <li key={d}>
            <a href={hrefDepartement(d, slugDepartement) ?? "#"}>Élus de {d}</a>
          </li>
        ))}
      </ul>
      <p className="meta"><Link href="/parlementaires">Voir tous les parlementaires</Link>, <Link href="/senatoriales2026">Sénatoriales 2026</Link></p>
    </>
  );
}
