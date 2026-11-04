import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FicheOffre from "@/components/FicheOffre";
import { compterCandidatures, offreVisible } from "@/lib/firestore";
import { idDepuisSlug, slugOffre, titreStandard } from "@/lib/jobs";
import { EMAIL_RE, nomElu, titrePoste, typeContrat } from "@/lib/jobsTexte";
import { normaliser, type OffreListe } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  if (!id) return { title: "Offre introuvable | DataParl' Jobs" };
  const o = await offreVisible(id);
  if (!o) return { title: "Offre introuvable | DataParl' Jobs" };
  const offre = normaliser(o);
  const resume = (offre.description ?? "").replace(/\s+/g, " ").slice(0, 180);
  const eluSocial = nomElu(offre);
  const titreSocial = titrePoste(offre.titre) + (eluSocial ? " - " + eluSocial : "");
  return {
    title: titreStandard(offre),
    description: resume,
    alternates: { canonical: "/offre/" + slugOffre(offre) },
    openGraph: {
      // Titre lisible pour les partages (Telegram, X, Bluesky) : le
      // <title> SEO garde le libellé complet titreStandard.
      title: titreSocial,
      description: resume,
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
  // Les adresses e-mail sont retirées de la description.
  const elu = nomElu(offre);
  const TYPES_EMPLOI: Record<string, string> = {
    Stage: "INTERNSHIP",
    Alternance: "APPRENTICESHIP",
    CDD: "TEMPORARY_CONTRACT",
    CDI: "FULL_TIME",
  };
  const jsonld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: titrePoste(offre.titre),
    description: (offre.description ?? "").replace(EMAIL_RE, "").replace(/\s+/g, " ").trim(),
    employmentType: TYPES_EMPLOI[typeContrat(offre)] ?? "OTHER",
    hiringOrganization: {
      "@type": "Organization",
      name: elu ? "Équipe parlementaire de " + elu : "Équipe parlementaire",
    },
    identifier: offre.id,
    url: "https://jobs.dataparl.fr/offre/" + slug,
  };
  if (offre.publie_le) jsonld.datePosted = offre.publie_le;
  if (offre.expire_le) jsonld.validThrough = offre.expire_le;
  if (offre.localisation) {
    jsonld.jobLocation = { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: offre.localisation } };
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
