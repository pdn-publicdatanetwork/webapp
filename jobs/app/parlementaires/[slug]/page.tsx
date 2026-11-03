import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { offresPubliques, anciennesOffres } from "@/lib/firestore";
import { normaliser, type OffreListe } from "@/lib/types";
import { CHAMBRE_NOM, dateFr, titrePoste, typeContrat } from "@/lib/jobsTexte";
import { slugOffre, COULEUR_CHAMBRE } from "@/lib/jobs";
import { DATA_SUPABASE_KEY, DATA_SUPABASE_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

// Page dédiée à un élu : toutes ses offres en cours et passées.
// L'URL en chemin (et non query string) est meilleure pour le SEO :
// chaque élu a une page indexable, lien canonique stable.

type Props = { params: Promise<{ slug: string }> };

async function ficheElu(slug: string) {
  try {
    const res = await fetch(
      DATA_SUPABASE_URL +
        "/rest/v1/parlementaires?" +
        new URLSearchParams({
          select: "slug,prenom,nom,groupe,chambre,photo_url",
          slug: "eq." + slug,
          limit: "1",
        }),
      { headers: { apikey: DATA_SUPABASE_KEY, Authorization: "Bearer " + DATA_SUPABASE_KEY }, cache: "no-store" }
    );
    if (!res.ok) return null;
    return ((await res.json()) ?? [])[0] ?? null;
  } catch {
    return null;
  }
}

function Card({ o }: { o: OffreListe }) {
  return (
    <Link href={"/offre/" + slugOffre(o)} className="block bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#4E2E53]/30 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-[#E4BDE9]/40 text-[#4E2E53] text-xs font-semibold px-2.5 py-1 rounded-full">{typeContrat(o)}</span>
          {o.source_connector === "proposition" ? (
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200/60">✨ Déposée par l&apos;élu</span>
          ) : (
            <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium border border-slate-200">Collectée</span>
          )}
        </div>
        <span className="text-xs text-slate-400 font-medium">{o.publie_le ? "Publiée le " + dateFr(o.publie_le) : null}</span>
      </div>
      <h3 className="text-lg font-serif-title font-bold text-[#4E2E53] leading-snug">{titrePoste(o.titre)}</h3>
      <p className="mt-2 text-xs text-slate-500 font-medium">📍 {o.localisation ?? o.departement ?? (o.chambre ? CHAMBRE_NOM[o.chambre] : "Paris")}</p>
    </Link>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const f = await ficheElu(slug);
  const nom = f ? [f.prenom, f.nom].filter(Boolean).join(" ") : slug;
  return {
    title: "Offres de l'équipe de " + nom + " | DataParl' Jobs",
    description: "Toutes les offres de collaborateur parlementaire, en cours et passées, de l'équipe de " + nom + ".",
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const f = await ficheElu(slug);
  const [publiees, passees] = await Promise.all([offresPubliques(), anciennesOffres()]);
  const filtre = (o: OffreListe) => o.parlementaire_slug === slug;
  const enCours = publiees.map(normaliser).filter(filtre);
  const anciennes = passees.map(normaliser).filter(filtre);
  if (!f && enCours.length === 0 && anciennes.length === 0) notFound();
  const nom = f ? [f.prenom, f.nom].filter(Boolean).join(" ") : "Élu";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <nav className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="text-[#6C84B0] hover:text-[#4E2E53] underline">Offres</Link>
        <span>›</span>
        <span className="text-slate-400">{nom}</span>
      </nav>

      <header className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex items-center gap-4">
        {f?.photo_url ? (
          <img src={f.photo_url} alt={nom} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#E4BDE9]" />
        ) : (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0" style={{ background: f?.chambre ? COULEUR_CHAMBRE[f.chambre] ?? "#4E2E53" : "#4E2E53" }}>
            {nom.slice(0, 1)}
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-serif-title font-bold text-[#4E2E53]">{nom}</h1>
          <p className="text-sm text-slate-600 font-medium flex flex-wrap items-center gap-2">
            {f?.groupe && <span>{f.groupe}</span>}
            {f?.chambre && <span className="bg-[#ECF1FC] text-[#4E2E53] px-2.5 py-0.5 rounded-lg text-xs font-bold">{CHAMBRE_NOM[f.chambre] ?? f.chambre}</span>}
          </p>
          {f?.slug && (
            <a href={"https://www.dataparl.fr/parlementaires/" + f.slug} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-[#6C84B0] hover:text-[#4E2E53] font-semibold underline">
              Fiche complète sur DataParl&apos; →
            </a>
          )}
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif-title font-bold text-lg text-[#4E2E53]">Offres en cours ({enCours.length})</h2>
        {enCours.length === 0 ? (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-2xl p-6">Aucune offre en cours. Créez une alerte pour être prévenu dès qu&apos;une paraît.</p>
        ) : (
          enCours.map((o) => <Card key={o.id} o={o} />)
        )}
      </section>

      {anciennes.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif-title font-bold text-lg text-slate-500">Offres passées ({anciennes.length})</h2>
          {anciennes.map((o) => <Card key={o.id} o={o} />)}
        </section>
      )}
    </div>
  );
}
