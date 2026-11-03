"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { slugOffre } from "@/lib/jobs";
import { DATA_SUPABASE_KEY, DATA_SUPABASE_URL } from "@/lib/env";
import {
  CHAMBRE_NOM,
  EMAIL_RE,
  dateFr,
  decouper,
  enPuces,
  lieuNormalise,
  nomElu,
  remuneration,
  tempsTravail,
  typeContrat,
} from "@/lib/jobsTexte";
import { PastilleProvenance, type OffreListe } from "./communJobs";

// Modal d'offre : la carte de la liste ouvre le détail en overlay, à la
// Google Careers. La page /jobs/<slug> reste la version indexable et
// partageable : la modal propose son lien (bouton Partager) et un accès
// direct. L'adresse e-mail n'apparaît dans le DOM qu'après la vérification
// anti-robot du tiroir « Contacter l'équipe ».

export default function ModalOffre({ offre, onClose }: { offre: OffreListe; onClose: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [contact, setContact] = useState<"ferme" | "verif" | "revele">("ferme");
  const [copie, setCopie] = useState(false);
  const [partage, setPartage] = useState(false);

  // Fermeture par Échap + blocage du défilement de la page derrière.
  useEffect(() => {
    const clavier = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", clavier);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", clavier);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Photo officielle de l'élu (champ photo_url de la fiche DataParl').
  useEffect(() => {
    let vivant = true;
    const slug = offre.parlementaire_slug;
    if (!slug) return;
    fetch(
      DATA_SUPABASE_URL +
        "/rest/v1/parlementaires?select=photo_url&slug=eq." +
        encodeURIComponent(slug) +
        "&limit=1",
      { headers: { apikey: DATA_SUPABASE_KEY, Authorization: "Bearer " + DATA_SUPABASE_KEY } }
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { photo_url: string | null }[]) => {
        if (vivant) setPhoto(rows?.[0]?.photo_url ?? null);
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, [offre.parlementaire_slug]);

  const description = offre.description ?? "";
  const { chapeau, blocs } = decouper(description);
  const parTitre = (re: RegExp) => blocs.find((b) => re.test(b.titre));
  const missions = parTitre(/^Vos missions$/i);
  const profil = parTitre(/^Profil recherché$/i);
  const lieu = parTitre(/^Lieu$/i);
  const remun = parTitre(/^R[ée]mun[ée]ration$/i);
  const duree = parTitre(/^Dur[ée]e$/i);
  const candidater = parTitre(/^Pour candidater$/i);

  const contrat = typeContrat(offre);
  const travail = tempsTravail(description);
  const adresse = lieu ? lieuNormalise(lieu.lignes.filter(Boolean).join(" ")) : offre.localisation ?? offre.departement;
  const maps = adresse ? "https://maps.google.com/?q=" + encodeURIComponent(adresse) : null;
  const rem = remun ? remuneration(remun.lignes.filter(Boolean).join(" ")) : null;
  const email = description.match(EMAIL_RE)?.[0] ?? null;
  const objet = encodeURIComponent("Candidature : " + offre.titre);
  const lienPage = "/jobs/" + slugOffre(offre as Parameters<typeof slugOffre>[0]);
  const lienFiche = offre.parlementaire_slug
    ? "https://www.dataparl.fr/parlementaires/" + offre.parlementaire_slug
    : null;
  const elu = nomElu(offre);

  // Consignes de candidature : le texte de l'annonce sans l'adresse e-mail.
  const consignes = (candidater?.lignes.filter(Boolean).join(" ") ?? "")
    .replace(EMAIL_RE, "")
    .replace(/\s+à\s*[,;.]/g, ",")
    .replace(/\s*,\s*,/g, ",");
  const consignesPuces = consignes ? enPuces(consignes) : [];

  const partager = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + lienPage);
      setPartage(true);
      setTimeout(() => setPartage(false), 2500);
    } catch {
      setPartage(false);
    }
  };

  const copierEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  };

  const Puces = ({ items, couleur }: { items: string[]; couleur: string }) => (
    <ul className="puces-detail">
      {items.map((p, i) => (
        <li key={i}>
          <span style={{ background: couleur }} />
          {p}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="modal-fond" onClick={onClose} role="dialog" aria-modal="true" aria-label={offre.titre}>
      <style jsx>{`
        .modal-fond { position: fixed; inset: 0; z-index: 60; background: rgba(7,26,65,.55);
          backdrop-filter: blur(2px); overflow-y: auto; padding: 14px;
          display: flex; justify-content: center; }
        .modal-fond > div { max-width: 1020px; width: 100%; margin: auto; align-self: flex-start; }
        .modal-barre { position: sticky; top: 0; z-index: 2; display: flex; align-items: center;
          justify-content: space-between; background: var(--card); border: 1px solid var(--line);
          border-bottom: 0; border-radius: 18px 18px 0 0; padding: 12px 18px; }
        .modal-barre button, .modal-barre a { background: none; border: 0; cursor: pointer;
          font: inherit; font-size: .92rem; font-weight: 600; color: var(--muted); }
        .modal-barre button:hover, .modal-barre a:hover { color: var(--ink); }
        .modal-corps { background: var(--bg); border: 1px solid var(--line); border-top: 0;
          border-radius: 0 0 18px 18px; padding: 18px; display: grid; gap: 14px; }
        .carte-blanche { background: var(--card); border: 1px solid var(--line); border-radius: 16px;
          padding: 20px 22px; }
        .en-tete { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
        .en-tete img { width: 72px; height: 72px; border-radius: 16px; object-fit: cover;
          border: 3px solid var(--jaune); }
        .en-tete h1 { font-size: clamp(1.4rem, 3vw, 1.9rem); margin: 0 0 6px; }
        .en-tete .sous { margin: 0; font-size: .95rem; font-weight: 600; color: var(--ink);
          display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .en-tete .sous .sep { color: var(--line); }
        .en-tete .sous .chambre { background: var(--bg); border-radius: 8px; padding: 2px 8px;
          font-size: .8rem; font-weight: 700; }
        .rangee-badges { display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
          margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
        .badge-jobs { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: .78rem;
          font-weight: 600; border: 1px solid var(--line); color: var(--muted); background: var(--bg); }
        .badge-jobs.violet { background: color-mix(in srgb, var(--jaune) 40%, #fff);
          color: var(--ink); border-color: transparent; }
        .date-publication { margin-left: auto; color: var(--muted); font-size: .8rem; }
        .detail-colonnes { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 14px; align-items: start; }
        .detail-principal { display: grid; gap: 14px; min-width: 0; }
        .carte-blanche h2 { font-size: 1.15rem; margin: 0 0 10px; }
        .puces-detail { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
        .puces-detail li { display: flex; gap: 10px; align-items: flex-start; font-size: .93rem; line-height: 1.6; }
        .puces-detail li span { width: 8px; height: 8px; border-radius: 999px; flex: none; margin-top: 7px; }
        .ligne-condition { display: grid; grid-template-columns: 150px 1fr; gap: 10px; padding: 8px 0;
          border-bottom: 1px solid var(--line); font-size: .93rem; }
        .ligne-condition:last-child { border-bottom: 0; }
        .ligne-condition .libelle { color: var(--bleu); font-weight: 600; }
        .aside-postuler { position: sticky; top: 14px; display: grid; gap: 12px; }
        .aside-postuler .consignes { background: var(--bg); border: 1px solid var(--line);
          border-radius: 12px; padding: 12px 14px; font-size: .85rem; }
        .tiroir { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
        .tiroir p.titre { margin: 0 0 8px; font-weight: 700; font-size: .9rem; }
        .adresse-revelee { font-weight: 700; font-size: .92rem; background: var(--bg); border-radius: 10px;
          padding: 8px 10px; text-align: center; user-select: all; margin: 0 0 8px; }
        .pied-confiance { border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px;
          font-size: .8rem; color: var(--muted); }
        .btn-plein { width: 100%; text-align: center; box-sizing: border-box; }
        @media (max-width: 860px) {
          .detail-colonnes { grid-template-columns: 1fr; }
          .aside-postuler { position: static; order: -1; }
          .ligne-condition { grid-template-columns: 1fr; gap: 2px; }
        }
      `}</style>

      <div onClick={(e) => e.stopPropagation()}>
        <div className="modal-barre">
          <button type="button" onClick={onClose}>← Toutes les offres</button>
          <div style={{ display: "flex", gap: 14 }}>
            <button type="button" onClick={partager} title="Copier le lien de l'offre">
              {partage ? "Lien copié ✓" : "Partager"}
            </button>
            <Link href={lienPage} onClick={onClose}>Ouvrir la page</Link>
            <button type="button" onClick={onClose} aria-label="Fermer" title="Fermer">✕</button>
          </div>
        </div>

        <div className="modal-corps">
          {/* En-tête : photo, titre, élu, badges */}
          <div className="carte-blanche en-tete">
            {photo && <img src={photo} alt={elu || "Élu"} />}
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1>{offre.titre}</h1>
              <p className="sous">
                <span>{elu || "Équipe parlementaire"}</span>
                {offre.groupe_politique && (<><span className="sep">•</span><span style={{ color: "var(--muted)" }}>{offre.groupe_politique}</span></>)}
                {offre.chambre && (<><span className="sep">•</span><span className="chambre">{CHAMBRE_NOM[offre.chambre] ?? offre.chambre}</span></>)}
              </p>
              <div className="rangee-badges">
                <PastilleProvenance connector={offre.source_connector} avecLibelle />
                <span className="badge-jobs violet">{contrat}</span>
                {travail && <span className="badge-jobs">{travail}</span>}
                <span className="date-publication">
                  {offre.publie_le ? "Publiée le " + dateFr(offre.publie_le) : "Publication en cours"}
                </span>
              </div>
            </div>
          </div>

          <div className="detail-colonnes">
            <div className="detail-principal">
              {chapeau.length > 0 && (
                <div className="carte-blanche">
                  <h2>À propos du poste</h2>
                  <p style={{ margin: 0, lineHeight: 1.7, fontSize: ".95rem" }}>{chapeau.join(" ")}</p>
                </div>
              )}

              {missions && missions.lignes.filter(Boolean).length > 0 && (
                <div className="carte-blanche">
                  <h2>Missions</h2>
                  <Puces
                    items={missions.lignes.map((l) => l.replace(/^\s*[-•*]\s*/, "")).filter(Boolean)}
                    couleur="#4E2E53"
                  />
                </div>
              )}

              {profil && profil.lignes.filter(Boolean).length > 0 && (
                <div className="carte-blanche">
                  <h2>Profil recherché</h2>
                  <Puces
                    items={enPuces(profil.lignes.map((l) => l.replace(/^\s*[-•*]\s*/, "")).filter(Boolean).join(" "))}
                    couleur="#6C84B0"
                  />
                </div>
              )}

              <div className="carte-blanche">
                <h2>Conditions</h2>
                <div>
                  <div className="ligne-condition"><span className="libelle">Type de contrat</span><span>{contrat}</span></div>
                  <div className="ligne-condition"><span className="libelle">Temps de travail</span><span>{travail ?? "Non précisé"}</span></div>
                  {duree && duree.lignes.filter(Boolean).length > 0 && (
                    <div className="ligne-condition"><span className="libelle">Durée</span><span>{duree.lignes.filter(Boolean).join(" ")}</span></div>
                  )}
                  {adresse && (
                    <div className="ligne-condition">
                      <span className="libelle">Lieu</span>
                      <span>
                        {adresse}
                        {maps && (
                          <>
                            {" "}
                            <a href={maps} target="_blank" rel="noopener noreferrer">Voir sur Google Maps</a>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                  {rem && (
                    <div className="ligne-condition">
                      <span className="libelle">Rémunération</span>
                      <span>{rem.type}{rem.montant ? " : " + rem.montant : ""}</span>
                    </div>
                  )}
                  {rem && rem.avantages.length > 0 && (
                    <div className="ligne-condition"><span className="libelle">Avantages</span><span>{rem.avantages.join(", ")}</span></div>
                  )}
                  {offre.expire_le && (
                    <div className="ligne-condition"><span className="libelle">Date limite</span><span>{dateFr(offre.expire_le)}</span></div>
                  )}
                </div>
              </div>

              <div className="carte-blanche">
                <h2>L&apos;équipe</h2>
                <p style={{ margin: 0, lineHeight: 1.7, fontSize: ".95rem" }}>
                  Équipe de {elu || "l'élu"}
                  {offre.groupe_politique ? " (" + offre.groupe_politique + ")" : ""}
                  {offre.chambre ? ", " + (CHAMBRE_NOM[offre.chambre] ?? offre.chambre) : ""}.
                </p>
                {lienFiche && (
                  <p style={{ margin: "8px 0 0", fontSize: ".92rem" }}>
                    <a href={lienFiche} target="_blank" rel="noopener noreferrer">
                      Voir la fiche de l&apos;élu sur DataParl&apos; →
                    </a>
                  </p>
                )}
              </div>

              <div className="pied-confiance">
                <p style={{ margin: "0 0 4px" }}>
                  {offre.source_connector === "proposition"
                    ? "Offre publiée directement par l'équipe de l'élu, depuis une adresse parlementaire vérifiée."
                    : "Offre collectée automatiquement sur les sources officielles et relue avant publication."}
                </p>
                <p style={{ margin: 0 }}>
                  Une anomalie ? Écrivez à <a href="mailto:bienvenue@dataparl.fr">bienvenue@dataparl.fr</a>.
                </p>
              </div>
            </div>

            {/* Panneau Postuler : e-mail protégé contre le spam */}
            <aside className="aside-postuler" aria-label="Postuler">
              <div className="carte-blanche" style={{ boxShadow: "0 4px 16px rgba(7,26,65,.08)" }}>
                <h2 style={{ fontSize: "1.1rem" }}>Postuler à cette offre</h2>
                <p className="meta" style={{ margin: "0 0 10px", fontSize: ".85rem" }}>
                  Transmettez votre candidature à l&apos;équipe parlementaire.
                </p>

                {consignesPuces.length > 0 && (
                  <div className="consignes">
                    <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--ink)" }}>Consignes de l&apos;équipe</p>
                    <Puces items={consignesPuces} couleur="#4E2E53" />
                  </div>
                )}

                {contact === "ferme" && email && (
                  <button type="button" className="btn btn-plein" onClick={() => setContact("verif")}>
                    Contacter l&apos;équipe
                  </button>
                )}

                {contact === "verif" && (
                  <div className="tiroir">
                    <p className="titre">Vérification anti-spam</p>
                    <p className="meta" style={{ margin: "0 0 8px", fontSize: ".8rem" }}>
                      L&apos;adresse e-mail est protégée contre les robots. Confirmez que vous êtes un candidat.
                    </p>
                    <button type="button" className="btn btn-plein" onClick={() => setContact("revele")}>
                      Je ne suis pas un robot
                    </button>
                  </div>
                )}

                {contact === "revele" && email && (
                  <div className="tiroir">
                    <p className="titre">Adresse de candidature</p>
                    <p className="adresse-revelee">{email}</p>
                    <div style={{ display: "grid", gap: 8 }}>
                      <a className="btn btn-plein" href={"mailto:" + email + "?subject=" + objet}>
                        Envoyer ma candidature
                      </a>
                      <button type="button" className="btn secondaire btn-plein" onClick={copierEmail}>
                        {copie ? "Adresse copiée ✓" : "Copier l'adresse e-mail"}
                      </button>
                    </div>
                  </div>
                )}

                <p className="meta" style={{ margin: "8px 0 0", fontSize: ".76rem", textAlign: "center" }}>
                  🔒 E-mail protégé contre le spam
                </p>
              </div>

              <p style={{ margin: 0, fontSize: ".85rem", textAlign: "center" }}>
                <Link href={lienPage} onClick={onClose}>Ouvrir la page complète →</Link>
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
