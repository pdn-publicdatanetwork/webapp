import Link from "next/link";
import type { ReactNode } from "react";

// Classement visuel : le top N en barres, en complément de la grille
// DataParl' Sheets (recherche Ctrl+F, export CSV). Rendu serveur.
type Item = { nom: string; lien: string; libelle?: string; valeur: number; texte: string };

export default function ClassementTop({
  titre, note, items, barre,
}: { titre: string; note?: ReactNode; items: Item[]; barre: string }) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.valeur));
  return (
    <section>
      <h2>{titre}</h2>
      {note}
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((it, i) => (
          <li
            key={it.lien + "-" + i}
            style={{
              display: "grid", gridTemplateColumns: "1.75rem 1fr", columnGap: "0.6rem",
              alignItems: "start", padding: "0.45rem 0",
              borderTop: i === 0 ? "none" : "1px solid #e7e3da",
            }}
          >
            <span className="meta">{i + 1}.</span>
            <div>
              <Link href={it.lien}>{it.nom}</Link>
              {it.libelle ? <span className="meta">, {it.libelle}</span> : null}
              <span className="meta">, {it.texte}</span>
              <div aria-hidden="true" style={{ background: "#eceae4", borderRadius: "999px", height: "8px", marginTop: "0.35rem", maxWidth: "26rem" }}>
                <div
                  className={barre}
                  style={{ width: String(Math.max(4, Math.round((it.valeur / max) * 100))) + "%", height: "100%", borderRadius: "999px" }}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
