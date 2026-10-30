import type { Metadata } from "next";
import { authAdmin } from "@/lib/supabaseAdmin";
import { SIGLE, titreStandard, type Chambre } from "@/lib/jobs";

// Anciennes offres : offres validées mais pourvues ou expirées.
// Elles ne sont plus actives : affichage informatif, sans lien de candidature.
// URL publique : https://jobs.dataparl.fr/old-jobs (voir middleware.ts).

export const revalidate = 300;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anciennes offres | DataParl' Jobs",
  description:
    "Les offres de collaborateur parlementaire pourvues ou expirées, archivées pour consultation.",
  alternates: { canonical: "https://jobs.dataparl.fr/old-jobs" },
};

type Offre = {
  id: string;
  titre: string;
  chambre: string | null;
  departement: string | null;
  elu_prenom: string | null;
  elu_nom: string | null;
  groupe_politique: string | null;
  type_poste: string | null;
  localisation: string | null;
  statut: string;
  publie_le: string | null;
  expire_le: string | null;
};

const dateFr = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

const LIBELLE: Record<string, string> = { expiree: "Expirée", pourvue: "Pourvue" };

export default async function OldJobs() {
  let offres: Offre[] = [];
  try {
    const { data, error } = await authAdmin()
      .from("job_offers")
      .select(
        "id,titre,chambre,departement,elu_prenom,elu_nom,groupe_politique,type_poste,localisation,statut,publie_le,expire_le"
      )
      .eq("review_status", "approved")
      .in("statut", ["expiree", "pourvue"])
      .order("publie_le", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw error;
    offres = (data ?? []) as Offre[];
  } catch {
    offres = [];
  }

  return (
    <>
      <h1>
        Anciennes <span className="surligne">offres</span>
      </h1>
      <p className="lead">
        Les offres de collaborateur parlementaire pourvues ou expirées, conservées pour consultation et repérage des équipes qui recrutent.
      </p>

      {offres.length === 0 ? (
        <p style={{ marginTop: "32px" }}>
          Aucune ancienne offre pour le moment.{" "}
          <a href="/jobs">Voir les offres actives →</a>
        </p>
      ) : (
        <div style={{ display: "grid", gap: 16, marginTop: "28px" }}>
          {offres.map((o) => (
            <article key={o.id} className="card">
              <p style={{ margin: "0 0 8px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ border: "1px solid var(--line)", color: "var(--muted)", borderRadius: 999, padding: "3px 10px", fontSize: "0.75rem" }}>
                  {LIBELLE[o.statut] ?? o.statut}
                </span>
                {o.chambre && (
                  <span style={{ background: "var(--jaune)", color: "#071A41", borderRadius: 999, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
                    {SIGLE[o.chambre as Chambre] ?? o.chambre}
                  </span>
                )}
              </p>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.08rem" }}>{titreStandard(o)}</h2>
              <p className="meta" style={{ margin: 0 }}>
                {[o.type_poste, o.localisation].filter(Boolean).join(", ")}
                {o.publie_le ? ", publiée le " + dateFr(o.publie_le) : ""}
                {o.expire_le ? ", expirée le " + dateFr(o.expire_le) : ""}
              </p>
            </article>
          ))}
        </div>
      )}

      <p className="meta" style={{ marginTop: "28px" }}>
        <a href="/jobs">← Voir les offres actives</a>
      </p>
    </>
  );
}
