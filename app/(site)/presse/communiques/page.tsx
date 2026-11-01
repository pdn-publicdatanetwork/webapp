import type { Metadata } from "next";
import { dateTitre } from "@/lib/daily";
import { authAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = { title: "Communiqués de presse", alternates: { canonical: "/presse/communiques" } };
export const revalidate = 3600;

export default async function Communiques() {
  let liste: { slug: string; titre: string; chapo: string; publie_le: string }[] = [];
  try {
    const { data } = await authAdmin().from("communiques").select("slug, titre, chapo, publie_le").eq("statut", "publie").order("publie_le", { ascending: false }).limit(100);
    liste = (data ?? []) as typeof liste;
  } catch { /* liste vide */ }
  return (
    <>
      <p className="meta"><a href="/presse">Presse</a></p>
      <h1><span className="surligne">Communiqués</span></h1>
      {liste.length === 0 ? (
        <div className="communiques-vide">
          <p className="communiques-vide-titre">Aucun communiqué publié pour l&apos;instant</p>
          <p className="communiques-vide-texte">Les communiqués de presse apparaîtront ici dès leur publication. En attendant, vous pouvez nous écrire pour toute demande de données ou de précision.</p>
          <a className="btn" href="/presse">Retour à la page Presse</a>
          <p className="meta">Contact : <a href="mailto:presse@dataparl.fr">presse@dataparl.fr</a></p>
        </div>
      ) : (
        <ul className="jours">
          {liste.map((c) => (
            <li key={c.slug}><a href={`/presse/communiques/${c.slug}`}><strong>{c.titre}</strong><span>{dateTitre(c.publie_le.slice(0, 10))}</span></a></li>
          ))}
        </ul>
      )}
      <p>Pour toute demande : <a href="/presse#contact">contact presse</a>.</p>
    </>
  );
}
