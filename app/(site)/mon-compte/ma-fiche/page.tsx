"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import styles from "./maFiche.module.css";

// Ma fiche : éditeur du profil CV déclaratif, section par section (façon
// LinkedIn) : ajout et édition en place, champs adaptés à chaque rubrique,
// publication immédiate (éléments futurs publiés automatiquement à leur
// date d'effet). Import d'un CV PDF : l'IA de DataParl' Chat propose des
// entrées, rien n'est publié sans validation. Photo de profil : upload
// libre, suppression immédiate. « Tout supprimer » retire la rubrique du
// site immédiatement ; le contenu est conservé en sauvegarde interne,
// restaurable sur demande.

type Declaration = {
  id: string; collab_id: string; categorie: string; libelle: string;
  precision_text: string | null; periode: string | null; visible_a_partir_de: string | null;
  supprime_le?: string | null;
};
type Etat = {
  association: { statut: string; collab_slug: string; collab_id: string; gel_jusqu_a: string | null } | null;
  declarations: Declaration[];
  photo_url?: string | null;
};
type Champs = { libelle: string; precision_text: string; periode: string; visible_a_partir_de: string };
type Proposition = { libelle: string; precision_text: string | null; periode: string | null; visible_a_partir_de?: string | null };
type Propositions = { formation: Proposition[]; carriere: Proposition[]; autre_activite: Proposition[]; langues: Proposition[] };

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

