import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Photo from "@/app/_components/Photo";
import { prenomNom } from "@/lib/format";
import { moisAnnee } from "@/lib/periodes";
import { SCRUTIN_2026, senatoriales2026, slugDepartement, type Senateur } from "@/lib/senatoriales";
import { libelleElection } from "@/lib/senatorialesClassement";
import { hrefGroupe, hrefDepartement, hrefParti, sansGroupe } from "@/lib/collectifs";
import { BadgeChambre, BadgeParti } from "@/app/_components/Badges";

export const revalidate = 86400;
type Props = { params: Promise<{ departement: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent((await params).departement);
  const tous = await senatoriales2026().catch(() => null);
  const d = tous?.departements.find((x) => x.slug === slug);
  if (!d) return { title: "Sénatoriales 2026" };
  const titre = `Sénatoriales 2026 : ${d.nom}`;
  const description = `Sénatoriales 2026 en ${d.nom} : les ${d.nouveaux.length} nouveaux sénateurs élus, ${d.reelus.length} sénateur${d.reelus.length > 1 ? "s" : ""} réélu${d.reelus.length > 1 ? "s" : ""} et les sortants, leurs groupes politiques, leurs fiches et leurs équipes de collaborateurs.`;
  return {
    title: titre, description,
    alternates: { canonical: `/senatoriales2026/${d.slug}` },
    openGraph: { siteName: "DataParl'", title: `${titre}, DataParl'`, description, url: `https://www.dataparl.fr/senatoriales2026/${d.slug}`, type: "article" },
  };
}

function CarteSenateur({ s, reelu }: { s: Senateur; reelu?: boolean }) {
  const nom = prenomNom(s.prenom, s.nom);
  return (
    <div className="carte-elu">
      <Photo chambre="senat" slug={s.slug} src={s.photo_url} nom={nom} taille={64} />
      <div>
        <p style={{ margin: 0, fontWeight: 700 }}>
          {s.slug ? <a href={`/parlementaires/${encodeURIComponent(s.slug)}`}>{nom}</a> : nom}
          {reelu && <span className="puce">réélu{s.civilite === "Mme" ? "e" : ""}</span>}
        </p>
        <div className="badges-elu">
          <BadgeChambre chambre="senat" />
          {!sansGroupe(s.groupe) && <BadgeParti sigle={s.groupe} />}
        </div>
        <p className="meta" style={{ margin: "2px 0" }}>
          {s.election ? `Élu${s.civilite === "Mme" ? "e" : ""} le ${libelleElection()}` : ""}
          {s.groupe && !sansGroupe(s.groupe) ? `, groupe ${s.groupe}` : s.liste ? `, liste « ${s.liste} »` : ""}
        </p>
        {s.slug && (
          <p className="meta" style={{ margin: 0 }}>
            <a href={`/parlementaires/${encodeURIComponent(s.slug)}/bio`}>Biographie</a>
            {!sansGroupe(s.groupe) && hrefGroupe("senat", s.groupe) && <a href={hrefGroupe("senat", s.groupe)!}>, Fiche groupe {s.groupe} au Sénat</a>}
            {!sansGroupe(s.groupe) && hrefParti(s.groupe) && <a href={hrefParti(s.groupe)!}>, Fiche parti {s.groupe}</a>}
          </p>
        )}
        {hrefDepartement(s.departement, slugDepartement) && (
          <p className="meta" style={{ margin: 0 }}>
            <a href={hrefDepartement(s.departement, slugDepartement)!}>Fiche élus de {s.departement}</a>
          </p>
        )}
      </div>
    </div>
  );
}

export default async function DepartementSenatoriales({ params }: Props) {
  const slug = decodeURIComponent((await params).departement);
  const tous = await senatoriales2026().catch(() => null);
  const d = tous?.departements.find((x) => x.slug === slug);
  if (!d) notFound();
  const elus = d.nouveaux.length + d.reelus.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Sénatoriales 2026 : ${d.nom}`,
    numberOfItems: elus,
    itemListElement: [...d.nouveaux, ...d.reelus].map((s, i) => ({
      "@type": "ListItem", position: i + 1,
      item: { "@type": "Person", name: prenomNom(s.prenom, s.nom), url: `https://www.dataparl.fr/parlementaires/${encodeURIComponent(s.slug)}` },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p className="meta" style={{ marginTop: 0 }}><a href="/senatoriales2026">← Sénatoriales 2026 : tous les départements</a></p>
      <h1>Sénatoriales 2026 : <span className="surligne">{d.nom}</span></h1>
      <p className="lead">
        Le {libelleElection()}, les grands électeurs du département ont élu
        {" "}{elus} sénateur{elus > 1 ? "s" : ""} pour six ans. Retrouvez ci-dessous les élus qui entrent
        au Sénat, ceux qui y sont réélus, les sénateurs qui le quittent, leurs groupes politiques,
        et pour chacun, son équipe de collaborateurs suivie par DataParl&apos;.
      </p>

      <h2>Les nouveaux sénateurs élus en {d.nom}</h2>
      {d.nouveaux.length === 0 ? (
        <p className="meta">Aucun nouveau sénateur enregistré pour l&apos;instant{d.reelus.length || d.sortants.length ? " ; la suite de la page liste les réélus et les sortants." : "."}</p>
      ) : (
        <div className="grille-senateurs">
          {d.nouveaux.map((s) => <CarteSenateur key={s.personne_id} s={s} />)}
        </div>
      )}

      {d.reelus.length > 0 && (
        <>
          <h2>Les sénateurs réélus en {d.nom}</h2>
          <p className="meta">
            Déjà sénateurs avant ce scrutin, ils ont été reconduit{d.reelus.length > 1 ? "s" : ""} dans leurs fonctions
            pour six ans : leur mandat précédent prend fin, le nouveau commence.
          </p>
          <div className="grille-senateurs">
            {d.reelus.map((s) => <CarteSenateur key={s.personne_id} s={s} reelu />)}
          </div>
        </>
      )}

      <h2>Les sénateurs sortants</h2>
      {d.sortants.length === 0 ? (
        <p className="meta">Aucun départ enregistré pour ce scrutin.</p>
      ) : (
        <table className="stats">
          <thead><tr><th>Sénateur sortant</th><th>De</th><th>Sortie</th></tr></thead>
          <tbody>
            {d.sortants.map((s) => (
              <tr key={s.personne_id}>
                <td>
                  <a href={`/parlementaires/${encodeURIComponent(s.slug)}`}>{prenomNom(s.prenom, s.nom)}</a>
                </td>
                <td>{s.debut ? moisAnnee(s.debut) : "inconnue"}</td>
                <td>{s.fin ? moisAnnee(s.fin) : "inconnue"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Après l&apos;élection : les équipes des nouveaux sénateurs</h2>
      <p>
        Chaque nouveau sénateur installe un cabinet parlementaire : collaborateurs, assistants de groupe, attachés
        parlementaires. DataParl&apos; relit chaque semaine les listes officielles publiées par le Sénat pour suivre
        qui entre dans ces équipes, qui les quitte, et quels collaborateurs passent d&apos;un élu à l&apos;autre,
        y compris entre l&apos;Assemblée nationale et le Sénat.
      </p>
      <p className="meta">
        <a href="/mouvements/senat">Les mouvements au Sénat</a>, <a href="/collab">Rechercher un collaborateur</a>,{" "}
        <a href="/senatoriales2026">Tous les départements</a>,{" "}
        <a href="https://www.resultats-elections.interieur.gouv.fr/Senatoriales2026/nouvelle_assemblee/index.html" target="_blank" rel="noopener noreferrer">Résultats officiels (ministère de l&apos;Intérieur)</a>
      </p>
    </>
  );
}
