import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FicheOffre from "@/components/FicheOffre";
import { compterCandidatures, offreVisible } from "@/lib/firestore";
import { DATA_SUPABASE_KEY, DATA_SUPABASE_URL } from "@/lib/env";
import { descriptionSeo, idDepuisSlug, slugOffre, titreSeo } from "@/lib/jobs";
import { EMAIL_RE, nomElu, tempsTravail, titrePoste, typeContrat, villeDe } from "@/lib/jobsTexte";
import { normaliser, type OffreListe } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// Photo de l'élu (logo de l'organisation recruteur dans le JSON-LD) :
// lecture publique de la base parlementaires, mise en cache 24 h.
async function photoElu(slug: string | null): Promise<string | null> {
  if (!slug) return null;
  try {
    const r = await fetch(
      DATA_SUPABASE_URL + "/rest/v1/parlementaires?select=photo_url&slug=eq." + encodeURIComponent(slug),
      {
        headers: { apikey: DATA_SUPABASE_KEY, authorization: "Bearer " + DATA_SUPABASE_KEY },
        next: { revalidate: 86400 },
      }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { photo_url?: string | null }[];
    return j?.[0]?.photo_url ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  if (!id) return { title: "Offre introuvable | DataParl' Jobs" };
  const o = await offreVisible(id);
  if (!o) return { title: "Offre introuvable | DataParl' Jobs" };
  const offre = normaliser(o);
  // <title> et <meta description> orientés recherche : poste, contrat et
  // ville en tête du titre (Google coupe l'affichage vers 60 caractères).
  const description = descriptionSeo(offre);
  const eluSocial = nomElu(offre);
  const titreSocial = titrePoste(offre.titre) + (eluSocial ? " - " + eluSocial : "");
  return {
    title: titreSeo(offre),
    description,
    alternates: { canonical: "/offre/" + slugOffre(offre) },
    openGraph: {
      // Titre lisible pour les partages (Telegram, X, Bluesky) : le
      // <title> SEO garde le libellé court orienté recherche.
      title: titreSocial,
      description,
      type: "article",
      locale: "fr_FR",
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  if (!id) notFound();
  const o = await offreVisible(id);
  if (!o) notFound();
  const offre: OffreListe = normaliser(o);
  const nbCandidatures = await compterCandidatures(slug);

  // JSON-LD JobPosting : données structurées pour les moteurs et les LLM.
  // Les adresses e-mail sont retirées de la description ; l'adresse est
  // normalisée au format PostalAddress attendu par Google Emplois
  // (addressLocality = ville, addressRegion = département, addressCountry).
  const elu = nomElu(offre);
  const TYPES_EMPLOI: Record<string, string> = {
    Stage: "INTERN",
    Alternance: "APPRENTICESHIP",
    CDD: "TEMPORARY",
    CDI: "FULL_TIME",
  };
  const emploi: string[] = [TYPES_EMPLOI[typeContrat(offre)] ?? "OTHER"];
  if (tempsTravail(offre.description) === "Temps partiel") emploi.push("PART_TIME");
  const logo = await photoElu(offre.parlementaire_slug);
  const jsonld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: titrePoste(offre.titre),
    description: (offre.description ?? "").replace(EMAIL_RE, "").replace(/\s+/g, " ").trim(),
    employmentType: emploi,
    hiringOrganization: {
      "@type": "Organization",
      name: elu ? "Équipe parlementaire de " + elu : "Équipe parlementaire",
      sameAs: offre.parlementaire_slug
        ? "https://www.dataparl.fr/parlementaires/" + offre.parlementaire_slug
        : "https://jobs.dataparl.fr",
      ...(logo ? { logo } : {}),
    },
    identifier: offre.id,
    url: "https://jobs.dataparl.fr/offre/" + slug,
  };
  if (offre.publie_le) jsonld.datePosted = offre.publie_le;
  if (offre.expire_le) jsonld.validThrough = offre.expire_le;
  const ville = villeDe(offre.localisation) ?? offre.localisation;
  if (ville || offre.departement) {
    const adresse: Record<string, unknown> = { "@type": "PostalAddress", addressCountry: "FR" };
    if (ville) adresse.addressLocality = ville;
    // Les séries sénatoriales type « Français établis hors de France » ne
    // sont pas des régions valides pour Google Emplois : on ne garde que
    // les départements plausibles (libellés courts).
    if (offre.departement && offre.departement.length <= 30) adresse.addressRegion = offre.departement;
    jsonld.jobLocation = { "@type": "Place", address: adresse };
  }
  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonld) }} />
      <nav className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="text-[#6C84B0] hover:text-[#4E2E53] underline">Offres</Link>
        <span>›</span>
        <span className="text-slate-400 truncate max-w-[50vw]">{offre.titre}</span>
      </nav>
      <FicheOffre offre={offre} nbCandidatures={nbCandidatures} />
    </div>
  );
}
