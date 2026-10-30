"use client";

import { useCallback, useEffect, useState } from "react";
import { sessionActuelle } from "@/lib/supabaseBrowser";

// Ma fiche : éditeur du profil CV déclaratif, section par section (façon
// LinkedIn) : ajout et édition en place, champs adaptés à chaque rubrique,
// publication immédiate (éléments futurs publiés automatiquement à leur
// date d'effet). « Tout supprimer » retire la rubrique du site
// immédiatement ; le contenu est conservé en sauvegarde interne,
// restaurable sur demande.

type Declaration = {
  id: string; collab_id: string; categorie: string; libelle: string;
  precision_text: string | null; periode: string | null; visible_a_partir_de: string | null;
  supprime_le?: string | null;
};
type Etat = {
  association: { statut: string; collab_slug: string; collab_id: string; gel_jusqu_a: string | null } | null;
  declarations: Declaration[];
};
type Champs = { libelle: string; precision_text: string; periode: string; visible_a_partir_de: string };

const VIDE: Champs = { libelle: "", precision_text: "", periode: "", visible_a_partir_de: "" };

const CATS = [
  {
    k: "formation", titre: "Formation", aide: "Diplômes, écoles, universités",
    libelle: "Diplôme ou formation", phLibelle: "ex. ESCP Business School",
    precision: "Mention ou spécialité (facultatif)", phPrecision: "ex. Master in Management",
    periode: "Années (facultatif)", phPeriode: "ex. 2018 – 2023", futur: false,
  },
  {
    k: "carriere", titre: "Expérience",
    aide: "Postes, y compris à venir : un poste futur est publié automatiquement à sa date d'effet",
    libelle: "Poste", phLibelle: "ex. Attaché parlementaire",
    precision: "Missions ou employeur (facultatif)", phPrecision: "ex. Chargé des questions économiques et financières",
    periode: "Période (facultatif)", phPeriode: "ex. Depuis 2024", futur: true,
  },
  {
    k: "autre_activite", titre: "Autres activités", aide: "Associations, enseignement, publications…",
    libelle: "Activité", phLibelle: "ex. Enseignant vacataire à Sciences Po",
    precision: "Précision (facultatif)", phPrecision: "ex. Cours de finances publiques",
    periode: "Période (facultatif)", phPeriode: "ex. Depuis 2022", futur: false,
  },
  {
    k: "langues", titre: "Langues", aide: "Une entrée par langue",
    libelle: "Langue", phLibelle: "ex. Anglais",
    precision: "Niveau (facultatif)", phPrecision: "ex. Courant (C1)",
    periode: null, phPeriode: "", futur: false,
  },
] as const;

