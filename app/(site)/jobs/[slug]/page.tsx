import type { Metadata } from "next";
import Link from "next/link";
import { offreVisible } from "@/lib/jobsFirestore";
import { SIGLE, idDepuisSlug, slugOffre, titreStandard, type Chambre } from "@/lib/jobs";
import { couleurChambre, NOM_CHAMBRE } from "@/lib/couleurs";
import { PastilleProvenance } from "../_components/ListeOffres";
import PhotoElu from "../_components/PhotoElu";

// Détail d'une offre, interface v3 : photo de l'élu, titre court, badges
// source/contrat/dates, zone d'action « Postuler », corps structuré en
// sections (Missions / Profil / Informations pratiques), liens de confiance.
// URL publique : https://jobs.dataparl.fr/<slug>

export const revalidate = 3600;
export const dynamic = "force-dynamic";

type Offre = {
  id: string;
  titre: string;
  description: string;
  chambre: string | null;
  departement: string | null;
  elu_prenom: string | null;
  elu_nom: string | null;
  groupe_politique: string | null;
  type_poste: string | null;
  localisation: string | null;
  parlementaire_slug: string | null;
  source_connector: string;
  source_url: string | null;
  publie_le: string | null;
  expire_le: string | null;
};

const dateFr = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

async function chargée(id: string): Promise<Offre | null> {
  return (await offreVisible(id)) as unknown as Offre | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  const o = id ? await chargée(id) : null;
  return o
    ? { title: titreStandard(o) + " | DataParl' Jobs", alternates: { canonical: "https://jobs.dataparl.fr/" + slugOffre(o) } }
    : { title: "Offre introuvable | DataParl' Jobs", robots: { index: false, follow: true } };
}

// Découpe de la description en sections titrées (« Vos missions : », etc.).
type Bloc = { titre: string; lignes: string[] };
const TITRES_SECTION = /^(Vos missions|Profil recherché|Lieu|Rémunération|Durée|Pour candidater|Process(?:us)? de recrutement|Informations pratiques)\s*:\s*$/i;

function decouper(desc: string): { chapeau: string[]; blocs: Bloc[] } {
  const chapeau: string[] = [];
  const blocs: Bloc[] = [];
  for (const ligne of desc.split(/\r?\n/)) {
    const m = ligne.trim().match(TITRES_SECTION);
    if (m) blocs.push({ titre: m[1], lignes: [] });
    else if (blocs.length) blocs[blocs.length - 1].lignes.push(ligne.trim());
    else if (ligne.trim()) chapeau.push(ligne.trim());
  }
  return { chapeau, blocs };
}

const LIBELLES: Record<string, string> = {
  "Vos missions": "Missions",
  "Processus de recrutement": "Process de recrutement",
  "Process de recrutement": "Process de recrutement",
};

// Rendu d'un bloc : puces si la section en contient, sinon paragraphe.
function Section({ bloc }: { bloc: Bloc }) {
  const puces = bloc.lignes.filter((l) => /^[-•*]/.test(l.trim())).map((l) => l.replace(/^\s*[-•*]\s*/, ""));
  const texte = bloc.lignes.filter((l) => l && !/^[-•*]/.test(l.trim())).join(" ");
  return (
    <section>
      <h2 style={{ fontSize: "1.05rem", margin: "0 0 8px" }}>{LIBELLES[bloc.titre] ?? bloc.titre}</h2>
      {puces.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1.2em", lineHeight: 1.7 }}>
          {puces.map((p, i) => (<li key={i} style={{ marginBottom: 4 }}>{p}</li>))}
        </ul>
      )}
      {texte && <p style={{ margin: 0, lineHeight: 1.7 }}>{texte}</p>}
    </section>
  );
}

