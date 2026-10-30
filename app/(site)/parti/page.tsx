import type { Metadata } from "next";
import Link from "next/link";
import { partisAvecComptes, type PartiCompte } from "@/lib/collectifsData";
import { hrefParti } from "@/lib/collectifs";
import { libelleParti } from "@/lib/partisNoms";
import { agreger, partFemmes, pct, statsElus, tauxTurnover, type Agregat, type StatElu } from "@/lib/stats";

export const revalidate = 86400;

// /parti : l'index des fiches par parti. Chaque intitulé porte le nom
// complet du parti (« Élus du Rassemblement National (RN) ») : c'est la
// requête des internautes, pas le sigle seul. Les lignes affichent le
// nombre d'élus et la répartition par chambre ; les partis les mieux
// représentés passent en premier.
export const metadata: Metadata = {
  title: "Élus de chaque parti : députés, sénateurs, députés européens",
  description: "Les élus du Rassemblement National, de Renaissance, des Républicains, de La France insoumise… : pour chaque parti, ses députés, sénateurs et députés européens, et l'équipe de collaborateurs de chacun.",
  alternates: { canonical: "/parti" },
};

export default async function IndexPartis() {
  const [partis, stats] = await Promise.all([
    partisAvecComptes().catch((): PartiCompte[] => []),
    statsElus().catch((): StatElu[] => []),
  ]);
  const fr = (n: number) => n.toLocaleString("fr-FR");

  // Stats équipes par parti (sigle, toutes chambres confondues).
  const equipes = new Map<string, Agregat>();
  for (const a of agreger(stats, (r) => r.elu_groupe)) equipes.set(a.cle, a);

  return (
    <>
      <h1>Élus <span className="surligne">par parti politique</span></h1>
      <p className="lead">
        Une fiche par parti : tous ses élus, de l&apos;Assemblée nationale au Parlement européen —
        avec pour chacun sa biographie et l&apos;équipe de ses collaborateurs.
      </p>
      <p className="meta">
        Les groupes parlementaires (chambre par chambre) : <Link href="/groupe">voir tous les groupes</Link>.
        Les collaborateurs de chaque parti : <Link href="/collab/parti">collaborateurs par parti</Link>.
      </p>
      {partis.length === 0 && <p className="meta">Aucun parti actif enregistré pour l&apos;instant.</p>}
      <ul className="lignes-partis">
        {partis.map((p) => {
          const agg = equipes.get(p.sigle);
          const repartition = [
            p.assemblee > 0 && fr(p.assemblee) + " député" + (p.assemblee > 1 ? "s" : ""),
            p.senat > 0 && fr(p.senat) + " sénateur" + (p.senat > 1 ? "s" : ""),
            p.europarl > 0 && fr(p.europarl) + " député" + (p.europarl > 1 ? "s" : "") + " européen" + (p.europarl > 1 ? "s" : ""),
            agg && agg.effectif > 0 && fr(agg.effectif) + " collaborateur" + (agg.effectif > 1 ? "s" : "") + " suivis",
          ].filter(Boolean).join(" · ");
          return (
            <li key={p.sigle}>
              <a className="ligne-parti" href={hrefParti(p.sigle) ?? "#"}>
                <span><strong>{"Élus du " + libelleParti(p.sigle)}</strong><span className="badge-sigle">{p.sigle}</span></span>
                <span className="ligne-parti-chiffres"><b>{fr(p.total)}</b>{" élu" + (p.total > 1 ? "s" : "")}</span>
                {repartition && <span className="meta">{repartition}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
