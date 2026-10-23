import type { Metadata } from "next";
import Link from "next/link";
import ListeElus, { CHAMBRE_LONG } from "@/app/_components/ListeElus";
import IndicateursGroupe from "./IndicateursGroupe";
import EquipeGroupe from "./EquipeGroupe";
import { elusDuGroupe, groupesExistants } from "@/lib/collectifsData";
import { mandaturesExistantes, type MandatureExistante } from "@/lib/mandaturesData";
import { CHAMBRE_COURTE, hrefParti, groupeDepuisSlug, slugCollectif } from "@/lib/collectifs";
import { couleurParti } from "@/lib/couleurs";
import { cheminLogoGroupe } from "@/lib/media";

export const revalidate = 86400;
type Props = { params: Promise<{ groupe: string }> };

// Page « groupe introuvable » : les groupes existants, chambre par chambre,
// en pastilles colorées (Assemblée nationale, Sénat, Parlement européen).
function GroupesExistants({ groupes }: { groupes: { chambre: string; groupe: string; groupe_libelle: string }[] }) {
  const CHAMBRES_ORDRE = ["assemblee", "senat", "europarl"];
  const parChambre: Record<string, typeof groupes> = {};
  for (const g of groupes) (parChambre[g.chambre] ??= []).push(g);
  return (
    <>
      {CHAMBRES_ORDRE.map((chambre) =>
        parChambre[chambre]?.length ? (
          <section key={chambre}>
            <h2>{CHAMBRE_LONG[chambre]}</h2>
            <div className="pastilles-groupes">
              {parChambre[chambre].map((g) => (
                <Link
                  key={g.groupe}
                  className="pastille-groupe"
                  href={`/groupe/${CHAMBRE_COURTE[chambre]}-${slugCollectif(g.groupe)}/`}
                  style={{ ["--c" as string]: couleurParti(g.groupe) }}
                >
                  <span className="point" />
                  {g.groupe_libelle || g.groupe}
                </Link>
              ))}
            </div>
          </section>
        ) : null,
      )}
    </>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).groupe;
  const g = groupeDepuisSlug(slug, await groupesExistants().catch(() => []));
  if (!g) return { title: "Groupe parlementaire" };
  const titre = `Groupe ${g.groupe_libelle || g.groupe} — ${CHAMBRE_LONG[g.chambre]}`;
  return {
    title: titre,
    description: `Les élus du groupe ${g.groupe_libelle || g.groupe} à ${CHAMBRE_LONG[g.chambre]} : leurs fiches, leurs biographies, leurs équipes de collaborateurs et leurs mouvements.`,
    alternates: { canonical: `/groupe/${slug}` },
  };
}

export default async function FicheGroupe({ params }: Props) {
  const slug = (await params).groupe;
  const groupes = await groupesExistants().catch(() => []);
  const g = groupeDepuisSlug(slug, groupes);
  if (!g) {
    return (
      <>
        <h1>Groupe introuvable</h1>
        <p className="lead">
          Ce groupe n&apos;existe pas (ou plus) : le sigle ou la chambre de l&apos;adresse ne correspond
          à aucun groupe actif. Voici les groupes parlementaires existants, chambre par chambre :
        </p>
        <p><Link className="btn secondaire" href="/groupe">Voir tous les groupes</Link></p>
        <GroupesExistants groupes={groupes} />
      </>
    );
  }
  const elus = await elusDuGroupe(g.chambre, g.groupe).catch(() => []);
  const mandatures = (await mandaturesExistantes().catch((): MandatureExistante[] => [])).filter((m) => m.chambre === g.chambre);
  const logo = g.chambre === "assemblee" ? cheminLogoGroupe(g.chambre, g.groupe) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Groupe ${g.groupe_libelle || g.groupe} — ${CHAMBRE_LONG[g.chambre]}`,
    numberOfItems: elus.length,
  };
  const filAriane = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Groupes parlementaires", item: "https://www.dataparl.fr/groupe" },
      { "@type": "ListItem", position: 2, name: `Groupe ${g.groupe}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane).replace(/</g, "\\u003c") }} />
      <p className="meta" style={{ marginTop: 0 }}>
        <a href="/senatoriales2026">← Sénatoriales 2026</a> · <a href="/groupe">← Tous les groupes</a>
      </p>
      <h1>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="logo-groupe" src={logo} alt={`Logo du groupe ${g.groupe}`} width={64} height={64} />
        )}
        Groupe <span className="surligne">{g.groupe_libelle || g.groupe}</span> — {CHAMBRE_LONG[g.chambre]}
      </h1>
      <p className="lead">
        Les {elus.length} élu{elus.length > 1 ? "s" : ""} du groupe {g.groupe} à {CHAMBRE_LONG[g.chambre]}, avec pour chacun sa fiche,
        sa biographie et l&apos;équipe de ses collaborateurs.
      </p>
      <p className="meta">
        Voir aussi : <a href={hrefParti(g.groupe) ?? "#"}>la fiche du parti {g.groupe}, toutes chambres confondues</a>
        {" "}<Link href="/parlementaires">· tous les parlementaires</Link>
      </p>
      {mandatures.length > 0 && (
        <p className="meta">
          {"Au fil des mandatures : "}
          {mandatures.map((m, i) => (
            <span key={m.slug}>
              {i > 0 ? " · " : ""}
              <Link href={"/groupe/" + slug + "/" + m.slug}>{m.libelle}</Link>
            </span>
          ))}
        </p>
      )}
      {/* Indicateurs citables : phrase canonique datée + JSON-LD Dataset (GEO) */}
      <IndicateursGroupe chambre={g.chambre} sigle={g.groupe} />

      {/* Équipe du groupe : secrétaire général, adjoints, collaborateurs de groupe */}
      <EquipeGroupe chambre={g.chambre} sigle={g.groupe} />

      <h2>Les élus du groupe</h2>
      <ListeElus elus={elus} afficher="groupe" />
    </>
  );
}
