import { CHAMBRE_LONG } from "@/lib/format";
import { CHAMBRE_COURTE } from "@/lib/collectifs";

// Page d'accueil d'une chambre (/an, /senat, /pe) : tout ce que DataParl'
// publie sur la chambre : mouvements, collaborateurs, parlementaires,
// groupes, VigiParl', MixiParl', avec les entrées par mandature.
const AU: Record<string, string> = { assemblee: "à l'Assemblée nationale", senat: "au Sénat", europarl: "au Parlement européen" };
const UNE: Record<string, string> = { assemblee: "l'Assemblée nationale", senat: "le Sénat", europarl: "le Parlement européen" };
const MOUVEMENTS: Record<string, string> = { assemblee: "/mouvements/assemblee", senat: "/mouvements/senat", europarl: "/mouvements/europarl" };

export default function LandingChambre({ chambre }: { chambre: "assemblee" | "senat" | "europarl" }) {
  const seg = CHAMBRE_COURTE[chambre];
  return (
    <>
      <h1><span className="surligne">{CHAMBRE_LONG[chambre]}</span></h1>
      <p className="lead">
        Tout ce que DataParl&apos; suit {AU[chambre]} : les départs et arrivées dans les équipes de collaborateurs,
        les parlementaires et leurs groupes, le renouvellement et la mixité des équipes : mois par mois, depuis 2015.
      </p>
      <ul className="liste-deps">
        <li><a href={MOUVEMENTS[chambre]}>Les mouvements {AU[chambre]}</a><span className="meta">, arrivées, départs et transferts, mois par mois</span></li>
        <li><a href={"/collab/" + seg}>Les collaborateurs {AU[chambre]}</a><span className="meta">, la <a href={"/collab/" + seg + "/liste"}>liste complète en poste</a>, la recherche des équipes, par <a href="/parti">parti</a> et par <a href="/groupe">groupe</a></span></li>
        <li><a href="/parlementaires">Les parlementaires</a><span className="meta">, une fiche et une biographie par élu</span></li>
        <li><a href="/groupe">Les groupes parlementaires</a><span className="meta">, et, par mandature, <a href={"/groupe/" + seg + "/"}>la chambre législature par législature</a></span></li>
        <li><a href={"/vigiparl/" + seg + "/parlementaires"}>VigiParl&apos; : le renouvellement des équipes, élu par élu</a></li>
        <li><a href={"/mixiparl/" + seg + "/parlementaires"}>MixiParl&apos; : la mixité des équipes, élue par élue</a></li>
        {chambre === "senat" && (
          <li><a href="/senatoriales2026">Les sénatoriales 2026</a><span className="meta">, les 78 départements et les sortants, série par série</span></li>
        )}
      </ul>
      <p className="meta">
        {"Autres chambres : "}
        {["assemblee", "senat", "europarl"].filter((c) => c !== chambre).map((c, i) => (
          <span key={c}>
            {i > 0 ? ", " : ""}
            <a href={"/" + CHAMBRE_COURTE[c]}>{UNE[c]}</a>
          </span>
        ))}
      </p>
    </>
  );
}