// Champs communs (ajout manuel, édition, proposition issue du CV) : la
// date d'effet n'apparaît que pour les postes à venir.
function champsForm<T extends Champs>(
  cat: (typeof CATS)[number], valeurs: T, set: (c: T) => void,
) {
  return (
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
}

export default function MaFiche() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState("");
  const [ouvertAjout, setOuvertAjout] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState<Champs>(VIDE);
  const [edition, setEdition] = useState<Champs & { id: string } | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [propositions, setPropositions] = useState<Propositions | null>(null);
  const cvInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const rafraichir = useCallback(async () => {
    const { ok, data } = await appel("/api/ma-fiche");
    if (ok) {
      setEtat(data);
      setPhotoUrl(data.photo_url ?? null);
    }
  }, []);

  useEffect(() => { rafraichir(); }, [rafraichir]);

  const associe = etat?.association?.statut === "verifie";
  const collabId = etat?.association?.collab_id ?? null;
  const declarations = (etat?.declarations ?? []).filter((d) => !d.supprime_le);
  const deCat = (k: string) => declarations.filter((d) => d.categorie === k);
  const remplies = CATS.filter((c) => deCat(c.k).length > 0).length;
  const pct = Math.round((remplies / CATS.length) * 100);

  async function ajouter(categorie: string, valeurs: Champs) {
    if (!collabId) return false;
    const { ok, data } = await appel("/api/ma-fiche", {
      method: "POST",
      body: JSON.stringify({
        collab_id: collabId, categorie,
        libelle: valeurs.libelle.trim(), precision_text: valeurs.precision_text,
        periode: valeurs.periode, visible_a_partir_de: valeurs.visible_a_partir_de,
      }),
    });
    if (!ok) { setErreur(data.error ?? "erreur"); return false; }
    setErreur("");
    return true;
  }

  async function ajouterManuel(categorie: string) {
    setErreur("");
    if (await ajouter(categorie, nouveau)) setNouveau(VIDE); // le formulaire reste ouvert pour enchaîner
    rafraichir();
  }

  async function enregistrer() {
    if (!edition) return;
    setErreur("");
    const { ok, data } = await appel("/api/ma-fiche", {
      method: "PATCH",
      body: JSON.stringify({ ...edition, libelle: edition.libelle.trim() }),
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

  // Import du CV : lecture locale en base64, envoi au serveur qui interroge
  // l'IA de DataParl' Chat ; les propositions reviennent pour validation.
  async function importerCv(fichier: File) {
    if (fichier.type !== "application/pdf") return setErreur("Seul un PDF peut être importé.");
    const pdf = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result ?? "").split(",")[1] ?? "");
      r.onerror = rej;
      r.readAsDataURL(fichier);
    }).catch(() => "");
    if (!pdf) return setErreur("Lecture du fichier impossible.");
    setImportBusy(true);
    setErreur("");
    const { ok, data } = await appel("/api/ma-fiche/import", {
      method: "POST",
      body: JSON.stringify({ pdf }),
    });
    setImportBusy(false);
    if (!ok || !data.propositions) {
      return setErreur(
        data.error === "cv_illisible" ? "CV illisible : essayez un PDF en texte plutôt qu'un scan."
          : data.error === "pdf invalide ou trop volumineux (5 Mo max)" ? data.error
          : "Import impossible pour le moment. Réessayez dans un instant.",
      );
    }
    const p = data.propositions;
    setPropositions({
      formation: p.formation ?? [], carriere: p.carriere ?? [],
      autre_activite: p.autre_activite ?? [], langues: p.langues ?? [],
    });
  }

  // Validation d'une proposition : ajout comme une saisie manuelle, puis
  // retrait de la liste (les autres restent à valider).
  async function validerProposition(k: keyof Propositions, i: number) {
    if (!propositions || !collabId) return;
    const p = propositions[k][i];
    if (!await ajouter(k, {
      libelle: p.libelle ?? "", precision_text: p.precision_text ?? "",
      periode: p.periode ?? "", visible_a_partir_de: p.visible_a_partir_de ?? "",
    })) return;
    setPropositions({ ...propositions, [k]: propositions[k].filter((_, j) => j !== i) });
    rafraichir();
  }

  async function validerToutes(k: keyof Propositions) {
    if (!propositions) return;
    for (const p of [...propositions[k]]) {
      if (!await ajouter(k, {
        libelle: p.libelle ?? "", precision_text: p.precision_text ?? "",
        periode: p.periode ?? "", visible_a_partir_de: p.visible_a_partir_de ?? "",
      })) break;
    }
    setPropositions({ ...propositions, [k]: [] });
    rafraichir();
  }

  // Photo de profil : upload direct (FormData), aperçu immédiat.
  async function envoyerPhoto(fichier: File) {
    if (fichier.size > 2 * 1024 * 1024) return setErreur("Photo trop lourde (2 Mo max).");
    setPhotoBusy(true);
    setErreur("");
    const s = await sessionActuelle();
    const fd = new FormData();
    fd.append("photo", fichier);
    const r = await fetch("/api/ma-fiche/photo", {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token}` },
      body: fd,
    });
    const d = await r.json().catch(() => ({}));
    setPhotoBusy(false);
    if (r.ok) setPhotoUrl(d.photo_url ?? null);
    else setErreur(d.error ?? "Photo refusée.");
  }

  async function retirerPhoto() {
    setPhotoBusy(true);
    await appel("/api/ma-fiche/photo", { method: "DELETE" });
    setPhotoBusy(false);
    setPhotoUrl(null);
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

  const restePropositions = propositions
    ? CATS.reduce((n, c) => n + (propositions[c.k as keyof Propositions]?.length ?? 0), 0)
    : 0;

  return (
    <>
      <h1>Ma fiche : profil CV</h1>
      <p className="lead">
        Chaque ajout validé est publié immédiatement sur votre fiche (rubrique visible par les comptes
        DataParl&apos;). L&apos;onglet « Parlement » (sources AN/Sénat) reste édité par DataParl&apos;.
      </p>

      <div className={styles.entete}>
        <div className={styles.enteteGauche}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.avatar} src={photoUrl} alt="Votre photo de profil" />
          ) : (
            <div className={styles.avatarVide} aria-hidden>👤</div>
          )}
          <div className={styles.photoActions}>
            <button onClick={() => photoInput.current?.click()} disabled={photoBusy}>
              {photoUrl ? "Changer la photo" : "Ajouter une photo"}
            </button>
            {photoUrl && (
              <button className="lien" onClick={retirerPhoto} disabled={photoBusy}>Retirer la photo</button>
            )}
            <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) envoyerPhoto(f); }} />
            <span className="meta" style={{ fontSize: ".78rem" }}>JPEG, PNG ou WebP · 2 Mo max · visible sur votre fiche</span>
          </div>
        </div>
        <div className={styles.avancement}>
          <div className={styles.barre}><span style={{ width: pct + "%" }}></span></div>
          <p className="meta" style={{ margin: "6px 0 0" }}>
            {remplies === 0
              ? "Renseignez au moins une rubrique pour activer votre profil CV."
              : `Profil complété à ${pct} % (${remplies} rubrique${remplies > 1 ? "s" : ""} sur ${CATS.length}).`}
          </p>
        </div>
        <a className="meta" href={`/collab/${encodeURIComponent(etat.association?.collab_slug ?? "")}`}>Voir ma fiche publique ↗</a>
      </div>

      <div className={styles.importZone}>
        <button onClick={() => cvInput.current?.click()} disabled={importBusy}>
          {importBusy ? "Lecture de votre CV…" : "Importer mon CV (PDF)"}
        </button>
        <span className={styles.importNote}>
          L&apos;IA de DataParl&apos; lit le CV et propose des entrées : vous validez ce que vous voulez publier. Le fichier n&apos;est pas conservé.
        </span>
        <input ref={cvInput} type="file" accept="application/pdf" hidden
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importerCv(f); }} />
      </div>

      {propositions && restePropositions > 0 && (
        <section className={styles.propositions}>
          <h2>Propositions issues de votre CV</h2>
          <p className="meta">
            Rien n&apos;est publié sans votre validation : vérifiez chaque entrée, corrigez si besoin, puis ajoutez-la.
          </p>
          {CATS.map((cat) => {
            const props = propositions[cat.k as keyof Propositions] ?? [];
            if (!props.length) return null;
            return (
              <div key={cat.k} style={{ marginTop: 14 }}>
                <div className={styles.sectionTitre}>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>{cat.titre}</h3>
                  <button onClick={() => validerToutes(cat.k as keyof Propositions)}>Tout ajouter</button>
                </div>
                {props.map((p, i) => (
                  <form key={i} className={styles.form} onSubmit={(e) => { e.preventDefault(); validerProposition(cat.k as keyof Propositions, i); }}>
                    {champsForm(cat, {
                      libelle: p.libelle ?? "", precision_text: p.precision_text ?? "",
                      periode: p.periode ?? "", visible_a_partir_de: p.visible_a_partir_de ?? "",
                    }, (c) => {
                      const maj = [...props];
                      maj[i] = { libelle: c.libelle, precision_text: c.precision_text, periode: c.periode, visible_a_partir_de: c.visible_a_partir_de };
                      setPropositions({ ...propositions, [cat.k]: maj });
                    })}
                    <div className={styles.actions}>
                      <button type="submit" disabled={!(p.libelle ?? "").trim()}>Ajouter</button>{" "}
                      <button type="button" className={styles.lien} onClick={() => setPropositions({ ...propositions, [cat.k]: props.filter((_, j) => j !== i) })}>Ignorer</button>
                    </div>
                  </form>
                ))}
              </div>
            );
          })}
          <div className={styles.actions}>
            <button className={styles.lien} onClick={() => setPropositions(null)}>Ignorer toutes les propositions</button>
          </div>
        </section>
      )}

      {CATS.map((cat) => {
        const items = deCat(cat.k);
        const ajoutOuvert = ouvertAjout === cat.k;
        return (
          <section key={cat.k} className={styles.section}>
            <div className={styles.sectionTitre}>
              <h2>{cat.titre}</h2>
              {items.length > 0 && <span className={styles.compteur}>{items.length}</span>}
              <span className={styles.aide}>{cat.aide}</span>
              {!ajoutOuvert && (
                <button className={styles.ajoutBouton} onClick={() => { setOuvertAjout(cat.k); setNouveau(VIDE); }}>+ Ajouter</button>
              )}
            </div>

            {items.length === 0 && !ajoutOuvert && (
              <p className={styles.vide}>Aucune entrée. « + Ajouter » pour commencer.</p>
            )}

            {items.length > 0 && (
              <div className={styles.items}>
                {items.map((d) => {
                  const futur = d.visible_a_partir_de && new Date(d.visible_a_partir_de).getTime() > Date.now();
                  if (edition?.id === d.id) {
                    return (
                      <form key={d.id} className={styles.form} onSubmit={(e) => { e.preventDefault(); enregistrer(); }}>
                        {champsForm(cat, edition, setEdition)}
                        <div className={styles.actions}>
                          <button type="submit">Enregistrer</button>{" "}
                          <button type="button" className={styles.lien} onClick={() => setEdition(null)}>Annuler</button>
                        </div>
                      </form>
                    );
                  }
                  return (
                    <div key={d.id} className={styles.item}>
                      <div className={styles.itemTitre}>
                        <strong>{d.libelle}</strong>
                        {d.periode && <span className={styles.chip}>{d.periode}</span>}
                        {futur && <span className={styles.futur}>Publié à partir du {dateFr(d.visible_a_partir_de as string)}</span>}
                      </div>
                      {d.precision_text && <p className="meta" style={{ margin: "4px 0 0" }}>{d.precision_text}</p>}
                      <div className={styles.itemActions}>
                        <button onClick={() =>
                          setEdition({ id: d.id, libelle: d.libelle, precision_text: d.precision_text ?? "",
                            periode: d.periode ?? "", visible_a_partir_de: d.visible_a_partir_de ?? "" })
                        }>Modifier</button>
                        <button onClick={() => supprimer(d.id)}>Supprimer</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {ajoutOuvert && (
              <form className={styles.form} onSubmit={(e) => { e.preventDefault(); ajouterManuel(cat.k); }}>
                {champsForm(cat, nouveau, setNouveau)}
                <div className={styles.actions}>
                  <button type="submit" disabled={!nouveau.libelle.trim()}>Ajouter</button>{" "}
                  <button type="button" className={styles.lien} onClick={() => setOuvertAjout(null)}>Fermer</button>
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
