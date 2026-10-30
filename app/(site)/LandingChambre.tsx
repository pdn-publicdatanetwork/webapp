import { CHAMBRE_COURTE } from "@/lib/collectifs";
import { compteAffectations, dataQuery, derniersMouvements } from "@/lib/data";
import { paramExclusionMvts } from "@/lib/exclusions";
import { CHAMBRE_LONG, type MouvementAffiche } from "@/lib/format";
import { agreger, partFemmes, pct, statsElus, tauxTurnover, type StatElu } from "@/lib/stats";
import LigneMouvement from "../_components/LigneMouvement";
import { Ic, IC_GROUPES, IC_MOUVEMENTS, IC_PARLEMENTAIRES, IC_SENATORIALES, IC_UTILISATEURS } from "../_components/icones";

// Page d'accueil d'une chambre (/an, /senat, /pe) : chiffres clés, derniers
// mouvements de la chambre, accès rapides en cartes — même style que l'accueil.
type Chambre = "assemblee" | "senat" | "europarl";

const AU: Record<Chambre, string> = { assemblee: "à l'Assemblée nationale", senat: "au Sénat", europarl: "au Parlement européen" };
const LE_DE: Record<Chambre, string> = { assemblee: "de l'Assemblée nationale", senat: "du Sénat", europarl: "du Parlement européen" };
const UNE: Record<Chambre, string> = { assemblee: "l'Assemblée nationale", senat: "le Sénat", europarl: "le Parlement européen" };
const MOUVEMENTS: Record<Chambre, string> = { assemblee: "/mouvements/assemblee", senat: "/mouvements/senat", europarl: "/mouvements/europarl" };
const LOGO: Record<Chambre, string> = { assemblee: "/logos/assemblee-nationale.svg", senat: "/logos/senat.svg", europarl: "/logos/parlement-europeen.svg" };
const SOUS_TITRE: Record<Chambre, string> = {
  assemblee: "Les mouvements des collaborateurs, le renouvellement et la mixité des équipes, mois par mois, depuis 2015.",
  senat: "Les mouvements des collaborateurs, le renouvellement et la mixité des équipes, mois par mois, depuis 2015.",
  europarl: "Les mouvements des équipes des eurodéputé·es, le renouvellement et la mixité ; le suivi quotidien a repris le 8 octobre 2026.",
};

