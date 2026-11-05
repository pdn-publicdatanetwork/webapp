import type { Metadata } from "next";
import { anciennesOffres } from "@/lib/firestore";
import { normaliser } from "@/lib/types";
import { CHAMBRE_NOM, dateFr, nomElu, titrePoste } from "@/lib/jobsTexte";

// Anciennes offres : validées mais pourvues ou expirées. Affichage
// informatif, sans lien de candidature : la fiche d'une offre archivée
// n'est plus accessible, seule la carte récapitulative reste consultable.
export const revalidate = 300;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anciennes offres | DataParl' Jobs",
  description:
    "Les offres de collaborateur parlementaire pourvues ou expirées, archivées pour consultation.",
  alternates: { canonical: "https://jobs.dataparl.fr/old-jobs" },
};

const LIBELLE_STATUT: Record<string, string> = { expiree: "Expirée", pourvue: "Pourvue" };

type AncienneOffre = ReturnType<typeof normaliser> & { statut: string };

export default async function OldJobs() {
  let offres: AncienneOffre[] = [];
  try {
    const brutes = await anciennesOffres();
    offres = brutes.map((o) => ({
      ...normaliser(o),
      statut: String(o.statut ?? "expiree"),
    }));
  } catch {
    offres = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif-title font-bold text-[#4E2E53]">Anciennes offres</h1>
        <p className="mt-2 text-slate-600">
          Les offres pourvues ou expirées, conservées pour consultation et repérage des équipes qui recrutent.
        </p>
      </div>

      {offres.length === 0 ? (
        <p className="text-slate-500">
          Aucune ancienne offre pour le moment.{" "}
          <a href="/" className="text-[#6C84B0] underline hover:text-[#4E2E53]">Voir les offres actives</a>
        </p>
      ) : (
        <div className="grid gap-4">
          {offres.map((o) => (
            <article
              key={o.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium border border-slate-200">
                  {LIBELLE_STATUT[o.statut ?? "expiree"] ?? o.statut}
                </span>
                {o.chambre && (
                  <span className="bg-[#E4BDE9]/40 text-[#4E2E53] text-xs font-semibold px-2.5 py-1 rounded-full">
                    {CHAMBRE_NOM[o.chambre] ?? o.chambre}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-medium sm:ml-auto">
                  {o.publie_le ? "Publiée le " + dateFr(o.publie_le) : ""}
                  {o.expire_le ? (o.publie_le ? " • " : "") + "expirée le " + dateFr(o.expire_le) : ""}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-serif-title font-bold text-[#4E2E53] leading-snug">
                {titrePoste(o.titre)}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600 flex flex-wrap items-center gap-2">
                <span>{nomElu(o) || (o.groupe_politique ? "Groupe parlementaire" : "Équipe parlementaire")}</span>
                {o.groupe_politique && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{o.groupe_politique}</span>
                  </>
                )}
                {o.localisation && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{o.localisation}</span>
                  </>
                )}
              </p>
            </article>
          ))}
        </div>
      )}

      <p>
        <a href="/" className="text-[#6C84B0] hover:text-[#4E2E53] underline">← Voir les offres actives</a>
      </p>
    </div>
  );
}
