import type { Metadata } from "next";
import Link from "next/link";
import { offreVisible } from "@/lib/jobsFirestore";
import { SIGLE, idDepuisSlug, slugOffre, titreStandard, type Chambre } from "@/lib/jobs";
import { PastilleProvenance } from "../_components/ListeOffres";
import PhotoElu from "../_components/PhotoElu";

// Détail d'une offre, interface v2 : en-tête avec l'élu, titre court du poste,
// zone d'action pour candidater, corps structuré et liens de confiance vers
// la fiche DataParl' de l'élu et l'annonce d'origine.
// URL publique : https://jobs.dataparl.fr/<slug>

export const revalidate = 3600;
export const dynamic = "force-dynamic";

type Offre = {
  id: string;
  titre: string;
  description: string;
  chambre: string | null;
  departement: string | null;
  elu_prenom: string | null;
  elu_nom: string | null;
  groupe_politique: string | null;
  type_poste: string | null;
  localisation: string | null;
  parlementaire_slug: string | null;
  source_connector: string;
  source_url: string | null;
  publie_le: string | null;
  expire_le: string | null;
};

const dateFr = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

async function chargée(id: string): Promise<Offre | null> {
  return (await offreVisible(id)) as unknown as Offre | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  const o = id ? await chargée(id) : null;
  return o
    ? { title: titreStandard(o) + " | DataParl' Jobs", alternates: { canonical: "https://jobs.dataparl.fr/" + slugOffre(o) } }
    : { title: "Offre introuvable | DataParl' Jobs", robots: { index: false, follow: true } };
}

export default async function OffrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  const o = id ? await chargée(id) : null;

  if (!o) {
    return (
      <>
        <h1>Offre introuvable</h1>
        <p style={{ marginTop: "24px" }}>
          Cette offre n&apos;existe pas, n&apos;est plus active ou a été retirée.{" "}
          <Link href="/jobs">Voir toutes les offres</Link>
        </p>
      </>
    );
  }

  const nomElu = [o.elu_prenom, o.elu_nom].filter(Boolean).join(" ");
  // Moyen de contact : première adresse e-mail présente dans l'annonce.
  const email = o.description?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ?? null;
  const objet = encodeURIComponent("Candidature : " + o.titre);

  return (
    <>
      <p className="meta" style={{ marginBottom: "14px" }}>
        <Link href="/jobs">← Toutes les offres</Link>
      </p>

      {/* En-tête : élu, titre court du poste, badges */}
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <PhotoElu chambre={o.chambre} slug={o.parlementaire_slug} prenom={o.elu_prenom} nom={o.elu_nom} />
        <div style={{ minWidth: 220, flex: 1 }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", marginBottom: ".3rem" }}>{o.titre}</h1>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Équipe de{" "}
            {o.parlementaire_slug ? (
              <a href={"https://www.dataparl.fr/parlementaires/" + o.parlementaire_slug}>{nomElu || "l'élu"}</a>
            ) : (
              (nomElu || "l'élu")
            )}
            {o.groupe_politique ? ", " + o.groupe_politique : ""}
            {o.chambre ? ", " + (SIGLE[o.chambre as Chambre] ?? o.chambre) : ""}
            {o.departement ? ", " + o.departement : ""}
          </p>
        </div>
      </div>

      {/* Badges : source, contrat, dates */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "14px 0 0" }}>
        <PastilleProvenance connector={o.source_connector} avecLibelle />
        {o.type_poste && (
          <span style={{ background: "var(--jaune)", color: "#071A41", borderRadius: 999, padding: "4px 12px", fontSize: ".82rem", fontWeight: 600 }}>
            {o.type_poste}
          </span>
        )}
        {o.localisation && (
          <span style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 12px", fontSize: ".82rem" }}>
            {o.localisation}
          </span>
        )}
        <span style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 12px", fontSize: ".82rem" }}>
          {o.publie_le ? "Publiée le " + dateFr(o.publie_le) : "Publication en cours"}
          {o.expire_le ? ", jusqu'au " + dateFr(o.expire_le) : ""}
        </span>
      </div>

      {/* Zone d'action : candidater */}
      <div
        style={{
          margin: "22px 0",
          background: "#EEF2FB",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>{email ? "Cette offre recrute" : "Pour candidater"}</strong>
          <br />
          <span className="meta">
            {email
              ? "Écrivez à " + email + " en présentant votre parcours et vos motivations."
              : "Les consignes de candidature figurent dans l'annonce ci-dessous."}
          </span>
        </p>
        {email ? (
          <a className="btn" style={{ marginTop: 0 }} href={"mailto:" + email + "?subject=" + objet}>
            Contacter et postuler
          </a>
        ) : o.source_url ? (
          <a className="btn" style={{ marginTop: 0 }} href={o.source_url} target="_blank" rel="noopener noreferrer">
            Voir l&apos;annonce d&apos;origine
          </a>
        ) : null}
      </div>

      {/* Corps de l'annonce */}
      {o.description ? (
        <div style={{ whiteSpace: "pre-line", lineHeight: 1.75, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: "22px 24px" }}>
          {o.description}
        </div>
      ) : (
        <p className="meta">La description complète de cette offre est en cours d&apos;enrichissement.</p>
      )}

      {/* Pied de confiance */}
      <div style={{ marginTop: 26, display: "grid", gap: 8 }}>
        {o.parlementaire_slug && (
          <p style={{ margin: 0 }}>
            <a href={"https://www.dataparl.fr/parlementaires/" + o.parlementaire_slug}>
              Voir la fiche de {nomElu || "l'élu"} sur DataParl&apos; →
            </a>
          </p>
        )}
        {o.source_connector !== "proposition" && o.source_url && (
          <p className="meta" style={{ margin: 0 }}>
            Offre collectée :{" "}
            <a href={o.source_url} target="_blank" rel="noopener noreferrer">annonce d&apos;origine</a>
          </p>
        )}
        <p className="meta" style={{ margin: 0 }}>
          Chaque offre est relue avant publication. Une anomalie ? Écrivez à{" "}
          <a href="mailto:bienvenue@dataparl.fr">bienvenue@dataparl.fr</a>.
        </p>
      </div>
    </>
  );
}
