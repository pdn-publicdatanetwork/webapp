import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Partage from "@/app/_components/Partage";
import { dateTitre } from "@/lib/daily";
import { authAdmin } from "@/lib/supabaseAdmin";
import { texteVersHtml } from "@/lib/gabarit";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

async function lire(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { data } = await authAdmin().from("communiques").select("slug, titre, chapo, corps, publie_le").eq("slug", slug).eq("statut", "publie").maybeSingle();
  return data as { slug: string; titre: string; chapo: string; corps: string; publie_le: string } | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await lire((await params).slug).catch(() => null);
  if (!c) return {};
  return { title: c.titre, description: c.chapo.slice(0, 200) || undefined, alternates: { canonical: `/presse/communiques/${c.slug}` }, openGraph: { siteName: "DataParl'", title: c.titre, description: c.chapo.slice(0, 200), type: "article" } };
}

export default async function Communique({ params }: Props) {
  const c = await lire((await params).slug).catch(() => null);
  if (!c) notFound();
  const url = `https://www.dataparl.fr/presse/communiques/${c.slug}`;
  return (
    <article className="etroit">
      <p className="meta"><a href="/presse/communiques">Communiqués de presse</a>, {dateTitre(c.publie_le.slice(0, 10))}</p>
      <h1>{c.titre}</h1>
      {c.chapo && <p className="communique-chapo">{c.chapo}</p>}
      <div dangerouslySetInnerHTML={{ __html: texteVersHtml(c.corps) }} />
      <Partage url={url} titre={c.titre} texte={c.titre} />
      <p className="meta">Contact presse : <a href="mailto:presse@dataparl.fr">presse@dataparl.fr</a>. Réutilisation libre avec la mention « DataParl&apos; (dataparl.fr) ».</p>
    </article>
  );
}