export default async function LandingChambre({ chambre }: { chambre: Chambre }) {
  const seg = CHAMBRE_COURTE[chambre];
  const fr = (n: number) => n.toLocaleString("fr-FR");

  let mouvements: MouvementAffiche[] = [];
  let comptes: Record<string, number> = {};
  let duMois: number | null = null;
  let taux: number | null = null;
  let part: number | null = null;
  let indisponible = false;
  try {
    // Mouvements du mois (suivi quotidien, mêmes exclusions que la liste publique).
    const debutMois = new Date().toISOString().slice(0, 8) + "01";
    const pMois = new URLSearchParams({ select: "id", chambre: "eq." + chambre, source: "eq.live", date_event: "gte." + debutMois, limit: "1" });
    pMois.set("not.or", paramExclusionMvts());
    const [m, c, { total }, stats] = await Promise.all([
      derniersMouvements(5, chambre),
      compteAffectations(),
      dataQuery("mouvements", pMois, 3600),
      statsElus().catch(() => [] as StatElu[]),
    ]);
    mouvements = m;
    comptes = c;
    duMois = total;
    const agg = agreger(stats.filter((r) => r.chambre === chambre), () => "chambre")[0];
    if (agg) {
      taux = tauxTurnover(agg); // départs / effectif moyen, 12 mois
      part = partFemmes(agg); // parmi les genres déterminés
    }
  } catch {
    indisponible = true;
  }

  const chiffres: { href?: string; valeur: string; libelle: string }[] = [
    { valeur: fr(comptes[chambre] ?? 0), libelle: "collaborateurs en poste" },
    { valeur: duMois === null ? "–" : fr(duMois), libelle: "mouvements ce mois-ci" },
    { href: "/vigiparl/" + seg + "/parlementaires", valeur: pct(taux, 1), libelle: "de renouvellement en 12 mois" },
    { href: "/mixiparl/" + seg + "/parlementaires", valeur: pct(part, 0), libelle: "de femmes dans les équipes" },
  ];

  const explorer: { href: string; icone?: string; marque?: "vigi" | "mixi"; titre?: string; desc: string }[] = [
    { href: MOUVEMENTS[chambre], icone: IC_MOUVEMENTS, titre: "Mouvements", desc: "Les arrivées et départs en temps réel." },
    { href: "/collab/" + seg, icone: IC_UTILISATEURS, titre: "Collaborateurs", desc: "Les profils et parcours des collaborateurs." },
    { href: "/parlementaires", icone: IC_PARLEMENTAIRES, titre: "Parlementaires", desc: "Les équipes et collaborateurs des élu·es." },
    { href: "/groupe/" + seg + "/", icone: IC_GROUPES, titre: "Groupes", desc: "Les groupes politiques, mandature par mandature." },
    { href: "/vigiparl/" + seg + "/parlementaires", marque: "vigi", desc: "Le renouvellement des équipes, élu par élu." },
    { href: "/mixiparl/" + seg + "/parlementaires", marque: "mixi", desc: "La mixité et la parité des équipes." },
    ...(chambre === "senat" ? [{ href: "/senatoriales2026", icone: IC_SENATORIALES, titre: "Sénatoriales 2026", desc: "Le renouvellement du Sénat, série par série." }] : []),
  ];

  return (
    <>
      <div className="chambre-entete">
        <img className="logo-org" src={LOGO[chambre]} alt={CHAMBRE_LONG[chambre]} height={38} />
        <h1>{CHAMBRE_LONG[chambre]}</h1>
      </div>
      <p className="lead">{SOUS_TITRE[chambre]}</p>

      <div className="chiffres hero">
        {chiffres.map((c, i) => {
          const corps = (
            <>
              <strong>{c.valeur}</strong>
              <span>{c.libelle}</span>
            </>
          );
          return c.href
            ? <a key={i} className="chiffre-carte" href={c.href}>{corps}</a>
            : <div key={i} className="chiffre-carte">{corps}</div>;
        })}
      </div>

      <h2>Derniers mouvements {AU[chambre]}</h2>
      {indisponible && <p className="erreur">Les données sont momentanément indisponibles.</p>}
      {!indisponible && mouvements.length === 0 && (
        <p className="meta">Aucun mouvement détecté pour cette chambre depuis le démarrage du suivi quotidien.</p>
      )}
      <ul className="mouvements-list">
        {mouvements.map((m) => <LigneMouvement key={m.id} m={m} />)}
      </ul>
      <div className="actions-accueil">
        <a className="btn" href={MOUVEMENTS[chambre]}>Voir tous les mouvements {LE_DE[chambre]}</a>
      </div>

      <h2>Explorer</h2>
      <ul className="explorer">
        {explorer.map((e) => (
          <li key={e.href}>
            <a href={e.href}>
              {e.marque === "vigi" ? (
                <span className="marque-carte">Vigi<span className="surligne-vigi">Parl&apos;</span></span>
              ) : e.marque === "mixi" ? (
                <span className="marque-carte">Mixi<span className="surligne-mixi">Parl&apos;</span></span>
              ) : (
                <span className="icone-chiffre"><Ic d={e.icone ?? ""} /></span>
              )}
              {e.titre && <strong>{e.titre}</strong>}
              <span>{e.desc}</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="meta">
        {"Autres chambres : "}
        {(["assemblee", "senat", "europarl"] as Chambre[]).filter((c) => c !== chambre).map((c, i) => (
          <span key={c}>
            {i > 0 ? ", " : ""}
            <a href={"/" + CHAMBRE_COURTE[c]}>{UNE[c]}</a>
          </span>
        ))}
      </p>
    </>
  );
}
