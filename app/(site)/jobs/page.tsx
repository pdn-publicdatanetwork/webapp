import type { Metadata } from "next";
import { Suspense } from "react";
import { offresPubliques } from "@/lib/jobsFirestore";
import AlerteEmplois from "./_components/AlerteEmplois";
import ListeOffres, { type OffreListe } from "./_components/ListeOffres";

// Accueil de DataParl' Jobs (jobs.dataparl.fr) : interface à la Google
// Careers, propre au module, distincte du site www. Recherche centrale,
// pastilles rapides, sidebar de filtres avec compteurs. Données Firestore.

export const revalidate = 3600;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offres d'emploi parlementaires | DataParl' Jobs",
  description:
    "Toutes les offres de collaborateur parlementaire : Assemblée nationale, Sénat, Parlement européen. Collectées sur les sources officielles ou déposées par les élus, toujours vérifiées.",
  alternates: { canonical: "https://jobs.dataparl.fr/" },
};

// Pastille rapide : filtre en un clic, pilotée par l'URL.
const PILLES: { libelle: string; href: string }[] = [
  { libelle: "Assemblée nationale", href: "/jobs?chambre=an" },
  { libelle: "Sénat", href: "/jobs?chambre=senat" },
  { libelle: "Parlement européen", href: "/jobs?chambre=pe" },
  { libelle: "Stage", href: "/jobs?type=Stage" },
  { libelle: "CDI", href: "/jobs?type=CDI" },
  { libelle: "CDD", href: "/jobs?type=CDD" },
];

function Chiffre({ nombre, libelle }: { nombre: number; libelle: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 18px" }}>
      <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--ink)", fontFamily: "var(--font-spectral), Georgia, serif" }}>
        {nombre}
      </p>
      <p style={{ margin: 0, fontSize: ".85rem", color: "var(--muted)" }}>{libelle}</p>
    </div>
  );
}

export default async function Jobs() {
  let offres: OffreListe[] = [];
  try {
    offres = (await offresPubliques()) as unknown as OffreListe[];
  } catch {
    offres = [];
  }

  const elus = new Set(offres.map((o) => [o.elu_prenom, o.elu_nom].filter(Boolean).join(" ")).filter(Boolean));
  const departements = new Set(offres.map((o) => o.departement).filter(Boolean));
  const depuis7j = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const nouvelles = offres.filter((o) => o.publie_le && o.publie_le >= depuis7j).length;
  const peu = offres.length > 0 && offres.length < 4;

  return (
    <>
      <h1 style={{ marginBottom: ".4rem" }}>
        Travailler au <span className="surligne">Parlement</span>
      </h1>
      <p className="lead">
        Toutes les offres de collaborateur parlementaire : Assemblée nationale, Sénat, Parlement
        européen. Collectées sur les sources officielles ou déposées directement par les élus,
        et relues une à une avant publication. Gratuit, sans publicité.
      </p>

      {/* Recherche centrale : pilote la liste via l'URL (?q=…) */}
      <form action="/jobs" method="get" className="jobs-recherche" role="search">
        <input
          type="search"
          name="q"
          placeholder="Communication, juridique, Paris, stage…"
          aria-label="Rechercher une offre"
        />
        <button className="btn" type="submit" style={{ marginTop: 0 }}>Rechercher</button>
      </form>

      {/* Pastilles rapides : filtrage en un clic */}
      <div className="jobs-pilles" aria-label="Filtres rapides">
        {PILLES.map((p) => (
          <a key={p.href} href={p.href} className="jobs-pille">{p.libelle}</a>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
        <a className="btn" href="/jobs/proposer" style={{ marginTop: 0 }}>Publier une offre</a>
        <a className="btn secondaire" href="/jobs/old-jobs" style={{ marginTop: 0 }}>Voir les anciennes offres</a>
      </div>

      {peu ? (
        <p className="meta" style={{ marginTop: 22 }}>
          {offres.length} offre{offres.length > 1 ? "s" : ""} active{offres.length > 1 ? "s" : ""} en
          ce moment. Le recrutement parlementaire est cyclique : les vagues de postes reviennent
          surtout à la rentrée et après les élections. Revenez régulièrement ou laissez votre
          e-mail juste en dessous.
        </p>
      ) : offres.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 26 }}>
          <Chiffre nombre={offres.length} libelle="Offres actives" />
          <Chiffre nombre={elus.size} libelle="Élus concernés" />
          <Chiffre nombre={departements.size} libelle="Départements" />
          {nouvelles > 0 && <Chiffre nombre={nouvelles} libelle="Nouvelles cette semaine" />}
        </div>
      ) : null}

      <AlerteEmplois />

      {offres.length === 0 ? (
        <div style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: "1.2rem" }}>Aucune offre active en ce moment</h2>
          <p className="lead" style={{ fontSize: "1rem" }}>
            C&apos;est normal : le recrutement parlementaire est cyclique. Les annonces se
            concentrent à la rentrée, après les élections et lors des mouvements de groupes.
            Les nouvelles offres validées apparaissent ici en direct, et vous pouvez être
            prévenu par e-mail dès leur publication.
          </p>
          <ul style={{ paddingLeft: "1.2em", color: "var(--muted)", fontSize: ".95rem" }}>
            <li style={{ marginBottom: 6 }}>
              Consultez les <a href="/jobs/old-jobs">anciennes offres</a> pour découvrir le
              marché et les profils recherchés.
            </li>
            <li style={{ marginBottom: 6 }}>
              Suivez les <a href="https://www.dataparl.fr/">mouvements de collaborateurs sur
              DataParl&apos;</a> pour repérer les équipes qui recrutent.
            </li>
            <li>
              Élu ou membre d&apos;une équipe : <a href="/jobs/proposer">publiez votre offre</a>{" "}
              directement, depuis votre adresse parlementaire.
            </li>
          </ul>
        </div>
      ) : (
        <>
          <Suspense fallback={null}>
            <ListeOffres offres={offres} />
          </Suspense>
          <p className="meta" style={{ marginTop: 26 }}>
            Les offres pourvues ou expirées restent consultables dans les{" "}
            <a href="/jobs/old-jobs">anciennes offres</a>.
          </p>
        </>
      )}
    </>
  );
}