async function appel(url: string, init?: RequestInit) {
  const s = await sessionActuelle();
  const r = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${s?.access_token}`, "Content-Type": "application/json" },
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

function dateFr(iso: string) {
  try { return new Date(iso).toLocaleDateString("fr-FR"); } catch { return iso; }
}

export default function MaFiche() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState("");
  const [ouvertAjout, setOuvertAjout] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState<Champs>(VIDE);
  const [edition, setEdition] = useState<Champs & { id: string } | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  const rafraichir = useCallback(async () => {
    const { ok, data } = await appel("/api/ma-fiche");
    if (ok) setEtat(data);
  }, []);

  useEffect(() => { rafraichir(); }, [rafraichir]);

  const associe = etat?.association?.statut === "verifie";
  const collabId = etat?.association?.collab_id ?? null;
  const declarations = (etat?.declarations ?? []).filter((d) => !d.supprime_le);
  const deCat = (k: string) => declarations.filter((d) => d.categorie === k);
  const remplies = CATS.filter((c) => deCat(c.k).length > 0).length;
  const pct = Math.round((remplies / CATS.length) * 100);

  async function ajouter(categorie: string) {
    setErreur("");
    if (!collabId) return;
    const { ok, data } = await appel("/api/ma-fiche", {
      method: "POST",
      body: JSON.stringify({ collab_id: collabId, categorie, ...nouveau, libelle: nouveau.libelle.trim() }),
    });
    if (!ok) return setErreur(data.error ?? "erreur");
    setNouveau(VIDE); // le formulaire reste ouvert pour enchaîner les saisies
    rafraichir();
  }

  async function enregistrer() {
    if (!edition) return;
    setErreur("");
    const { ok, data } = await appel("/api/ma-fiche", {
      method: "PATCH",
      body: JSON.stringify({ id: edition.id, ...edition, libelle: edition.libelle.trim() }),
    });
    if (!ok) return setErreur(data.error ?? "erreur");
    setEdition(null);
    rafraichir();
  }

  async function supprimer(id: string) {
    await appel(`/api/ma-fiche?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (edition?.id === id) setEdition(null);
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

  const champsForm = (cat: (typeof CATS)[number], valeurs: Champs, set: (c: Champs) => void) => (
    <>
      <label>{cat.libelle}
        <input autoFocus value={valeurs.libelle} maxLength={120}
          onChange={(e) => set({ ...valeurs, libelle: e.target.value })} placeholder={cat.phLibelle} />
      </label>
      <label>{cat.precision}
        <input value={valeurs.precision_text} maxLength={240}
          onChange={(e) => set({ ...valeurs, precision_text: e.target.value })} placeholder={cat.phPrecision} />
      </label>
      {cat.periode && (
        <label>{cat.periode}
          <input value={valeurs.periode} maxLength={60}
            onChange={(e) => set({ ...valeurs, periode: e.target.value })} placeholder={cat.phPeriode} />
        </label>
      )}
      {cat.futur && (
        <label>À partir du (poste à venir, facultatif)
          <input type="date" value={valeurs.visible_a_partir_de}
            onChange={(e) => set({ ...valeurs, visible_a_partir_de: e.target.value })} />
        </label>
      )}
    </>
  );

  return (
    <>
      <h1>Ma fiche : profil CV</h1>
      <p className="lead">
        Chaque ajout est publié immédiatement sur votre fiche (rubrique visible par les comptes
        DataParl&apos;). L&apos;onglet « Parlement » (sources AN/Sénat) reste édité par DataParl&apos;.
      </p>

      <div className="macv-entete">
        <div className="macv-avancement">
          <div className="macv-barre"><span style={{ width: pct + "%" }}></span></div>
          <p className="meta" style={{ margin: "6px 0 0" }}>
            {remplies === 0
              ? "Renseignez au moins une rubrique pour activer votre profil CV."
              : `Profil complété à ${pct} % (${remplies} rubrique${remplies > 1 ? "s" : ""} sur ${CATS.length}).`}
          </p>
        </div>
        <a className="meta" href={`/collab/${encodeURIComponent(etat.association?.collab_slug ?? "")}`}>Voir ma fiche publique ↗</a>
      </div>

      {CATS.map((cat) => {
        const items = deCat(cat.k);
        const ajoutOuvert = ouvertAjout === cat.k;
        return (
          <section key={cat.k} className="macv-section">
            <div className="macv-section-titre">
              <h2>{cat.titre}</h2>
              {items.length > 0 && <span className="macv-compteur">{items.length}</span>}
              <span className="meta">{cat.aide}</span>
              {!ajoutOuvert && (
                <button className="secondaire" onClick={() => { setOuvertAjout(cat.k); setNouveau(VIDE); }}>+ Ajouter</button>
              )}
            </div>

            {items.length === 0 && !ajoutOuvert && (
              <p className="macv-vide">Aucune entrée. « + Ajouter » pour commencer.</p>
            )}

            {items.length > 0 && (
              <div className="macv-items">
                {items.map((d) => {
                  const futur = d.visible_a_partir_de && new Date(d.visible_a_partir_de).getTime() > Date.now();
                  if (edition?.id === d.id) {
                    return (
                      <form key={d.id} className="macv-form" onSubmit={(e) => { e.preventDefault(); enregistrer(); }}>
                        {champsForm(cat, edition, setEdition)}
                        <div className="actions">
                          <button type="submit">Enregistrer</button>{" "}
                          <button type="button" className="lien" onClick={() => setEdition(null)}>Annuler</button>
                        </div>
                      </form>
                    );
                  }
                  return (
                    <div key={d.id} className="macv-item">
                      <div className="macv-item-titre">
                        <strong>{d.libelle}</strong>
                        {d.periode && <span className="macv-chip">{d.periode}</span>}
                        {futur && <span className="macv-futur">Publié à partir du {dateFr(d.visible_a_partir_de as string)}</span>}
                      </div>
                      {d.precision_text && <p className="macv-aide" style={{ margin: "4px 0 0" }}>{d.precision_text}</p>}
                      <div className="macv-item-actions">
                        <button className="lien" onClick={() =>
                          setEdition({ id: d.id, libelle: d.libelle, precision_text: d.precision_text ?? "",
                            periode: d.periode ?? "", visible_a_partir_de: d.visible_a_partir_de ?? "" })
                        }>Modifier</button>
                        <button className="lien" onClick={() => supprimer(d.id)}>Supprimer</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {ajoutOuvert && (
              <form className="macv-form" onSubmit={(e) => { e.preventDefault(); ajouter(cat.k); }}>
                {champsForm(cat, nouveau, setNouveau)}
                <div className="actions">
                  <button type="submit" disabled={!nouveau.libelle.trim()}>Ajouter</button>{" "}
                  <button type="button" className="lien" onClick={() => setOuvertAjout(null)}>Fermer</button>
                </div>
              </form>
            )}
          </section>
        );
      })}

      {erreur && <p className="erreur">{erreur}</p>}

      <section className="zone-sensible">
        <h2>Zone sensible</h2>
        <p>
          <b>Supprimer tout mon profil CV déclaré</b> : la rubrique disparaît immédiatement de votre fiche.
          Le contenu est conservé dans nos sauvegardes internes et ne peut être restauré que sur votre demande.
          La partie « Parlement » (sources officielles) reste publiée conformément à nos règles.
        </p>
        {confirmation ? (
          <>
            <button className="danger" onClick={toutSupprimer}>Confirmer la suppression</button>{" "}
            <button className="lien" onClick={() => setConfirmation(false)}>Annuler</button>
          </>
        ) : (
          <button className="danger" onClick={() => setConfirmation(true)}>Tout supprimer</button>
        )}
      </section>
    </>
  );
}
