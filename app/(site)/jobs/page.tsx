import type { Metadata } from "next";
import { authAdmin } from "@/lib/supabaseAdmin";
import ListeOffres, { type OffreListe } from "./_components/ListeOffres";

// Offres d'emploi des équipes parlementaires : page publique.
// Le module vit sur jobs.dataparl.fr (voir proxy.ts) : cette route /jobs
// sert de fondation interne, redirigée depuis dataparl.fr et réécrite depuis
// la racine du sous-domaine.

export const revalidate = 3600;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offres d'emploi parlementaires | DataParl'",
  description:
    "Les offres d'emploi de collaborateur parlementaire : Assemblée nationale, Sénat, Parlement européen. Filtres par chambre, élu, groupe et département.",
  alternates: { canonical: "https://jobs.dataparl.fr/" },
};

// Petite carte statistique arrondie.
function Bulle({ icone, nombre, libelle }: { icone: string; nombre: number; libelle: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: "0 2px 10px rgba(7,26,65,0.06)",
      }}
    >
      <p style={{ margin: "0 0 6px", fontSize: "1.3rem" }}>{icone}</p>
      <p style={{ margin: "0 0 2px", fontSize: "1.5rem", fontWeight: 800, color: "var(--ink)" }}>{nombre}</p>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>{libelle}</p>
    </div>
  );
}

// Étape du fonctionnement du service (état vide).
function Etape({ numero, titre, texte }: { numero: string; titre: string; texte: string }) {
  return (
    <div
      className="card"
      style={{
        maxWidth: "none",
        margin: 0,
        borderRadius: 16,
        display: "grid",
        gap: 6,
      }}
    >
      <p style={{ margin: 0 }}>
        <span style={{ background: "var(--jaune)", color: "#071A41", borderRadius: 999, padding: "3px 12px", fontWeight: 800, fontSize: "0.85rem" }}>
          {numero}
        </span>
      </p>
      <h2 style={{ margin: "6px 0 0", fontSize: "1.05rem" }}>{titre}</h2>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem" }}>{texte}</p>
    </div>
  );
}

export default async function Jobs() {
  let offres: OffreListe[] = [];
  try {
    const { data, error } = await authAdmin()
      .from("job_offers")
      .select(
        "id,titre,description,chambre,departement,elu_prenom,elu_nom,groupe_politique,type_poste,localisation,publie_le,expire_le,source_connector"
      )
      .eq("review_status", "approved")
      .eq("statut", "active")
      .order("publie_le", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw error;
    const aujourdhui = new Date().toISOString().slice(0, 10);
    offres = (data ?? []).filter((o) => !o.expire_le || o.expire_le >= aujourdhui) as OffreListe[];
  } catch {
    offres = [];
  }

  const elus = new Set(offres.map((o) => [o.elu_prenom, o.elu_nom].filter(Boolean).join(" ")).filter(Boolean));
  const departements = new Set(offres.map((o) => o.departement).filter(Boolean));
  const depuis7j = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const nouvelles = offres.filter((o) => o.publie_le && o.publie_le >= depuis7j).length;

  return (
    <>
      <h1>
        <span className="surligne">Offres d&apos;emploi</span> parlementaires
      </h1>
      <p className="lead">
        Les postes de collaborateur parlementaire publiés dans les équipes, collectés depuis les sources officielles et vérifiés à la main.
      </p>

      {/* Carte d'appel : proposer une offre */}
      <div
        style={{
          marginTop: 18,
          background: "#EEF2FB",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: "18px 20px",
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>✉️ Vous avez une offre à publier ?</strong>
          <br />
          <span className="meta">
            Déposez-la depuis votre adresse parlementaire, chaque offre est relue avant publication.
          </span>
        </p>
        <a className="btn" href="/jobs/proposer">Proposer une offre</a>
      </div>

      {offres.length === 0 ? (
        /* État vide : comment fonctionne DataParl' Jobs */
        <div style={{ marginTop: "32px" }}>
          <h2>Aucune offre active pour le moment</h2>
          <p className="lead" style={{ fontSize: "1rem" }}>
            Le service vient de s&apos;ouvrir : les premières offres validées apparaîtront ici. Voici comment il fonctionne.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              margin: "20px 0 0",
            }}
          >
            <Etape
              numero="1"
              titre="Collecte"
              texte="Les annonces des sources officielles (Assemblée nationale, Sénat, Parlement européen, sites des élus) sont relevées automatiquement, chaque mardi et vendredi."
            />
            <Etape
              numero="2"
              titre="Relecture humaine"
              texte="Chaque offre est vérifiée à la main avant publication : intitulé, équipe de l'élu, chambre et département."
            />
            <Etape
              numero="3"
              titre="Publication"
              texte="Les offres validées sont publiées ici, avec un lien vers l'annonce d'origine et un archivage une fois pourvues ou expirées."
            />
          </div>
          <p className="meta" style={{ marginTop: "20px" }}>
            Les élus et leurs équipes peuvent aussi déposer une offre directement :{" "}
            <a href="/jobs/proposer">proposer une offre</a>
            {". Les offres pourvues ou expirées restent consultables dans les "}
            <a href="/jobs/old-jobs">anciennes offres</a>.
          </p>
        </div>
      ) : (
        <>
          {/* Bulles statistiques */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 14,
              margin: "28px 0 0",
            }}
          >
            <Bulle icone="🏛️" nombre={offres.length} libelle="Offres actives" />
            <Bulle icone="🧑‍⚖️" nombre={elus.size} libelle="Élus concernés" />
            <Bulle icone="🗺️" nombre={departements.size} libelle="Départements" />
            <Bulle icone="✨" nombre={nouvelles} libelle="Nouvelles cette semaine" />
          </div>

          <ListeOffres offres={offres} />

          <p className="meta" style={{ marginTop: "28px" }}>
            Les offres pourvues ou expirées restent consultables dans les{" "}
            <a href="/jobs/old-jobs">anciennes offres</a>.
          </p>
        </>
      )}
    </>
  );
}
