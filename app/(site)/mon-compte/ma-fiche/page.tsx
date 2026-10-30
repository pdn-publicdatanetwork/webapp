"use client";

import { useCallback, useEffect, useState } from "react";
import { sessionActuelle } from "@/lib/supabaseBrowser";

// Ma fiche : profil CV déclaratif, modifiable à tout moment, publié
// immédiatement (éléments futurs publiés automatiquement à leur date
// d'effet). « Tout supprimer » retire la rubrique du site immédiatement ;
// le contenu est conservé en sauvegarde interne, restaurable sur demande.

const TITRES: Record<string, string> = {
  formation: "Formation", carriere: "Expérience", autre_activite: "Autres activités", langues: "Langues",
};
const CATEGORIES = Object.keys(TITRES);

type Declaration = {
  id: string; collab_id: string; categorie: string; libelle: string;
  precision_text: string | null; periode: string | null; visible_a_partir_de: string | null;
};
type Etat = {
  association: { statut: string; collab_slug: string; collab_id: string; gel_jusqu_a: string | null } | null;
  declarations: Declaration[];
};

async function appel(url: string, init?: RequestInit) {
  const s = await sessionActuelle();
  const r = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${s?.access_token}`, "Content-Type": "application/json" },
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

export default function MaFiche() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState("");
  const [nouveau, setNouveau] = useState({ categorie: "formation", libelle: "", precision_text: "", periode: "", visible_a_partir_de: "" });
  const [confirmation, setConfirmation] = useState(false);

  const rafraichir = useCallback(async () => {
    const { ok, data } = await appel("/api/ma-fiche");
    if (ok) setEtat(data);
  }, []);

  useEffect(() => { rafraichir(); }, [rafraichir]);

  const associe = etat?.association?.statut === "verifie";
  const collabId = etat?.association?.collab_id ?? null;

  async function ajouter() {
    setErreur("");
    if (!collabId) return;
    const { ok, data } = await appel("/api/ma-fiche", {
      method: "POST",
      body: JSON.stringify({ collab_id: collabId, ...nouveau, libelle: nouveau.libelle.trim() }),
    });
    if (!ok) return setErreur(data.error ?? "erreur");
    setNouveau({ categorie: "formation", libelle: "", precision_text: "", periode: "", visible_a_partir_de: "" });
    rafraichir();
  }

  async function supprimer(id: string) {
    await appel(`/api/ma-fiche?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    rafraichir();
  }

  async function toutSupprimer() {
    await appel("/api/ma-fiche", { method: "DELETE" });
    setConfirmation(false);
    rafraichir();
  }

  if (!etat) return <p className="meta">Chargement…</p>;

  if (!associe) {
    return (
      <>
        <h1>Ma fiche</h1>
        <p className="card">
          Aucune fiche collaborateur n&apos;est associée à votre compte.{" "}
          <a href="/mon-compte/associer-fiche">Associer ma fiche</a>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Ma fiche : profil CV</h1>
      <p className="lead">
        Modifiable à tout moment, publié immédiatement sur votre fiche (réservé aux comptes DataParl&apos;).
        L&apos;onglet « Parlement » (sources AN/Sénat) reste édité par DataParl&apos; et non modifiable par vous.
      </p>

      {CATEGORIES.map((cat) => {
        const items = etat.declarations.filter((d) => d.categorie === cat);
        return (
          <section key={cat}>
            <h2>{TITRES[cat]}</h2>
            <ul className="organes">
              {items.map((d) => (
                <li key={d.id}>
                  <b>{d.libelle}</b>
                  {d.periode ? <span className="meta"> · {d.periode}</span> : ""}
                  {d.precision_text ? <div className="meta">{d.precision_text}</div> : null}
                  {d.visible_a_partir_de && new Date(d.visible_a_partir_de).getTime() > Date.now() ? (
                    <div className="meta">Publié automatiquement à partir du {d.visible_a_partir_de}</div>
                  ) : null}
                  <button className="lien" onClick={() => supprimer(d.id)}>Supprimer</button>
                </li>
              ))}
              {items.length === 0 && <li className="meta">Rien pour l&apos;instant.</li>}
            </ul>
          </section>
        );
      })}

      <h2>Ajouter un élément</h2>
      <div className="grille-formulaire">
        <label>
          Catégorie
          <select value={nouveau.categorie} onChange={(e) => setNouveau({ ...nouveau, categorie: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{TITRES[c]}</option>)}
          </select>
        </label>
        <label>
          Libellé
          <input value={nouveau.libelle} maxLength={120} onChange={(e) => setNouveau({ ...nouveau, libelle: e.target.value })}
            placeholder="ex. ESCP Business School" />
        </label>
        <label>
          Précision (facultatif)
          <input value={nouveau.precision_text} maxLength={240} onChange={(e) => setNouveau({ ...nouveau, precision_text: e.target.value })}
            placeholder="ex. Master in Management, programme Grande École" />
        </label>
        <label>
          Période (facultatif)
          <input value={nouveau.periode} maxLength={60} onChange={(e) => setNouveau({ ...nouveau, periode: e.target.value })}
            placeholder="ex. 2023 – 2024 ou depuis 2022" />
        </label>
        <label>
          À partir du (pour un poste à venir, facultatif)
          <input type="date" value={nouveau.visible_a_partir_de} onChange={(e) => setNouveau({ ...nouveau, visible_a_partir_de: e.target.value })} />
        </label>
      </div>
      {erreur && <p className="erreur">{erreur}</p>}
      <p><button onClick={ajouter} disabled={!nouveau.libelle.trim()}>Ajouter</button></p>

      <section className="zone-sensible">
        <h2>Zone sensible</h2>
        <p>
          <b>Supprimer tout mon profil CV déclaré</b> : la rubrique disparaît immédiatement de votre fiche.
          Le contenu est conservé dans nos sauvegardes internes et ne peut être restauré que sur votre demande.
          La partie « Parlement » (sources officielles) reste publiée conformément à nos règles.
        </p>
        {confirmation ? (
          <>
            <button onClick={toutSupprimer}>Confirmer la suppression</button>{" "}
            <button className="lien" onClick={() => setConfirmation(false)}>Annuler</button>
          </>
        ) : (
          <button className="danger" onClick={() => setConfirmation(true)}>Tout supprimer</button>
        )}
      </section>
    </>
  );
}