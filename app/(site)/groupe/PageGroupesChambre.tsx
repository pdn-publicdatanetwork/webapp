import Link from "next/link";
import { groupesAvecComptes, type GroupeCompte } from "@/lib/collectifsData";
import { mandaturesExistantes, type MandatureExistante } from "@/lib/mandaturesData";
import { agreger, dernieresExtractions, partFemmes, pct, statsElus, tauxTurnover, type Agregat, type Extraction, type StatElu } from "@/lib/stats";
import { couleurParti, NOM_CHAMBRE } from "@/lib/couleurs";
import { CHAMBRE_COURTE, slugCollectif } from "@/lib/collectifs";
import { cheminLogoGroupe } from "@/lib/media";
import VueGroupes, { type GroupeVue } from "./VueGroupes";

// Pages « groupes d'une chambre » (/groupe/an, /groupe/senat, /groupe/pe) :
// hémicycle proportionnel, résumé chiffré (VigiParl', MixiParl') et cartes de
// groupes avec logo (Assemblée nationale : logos publiés par Datan, servis par
// media.dataparl.fr) ou pastille colorée. Tous les chiffres sont préformatés ici.
const LOGOS: Record<string, string> = { assemblee: "/logos/assemblee-nationale.svg", senat: "/logos/senat.svg", europarl: "/logos/parlement-europeen.svg" };
const A_LA: Record<string, string> = { assemblee: "à l'Assemblée nationale", senat: "au Sénat", europarl: "au Parlement européen" };
const MOIS = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const fr = (n: number) => n.toLocaleString("fr-FR");

export default async function PageGroupesChambre({ chambre }: { chambre: string }) {
  const [groupes, mandatures, stats, extractions] = await Promise.all([
    groupesAvecComptes().catch((): GroupeCompte[] => []),
    mandaturesExistantes().catch((): MandatureExistante[] => []),
    statsElus().catch((): StatElu[] => []),
    dernieresExtractions().catch((): Extraction[] => []),
  ]);
  const seg = CHAMBRE_COURTE[chambre];
  const gs = groupes.filter((g) => g.chambre === chambre).sort((a, b) => b.elus - a.elus || a.groupe.localeCompare(b.groupe));
  const equipes = new Map<string, Agregat>();
  for (const a of agreger(stats.filter((r) => r.chambre === chambre), (r) => r.elu_groupe)) equipes.set(a.cle, a);
  const mandats = mandatures.filter((m) => m.chambre === chambre);

  const vue: GroupeVue[] = gs.map((g) => {
    const agg = equipes.get(g.groupe);
    return {
      sigle: g.groupe,
      libelle: g.groupe_libelle || g.groupe,
      elus: g.elus,
      collaborateurs: agg ? fr(agg.effectif) : "0",
      renouvellement: agg ? pct(tauxTurnover(agg), 1) : "–",
      femmes: agg ? pct(partFemmes(agg), 0) : "–",
      couleur: couleurParti(g.groupe),
      href: `/groupe/${seg}-${slugCollectif(g.groupe)}/`,
      logo: cheminLogoGroupe(chambre, g.groupe),
    };
  });

  // Résumé de la chambre : élus, collaborateurs, renouvellement (VigiParl'),
  // part de femmes (MixiParl').
  const totalElus = gs.reduce((n, g) => n + g.elus, 0);
  const aggTotal = agreger(stats.filter((r) => r.chambre === chambre), () => "chambre")[0];
  const d = (extractions.find((e) => e.chambre === chambre)?.date ?? "").slice(0, 10);
  const m = d.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  const dateMaj = m ? `${Number(m[3])} ${MOIS[Number(m[2])]} ${m[1]}` : "";
  const resume = (
    <div className="chiffres hero">
      <div className="chiffre-carte"><strong>{fr(totalElus)}</strong><span>élus {A_LA[chambre]}</span></div>
      <div className="chiffre-carte"><strong>{fr(aggTotal?.effectif ?? 0)}</strong><span>collaborateurs suivis</span></div>
      <a className="chiffre-carte" href={"/vigiparl/" + seg + "/parlementaires"}>
        <span className="mini-marque">Vigi<span className="surligne-vigi">Parl&apos;</span></span>
        <strong>{pct(aggTotal ? tauxTurnover(aggTotal) : null, 1)}</strong>
        <span>de renouvellement en 12 mois</span>
      </a>
      <a className="chiffre-carte" href={"/mixiparl/" + seg + "/parlementaires"}>
        <span className="mini-marque">Mixi<span className="surligne-mixi">Parl&apos;</span></span>
        <strong>{pct(aggTotal ? partFemmes(aggTotal) : null, 0)}</strong>
        <span>de femmes dans les équipes</span>
      </a>
    </div>
  );

  return (
    <>
      <div className="chambre-entete">
        <img className="logo-org" src={LOGOS[chambre] ?? ""} alt={NOM_CHAMBRE[chambre]} height={38} />
        <h1>Groupes parlementaires : {NOM_CHAMBRE[chambre]}</h1>
      </div>
      <p className="lead">
        Les groupes politiques {A_LA[chambre]} : pour chacun, ses élus, ses collaborateurs suivis et le
        renouvellement de ses équipes.
      </p>
      <nav className="nav-liens">
        <Link href="/groupe">Tous les groupes</Link>
        <Link href="/parti">Tous les partis</Link>
        {(["assemblee", "senat", "europarl"] as const).filter((c) => c !== chambre).map((c) => (
          <Link key={c} href={"/groupe/" + CHAMBRE_COURTE[c]}>{NOM_CHAMBRE[c]}</Link>
        ))}
      </nav>

      <h2>L&apos;hémicycle en un coup d&apos;œil</h2>
      <VueGroupes groupes={vue} dateMaj={dateMaj} resume={resume} seg={seg} titre={"Groupes parlementaires : " + NOM_CHAMBRE[chambre]} />

      <p className="meta">
        Survolez un secteur, une pastille ou une carte : le groupe s&apos;illumine partout ; cliquez pour ouvrir sa fiche.
      </p>

      {mandats.length > 0 && (
        <p className="meta">
          {"Par mandature : "}
          {mandats.map((m2, i) => (
            <span key={m2.slug}>
              {i > 0 ? ", " : ""}
              <Link href={"/groupe/" + seg + "/" + m2.slug}>{m2.libelle}</Link>
            </span>
          ))}
        </p>
      )}
      <p className="meta">
        {"Autres chambres : "}
        {(["assemblee", "senat", "europarl"] as const).filter((c) => c !== chambre).map((c, i) => (
          <span key={c}>
            {i > 0 ? ", " : ""}
            <Link href={"/groupe/" + CHAMBRE_COURTE[c]}>{NOM_CHAMBRE[c]}</Link>
          </span>
        ))}
        .
      </p>
    </>
  );
}
