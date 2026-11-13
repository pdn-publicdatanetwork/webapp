import type { Metadata } from "next";
import { dateTitre } from "@/lib/daily";
import { MENTIONS_PRESSE, type CategorieMedia } from "../mentions";

// Styles propres à l'espace presse (cartes de la revue de presse).
import "../../_styles/presse.css";

export const metadata: Metadata = {
  title: "Ils parlent de nous",
  description: "Revue de presse : les articles qui parlent de DataParl' et utilisent ses données certifiées pour documenter et vérifier les mouvements des collaborateurs parlementaires.",
  alternates: { canonical: "/presse/ils-parlent-de-nous" },
};
export const revalidate = 3600;

// Domaine lisible pour le lien de sortie (« Lire l'article sur … »).
function domaine(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default async function IlsParlentDeNous({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const media = typeof sp.media === "string" ? sp.media : undefined;
  const categories: CategorieMedia[] = [...new Set(MENTIONS_PRESSE.map((m) => m.categorie))];
  const filtrees = media ? MENTIONS_PRESSE.filter((m) => m.categorie === media) : MENTIONS_PRESSE;
  const listee = filtrees.length ? filtrees : MENTIONS_PRESSE;
  return (
    <>
      <nav className="onglets-pages" aria-label="Espace presse">
        <a href="/presse">Vue d&apos;ensemble</a>
        <a href="/presse/ils-parlent-de-nous" aria-current="page">Ils parlent de nous ({MENTIONS_PRESSE.length})</a>
        <a href="/presse/communiques">Communiqués</a>
      </nav>

      <p className="meta"><a href="/presse">Presse</a></p>
      <h1>Ils parlent de <span className="surligne">DataParl&apos;</span></h1>
      <p className="lead">Presse quotidienne régionale, rédactions nationales, médias spécialisés : voici comment les journalistes utilisent DataParl&apos; pour documenter et vérifier les mouvements au sein des équipes parlementaires.</p>

      {(categories.length > 1 || MENTIONS_PRESSE.length > 1) && (
        <nav className="onglets-pages" aria-label="Filtrer par type de média">
          <a href="/presse/ils-parlent-de-nous" aria-current={media ? undefined : "page"}>Tous ({MENTIONS_PRESSE.length})</a>
          {categories.map((cat) => (
            <a key={cat} href={"/presse/ils-parlent-de-nous?media=" + encodeURIComponent(cat)} aria-current={media === cat ? "page" : undefined}>
              {cat} ({MENTIONS_PRESSE.filter((m) => m.categorie === cat).length})
            </a>
          ))}
        </nav>
      )}

      {MENTIONS_PRESSE.length === 0 ? (
        <div className="communiques-vide">
          <p className="communiques-vide-titre">Aucune parution recensée pour l&apos;instant</p>
          <p className="communiques-vide-texte">Les articles qui s&apos;appuient sur DataParl&apos; apparaîtront ici dès leur signalement.</p>
          <a className="btn" href="/presse">Retour à la page Presse</a>
        </div>
      ) : (
        <div className="mentions">
          {listee.map((m) => (
            <article key={m.id} className={m.capture ? "mention-carte avec-capture" : "mention-carte"}>
              {m.capture && (
                <figure className="mention-capture">
                  <img src={m.capture} alt={m.legendeCapture ?? m.creditCapture ?? "Capture publiée par " + m.media} loading="lazy" />
                  {(m.legendeCapture || m.creditCapture) && (
                    <figcaption className="meta">{[m.legendeCapture, m.creditCapture].filter(Boolean).join(", ")}</figcaption>
                  )}
                </figure>
              )}
              <div className="mention-corps">
                <header className="mention-entete">
                  {m.logo ? (
                    <span className="mention-logo"><img src={m.logo} alt={m.media} /></span>
                  ) : (
                    <strong className="mention-media">{m.media}</strong>
                  )}
                  <time className="meta" dateTime={m.publieLe}>{dateTitre(m.publieLe)}</time>
                </header>
                <h2><a className="titre-lien" href={m.url}>{m.titre}</a></h2>
                <blockquote className="citation">« {m.citation} »</blockquote>
                {m.contexte && <p className="meta mention-contexte">{m.contexte}</p>}
                <p><a className="mention-lien" href={m.url}>Lire l&apos;article sur {domaine(m.url)} →</a></p>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="contribution-presse">
        <p>Vous avez utilisé DataParl&apos; dans un article, une enquête ou une chronique ? Signalez la parution via le <a href="/presse#contact">formulaire presse</a>, elle sera ajoutée ici.</p>
      </section>
    </>
  );
}
