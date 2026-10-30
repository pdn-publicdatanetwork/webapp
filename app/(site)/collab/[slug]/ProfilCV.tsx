"use client";

import { useEffect, useState } from "react";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import styles from "./fiche.module.css";

// Rubrique « Profil CV » de la fiche collaborateur : éléments déclarés par
// l'intéressé, réservés aux comptes (même barrière que le parcours complet).
// Bandeau obligatoire : déclaré par la personne, non issu des listes
// officielles. Visuellement distinct du parcours certifié (badge coral,
// bordure coral). Sans session ou sans élément visible : rien d'affiché côté
// public, le voile « réservé aux comptes » pour les connectés.

const TITRES: Record<string, string> = {
  formation: "Formation", carriere: "Expérience", autre_activite: "Autres activités", langues: "Langues",
};

type Declaration = {
  id: string; categorie: string; libelle: string;
  precision_text: string | null; periode: string | null; visible_a_partir_de: string | null;
};

export default function ProfilCV({ slug }: { slug: string }) {
  const [element, setElement] = useState<
    | { type: "chargement" }
    | { type: "voile" }
    | { type: "rien" }
    | { type: "profil"; declarations: Declaration[] }
  >({ type: "chargement" });

  useEffect(() => {
    (async () => {
      const s = await sessionActuelle();
      if (!s) return setElement({ type: "voile" });
      const r = await fetch(`/api/profil-cv?slug=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      if (!r.ok) return setElement({ type: "voile" });
      const data = await r.json();
      setElement(data.vide ? { type: "rien" } : { type: "profil", declarations: data.declarations });
    })();
  }, [slug]);

  if (element.type === "chargement") return null;
  if (element.type === "voile") {
    return (
      <section className={`${styles.bloc} ${styles.blocDeclare}`}>
        <div className={styles.enteteBloc}>
          <h2>Profil CV</h2>
          <span className={`${styles.badge} ${styles.badgeDeclare}`}>Déclaré par l&apos;intéressé</span>
        </div>
        <p className="card" style={{ maxWidth: "none" }}>
          Le profil CV déclaré par la personne (formations, expériences, autres activités) est réservé aux
          comptes DataParl&apos;, gratuits.{" "}
          <a href="/inscription">Créer un compte</a> ou <a href="/connexion">se connecter</a>.
        </p>
      </section>
    );
  }
  if (element.type === "rien") {
    // C'est votre fiche ? Visible pour tous : on ne sait pas qui consulte.
    return (
      <p className="meta" style={{ marginTop: 24 }}>
        C&apos;est votre fiche ? <a href={`/mon-compte/associer-fiche?slug=${encodeURIComponent(slug)}`}>Associez-la à votre compte</a> pour
        publier votre profil CV (formations, expériences).
      </p>
    );
  }

  const parCategorie = new Map<string, Declaration[]>();
  for (const d of element.declarations) {
    parCategorie.set(d.categorie, [...(parCategorie.get(d.categorie) ?? []), d]);
  }

  return (
    <section className={`${styles.bloc} ${styles.blocDeclare}`}>
      <div className={styles.enteteBloc}>
        <h2>Profil CV</h2>
        <span className={`${styles.badge} ${styles.badgeDeclare}`}>Déclaré par l&apos;intéressé</span>
      </div>
      <p className="meta" style={{ margin: "2px 0 14px" }}>
        Rubrique déclarée par l&apos;intéressé, transmise directement par la personne : elle n&apos;est pas issue
        des listes officielles de l&apos;AN ou du Sénat, qui restent la seule source des autres rubriques.{" "}
        <a href="/methode#profil-cv">Voir nos règles</a>.
      </p>
      {[...parCategorie.entries()].map(([cat, items]) => (
        <div key={cat}>
          <h3>{TITRES[cat] ?? cat}</h3>
          <ul className="organes">
            {items.map((d) => (
              <li key={d.id}>
                <b>{d.libelle}</b>
                {d.periode ? <span className="meta">, {d.periode}</span> : ""}
                {d.precision_text ? <div className="meta">{d.precision_text}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
