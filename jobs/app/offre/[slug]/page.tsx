import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FicheOffre from "@/components/FicheOffre";
import { offreVisible } from "@/lib/firestore";
import { idDepuisSlug, titreStandard } from "@/lib/jobs";
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
  return {
    title: titreStandard(offre) + " | DataParl' Jobs",
    description: (offre.description ?? "").replace(/\s+/g, " ").slice(0, 180),
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  if (!id) notFound();
  const o = await offreVisible(id);
  if (!o) notFound();
  const offre: OffreListe = normaliser(o);
  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="text-[#6C84B0] hover:text-[#4E2E53] underline">Offres</Link>
        <span>›</span>
        <span className="text-slate-400 truncate max-w-[50vw]">{offre.titre}</span>
      </nav>
      <FicheOffre offre={offre} />
    </div>
  );
}