export default async function OffrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  const o = id ? await chargée(id) : null;

  if (!o) {
    return (
      <>
        <h1>Offre introuvable</h1>
        <p style={{ marginTop: "24px" }}>
          Cette offre n&apos;existe pas, n&apos;est plus active ou a été retirée.{" "}
          <Link href="/jobs">Voir toutes les offres</Link>
        </p>
      </>
    );
  }

  const nomElu = [o.elu_prenom, o.elu_nom].filter(Boolean).join(" ");
  const email = o.description?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ?? null;
  const objet = encodeURIComponent("Candidature : " + o.titre);
  const { chapeau, blocs } = decouper(o.description ?? "");
  const candidater = blocs.find((b) => /^Pour candidater$/i.test(b.titre));
  const autres = blocs.filter((b) => b !== candidater);
  const parElu = o.source_connector === "proposition";

  return (
    <>
      <p className="meta" style={{ marginBottom: "14px" }}>
        <Link href="/jobs">← Toutes les offres</Link>
      </p>

      {/* En-tête : élu, titre court */}
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <PhotoElu chambre={o.chambre} slug={o.parlementaire_slug} prenom={o.elu_prenom} nom={o.elu_nom} />
        <div style={{ minWidth: 220, flex: 1 }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", marginBottom: ".35rem" }}>{o.titre}</h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: ".98rem" }}>
            Équipe de{" "}
            {o.parlementaire_slug ? (
              <a href={"https://www.dataparl.fr/parlementaires/" + o.parlementaire_slug}>{nomElu || "l'élu"}</a>
            ) : (
              nomElu || "l'élu"
            )}
            {o.groupe_politique ? ", " + o.groupe_politique : ""}
            {o.chambre ? ", " + (NOM_CHAMBRE[o.chambre] ?? o.chambre) : ""}
          </p>
        </div>
      </div>

      {/* Badges : source, chambre, contrat, dates */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "14px 0 0" }}>
        <PastilleProvenance connector={o.source_connector} avecLibelle />
        {o.chambre && (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", borderRadius: 999, padding: "4px 12px", fontSize: ".82rem", fontWeight: 600, background: "var(--bg)" }}
          >
            <i style={{ width: 8, height: 8, borderRadius: 999, background: couleurChambre(o.chambre), display: "inline-block" }} />
            {SIGLE[o.chambre as Chambre] ?? o.chambre}
          </span>
        )}
        {o.type_poste && (
          <span style={{ background: "var(--jaune)", color: "#071A41", borderRadius: 999, padding: "4px 12px", fontSize: ".82rem", fontWeight: 600 }}>
            {o.type_poste}
          </span>
        )}
        {(o.localisation || o.departement) && (
          <span style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 12px", fontSize: ".82rem" }}>
            {o.localisation ?? o.departement}
            {o.localisation && o.departement && o.localisation !== o.departement ? ", " + o.departement : ""}
          </span>
        )}
        <span style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 12px", fontSize: ".82rem" }}>
          {o.publie_le ? "Publiée le " + dateFr(o.publie_le) : "Publication en cours"}
          {o.expire_le ? ", candidatures jusqu'au " + dateFr(o.expire_le) : ""}
        </span>
      </div>
      <p className="meta" style={{ margin: "8px 0 0" }}>
        {parElu
          ? "Offre publiée directement par l'équipe de l'élu, depuis une adresse parlementaire vérifiée."
          : "Offre collectée automatiquement sur une source publique, puis relue avant publication."}
      </p>

      {/* Zone d'action : postuler */}
      <div
        style={{
          margin: "22px 0",
          background: "#EEF2FB",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "18px 22px",
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ minWidth: 220, flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 800, color: "var(--ink)" }}>Postuler</p>
          <p className="meta" style={{ margin: "4px 0 0" }}>
            {candidater
              ? candidater.lignes.filter(Boolean).join(" ")
              : email
                ? "CV et lettre de motivation à envoyer à " + email + "."
                : o.source_url
                  ? "Les consignes de candidature figurent dans l'annonce d'origine."
                  : "Les consignes de candidature figurent dans l'annonce ci-dessous."}
          </p>
        </div>
        {email ? (
          <a className="btn" style={{ marginTop: 0 }} href={"mailto:" + email + "?subject=" + objet}>
            Contacter l&apos;équipe
          </a>
        ) : o.source_url ? (
          <a className="btn" style={{ marginTop: 0 }} href={o.source_url} target="_blank" rel="noopener noreferrer">
            Voir l&apos;annonce d&apos;origine
          </a>
        ) : null}
      </div>

      {/* Corps : chapeau + sections structurées */}
      {o.description ? (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: "24px 26px",
            display: "grid",
            gap: 18,
          }}
        >
          {chapeau.length > 0 && <p style={{ margin: 0, lineHeight: 1.7 }}>{chapeau.join(" ")}</p>}
          {autres.length > 0 ? (
            autres.map((b) => <Section key={b.titre} bloc={b} />)
          ) : (
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>{o.description}</div>
          )}
        </div>
      ) : (
        <p className="meta">La description complète de cette offre est en cours d&apos;enrichissement.</p>
      )}

      {/* Pied de confiance */}
      <div style={{ marginTop: 26, display: "grid", gap: 8 }}>
        {o.parlementaire_slug && (
          <p style={{ margin: 0 }}>
            <a href={"https://www.dataparl.fr/parlementaires/" + o.parlementaire_slug}>
              Voir l&apos;équipe de {nomElu || "l'élu"} sur DataParl&apos; →
            </a>
          </p>
        )}
        {!parElu && o.source_url && (
          <p className="meta" style={{ margin: 0 }}>
            Offre collectée :{" "}
            <a href={o.source_url} target="_blank" rel="noopener noreferrer">annonce d&apos;origine</a>
          </p>
        )}
        <p className="meta" style={{ margin: 0 }}>
          Chaque offre est relue avant publication. Une anomalie ? Écrivez à{" "}
          <a href="mailto:bienvenue@dataparl.fr">bienvenue@dataparl.fr</a>.
        </p>
      </div>
    </>
  );
}
