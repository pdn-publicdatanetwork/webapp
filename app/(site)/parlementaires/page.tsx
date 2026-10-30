import type { Metadata } from "next";
import Autocompletion from "@/app/_components/Autocompletion";
import { tousLesParlementaires, type EluCompact } from "@/lib/referentiel";

export const metadata: Metadata = { title: "Parlementaires", alternates: { canonical: "/parlementaires" } };
export const revalidate = 86400;

const NOM_CHAMBRE = { assemblee: "Assemblée nationale", senat: "Sénat", europarl: "Parlement européen" } as const;

export default async function Parlementaires() {
  let elus: EluCompact[] = [];
  try { elus = await tousLesParlementaires(); } catch {}
  const actifs = elus.filter((e) => e.a);
  const parChambre = (["assemblee", "senat", "europarl"] as const)
    .map((c) => ({ c, liste: actifs.filter((e) => e.c === c) }))
    .filter((x) => x.liste.length);
  // Comptes par groupe (chambre sigle) pour des pastilles browsables sans compte.
  const groupes = ([...new Set(actifs.map((e) => `${e.c}|${e.g}`).filter((k) => !k.endsWith("|")))])
    .map((k) => {
      const [c, g] = k.split("|");
      return { c, g, n: actifs.filter((e) => e.c === c && e.g === g).length };
    })
    .sort((a, b) => a.c.localeCompare(b.c) || b.n - a.n);
  return (
    <>
      <h1>Les <span className="surligne">parlementaires</span></h1>
      <p className="lead">
        Chaque élu, son équipe, ses mandats et ses commissions. Les anciens parlementaires (depuis 1997 à l&apos;Assemblée,
        2008 au Sénat, 2009 au Parlement européen) sont accessibles par la recherche.
      </p>
      <div className="recherche-globale">
        <Autocompletion id="recherche-elu" source="elus" navigation placeholder="Rechercher un parlementaire, en fonction ou non" ariaLabel="Rechercher un parlementaire" />
      </div>
      <div className="chiffres">
        {parChambre.map(({ c, liste }) => (
          <div key={c}><strong>{liste.length.toLocaleString("fr-FR")}</strong><span>{c === "assemblee" ? "députés" : c === "senat" ? "sénateurs" : "eurodéputés français"} en fonction</span></div>
        ))}
      </div>

      <h2>Explorer sans compte</h2>
      <ul className="sommaire">
        <li><a href="/groupe"><strong>Par groupe politique</strong><span>La fiche de chaque groupe des trois chambres →</span></a></li>
        <li><a href="/departement"><strong>Par département</strong><span>Où siège chaque parlementaire, département par département →</span></a></li>
        <li><a href="/parlementaires/map"><strong>La carte des permanences</strong><span>Toutes les adresses de permanences des élus, sur une carte →</span></a></li>
        <li><a href="/senatoriales2026"><strong>Sénatoriales 2026</strong><span>Les nouveaux sénateurs, département par département →</span></a></li>
        <li><a href="/vigiparl/an/parlementaires"><strong>Classement VigiParl&apos; : Assemblée</strong><span>Le renouvellement des équipes, élu par élu →</span></a></li>
        <li><a href="/vigiparl/senat/parlementaires"><strong>Classement VigiParl&apos; : Sénat</strong><span>Le renouvellement des équipes, élu par élu →</span></a></li>
        <li><a href="/mixiparl"><strong>MixiParl&apos;</strong><span>La mixité femmes-hommes des équipes →</span></a></li>
      </ul>

      <h2>Les groupes en fonction</h2>
      {(["assemblee", "senat", "europarl"] as const).map((c) =>
        groupes.some((g) => g.c === c) ? (
          <section key={c}>
            <h3 className="rubrique">{NOM_CHAMBRE[c]}</h3>
            <div className="puces">
              {groupes.filter((g) => g.c === c).map((g) => (
                <a key={`${c}-${g.g}`} className="puce" href={`/mouvements/${c}?groupe=${encodeURIComponent(g.g)}`}>
                  {g.g}, {g.n}
                </a>
              ))}
            </div>
          </section>
        ) : null,
      )}
      <p className="meta" style={{ marginTop: 20 }}>
        Tapez un nom pour ouvrir une fiche, ou suivez un groupe pour voir les mouvements de ses équipes.
        Classements par élu : <a href="/vigiparl">VigiParl&apos;</a> (renouvellement) et <a href="/mixiparl">MixiParl&apos;</a> (mixité).
      </p>
    </>
  );
}
