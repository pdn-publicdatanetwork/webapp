import type { Metadata } from "next";
import Link from "next/link";
import { authAdmin } from "@/lib/supabaseAdmin";
import { SIGLE, idDepuisSlug, slugOffre, titreStandard, type Chambre } from "@/lib/jobs";
import { PastilleProvenance } from "../_components/ListeOffres";

// Détail d'une offre : hébergé sur DataParl' (jamais de redirection).
// URL publique : https://jobs.dataparl.fr/<slug> (voir middleware.ts).
// Pastille de provenance : déposée par l'élu ou collectée sur une source publique.

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
  publie_le: string | null;
  expire_le: string | null;
};

const dateFr = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

async function offreVisible(id: string): Promise<Offre | null> {
  const { data, error } = await authAdmin()
    .from("job_offers")
    .select(
      "id,titre,description,chambre,departement,elu_prenom,elu_nom,groupe_politique,type_poste,localisation,parlementaire_slug,source_connector,publie_le,expire_le"
    )
    .eq("id", id)
    .eq("review_status", "approved")
    .eq("statut", "active")
    .maybeSingle();
  if (error || !data) return null;
  const o = data as Offre;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (o.expire_le && o.expire_le < aujourdhui) return null;
  return o;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  const o = id ? await offreVisible(id) : null;
  return o
    ? { title: titreStandard(o) + " | DataParl' Jobs", alternates: { canonical: "https://jobs.dataparl.fr/" + slugOffre(o) } }
    : { title: "Offre introuvable | DataParl'", robots: { index: false, follow: true } };
}

export default async function OffrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  const o = id ? await offreVisible(id) : null;

  if (!o) {
    return (
      <>
        <h1>Offre introuvable</h1>
        <p style={{ marginTop: "24px" }}>
          Cette offre n&apos;existe pas, n&apos;est plus active ou a été retirée.{" "}
          <Link href="/jobs">Voir toutes les offres →</Link>
        </p>
      </>
    );
  }

  const nomElu = [o.elu_prenom, o.elu_nom].filter(Boolean).join(" ");

  return (
    <>
      <p className="meta" style={{ marginBottom: "8px" }}>
        <Link href="/jobs">← Toutes les offres</Link>
      </p>
      <h1>{titreStandard(o)}</h1>

      {/* Informations clés */}
      <div className="card" style={{ margin: "24px 0", display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <PastilleProvenance connector={o.source_connector} avecLibelle />
          {o.chambre && (
            <span style={{ background: "var(--jaune)", color: "#071A41", borderRadius: 999, padding: "4px 12px", fontSize: "0.82rem", fontWeight: 600 }}>
              {SIGLE[o.chambre as Chambre] ?? o.chambre}
            </span>
          )}
          {[o.type_poste, o.departement, o.localisation, o.groupe_politique].filter(Boolean).map((m) => (
            <span key={m} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 12px", fontSize: "0.82rem" }}>
              {m}
            </span>
          ))}
        </div>
        <p className="meta" style={{ margin: 0 }}>
          {nomElu && <>Équipe de {nomElu}, </>}
          {o.publie_le ? "Publiée le " + dateFr(o.publie_le) : "Publication en cours"}
          {o.expire_le ? ", Candidatures jusqu'au " + dateFr(o.expire_le) : ""}
        </p>
      </div>

      {/* Corps de l'offre, hébergé sur DataParl' */}
      {o.description ? (
        <div style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>{o.description}</div>
      ) : (
        <p className="meta">La description complète de cette offre est en cours d&apos;enrichissement.</p>
      )}

      <p style={{ marginTop: "32px" }}>
        <Link href="/jobs">← Retour aux offres</Link>
      </p>
    </>
  );
}
