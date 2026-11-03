import type { Metadata } from "next";
import Link from "next/link";
import { offreVisible } from "@/lib/jobsFirestore";
import { idDepuisSlug, slugOffre, titreStandard } from "@/lib/jobs";
import { DATA_SUPABASE_KEY, DATA_SUPABASE_URL } from "@/lib/env";
import { PastilleProvenance } from "../_components/ListeOffres";
import PhotoElu from "../_components/PhotoElu";

// Détail d'une offre, structure normalisée : le candidat comprend en 5
// secondes le poste, l'équipe, le lieu et la façon de postuler.
// 1. En-tête (titre court, élu, photo) 2. Badges propres 3. Bloc Postuler
// 4. Intro 5. Missions 6. Profil 7. Conditions 8. L'équipe 9. Pied.
// L'adresse e-mail n'est jamais affichée en clair : uniquement le bouton
// « Contacter l'équipe ». Le lien vers l'annonce d'origine n'est pas affiché.

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

const CHAMBRE_NOM: Record<string, string> = {
  an: "Assemblée nationale",
  senat: "Sénat",
  pe: "Parlement européen",
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const dateFr = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

async function chargée(id: string): Promise<Offre | null> {
  return (await offreVisible(id)) as unknown as Offre | null;
}

// Photo officielle de l'élu : champ photo_url de la fiche DataParl'
// (base parlementaires : photos AN et Sénat), en cache 24 h.
async function photoParlementaire(slug: string | null): Promise<string | null> {
  if (!slug) return null;
  try {
    const url = DATA_SUPABASE_URL + "/rest/v1/parlementaires?select=photo_url&slug=eq." + encodeURIComponent(slug) + "&limit=1";
    const r = await fetch(url, {
      headers: { apikey: DATA_SUPABASE_KEY, Authorization: "Bearer " + DATA_SUPABASE_KEY },
      next: { revalidate: 86400 },
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as { photo_url: string | null }[];
    return rows?.[0]?.photo_url ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  const o = id ? await chargée(id) : null;
  return o
    ? { title: titreStandard(o) + " | DataParl' Jobs", alternates: { canonical: "https://jobs.dataparl.fr/" + slugOffre(o) } }
    : { title: "Offre introuvable | DataParl' Jobs", robots: { index: false, follow: true } };
}

// ── Découpage de la description ─────────────────────────────────────────────

type Bloc = { titre: string; lignes: string[] };
const TITRES_SECTION =
  /^(Vos missions|Profil recherché|Lieu|Rémunération|Durée|Pour candidater|Process(?:us)? de recrutement|Informations pratiques)\s*:\s*(.*)$/i;
const MARQUEURS_INLINE =
  /\s+(?=(?:Vos missions|Profil recherché|Lieu|Rémunération|Durée|Pour candidater|Process(?:us)? de recrutement|Informations pratiques)\s*:)/gi;

function decouper(desc: string): { chapeau: string[]; blocs: Bloc[] } {
  const chapeau: string[] = [];
  const blocs: Bloc[] = [];
  for (const ligne of desc.replace(MARQUEURS_INLINE, "\n").split(/\r?\n/)) {
    const m = ligne.trim().match(TITRES_SECTION);
    if (m) blocs.push({ titre: m[1], lignes: m[2] ? [m[2].trim()] : [] });
    else if (blocs.length) blocs[blocs.length - 1].lignes.push(ligne.trim());
    else if (ligne.trim()) chapeau.push(ligne.trim());
  }
  return { chapeau, blocs };
}

const enPuces = (texte: string) =>
  texte
    .replace(/\s+/g, " ")
    .split(/(?<=[.);])\s+/)
    .map((s) => s.replace(/^[,;\s]+|[,;\s]+$/g, "").trim())
    .filter(Boolean);

// ── Normalisation des conditions ────────────────────────────────────────────

const CONTRATS = ["Stage", "CDD", "CDI", "Alternance"];
function typeContrat(o: Offre): string {
  const src = ((o.type_poste ?? "") + " " + o.description).toLowerCase();
  for (const c of CONTRATS) if (src.includes(c.toLowerCase())) return c;
  return "Autre";
}

function tempsTravail(desc: string): string | null {
  if (/temps\s+plein/i.test(desc)) return "Temps plein";
  if (/temps\s+partiel/i.test(desc)) return "Temps partiel";
  return null;
}

// Adresses institutionnelles normalisées.
const ADRESSES: [RegExp, string][] = [
  [/vaugirard/i, "15 rue de Vaugirard, 75006 Paris"],
  [/rue de l'universit[ée]|palais[- ]bourbon|assembl[ée]e nationale/i, "126 rue de l'Université, 75007 Paris"],
];
function lieuNormalise(texte: string): string {
  const propre = texte.replace(/\s+/g, " ").replace(/^bureau\s+/i, "").replace(/[.,;\s]+$/, "").trim();
  for (const [motif, adresse] of ADRESSES) if (motif.test(propre)) return adresse;
  return propre;
}

function remuneration(texte: string): { type: string; montant: string | null; avantages: string[] } {
  const t = texte.replace(/\s+/g, " ").trim();
  const type = /gratification/i.test(t) ? "Gratification" : /salaire/i.test(t) ? "Salaire" : "Non précisé";
  const m = t.match(/(\d[\d\s]*(?:[.,]\d+)?)\s*(?:euros?|€)\s*(nets?|bruts?)?/i);
  const periode = /par\s+an|annuel/i.test(t) ? " / an" : " / mois";
  const montant = m
    ? m[1].replace(/[\s\u00a0]/g, " ").trim() + " €" + (m[2] ? " " + m[2].toLowerCase() : "") + periode
    : null;
  const avantages = t
    .split(/,\s*plus\b|\.\s*plus\b|,\s*avec\b|,\s*ainsi que\b/i)
    .slice(1)
    .map((a) => a.replace(/[\s.,;]+$/, "").trim())
    .filter(Boolean);
  return { type, montant, avantages };
}

// ── Petits composants de rendu ──────────────────────────────────────────────

function Liste({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: "1.2em", lineHeight: 1.7 }}>
      {items.map((p, i) => (
        <li key={i} style={{ marginBottom: 4 }}>{p}</li>
      ))}
    </ul>
  );
}

function TitreSection({ children }: { children: string }) {
  return <h2 style={{ fontSize: "1.05rem", margin: "0 0 10px" }}>{children}</h2>;
}

function LigneCondition({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
      <span className="meta" style={{ padding: 0 }}>{libelle}</span>
      <span>{children}</span>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

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
  const parElu = o.source_connector === "proposition";
  const { chapeau, blocs } = decouper(o.description ?? "");
  const parTitre = (re: RegExp) => blocs.find((b) => re.test(b.titre));
  const missions = parTitre(/^Vos missions$/i);
  const profil = parTitre(/^Profil recherché$/i);
  const lieu = parTitre(/^Lieu$/i);
  const remun = parTitre(/^R[ée]mun[ée]ration$/i);
  const duree = parTitre(/^Dur[ée]e$/i);
  const candidater = parTitre(/^Pour candidater$/i);

  const contrat = typeContrat(o);
  const travail = tempsTravail(o.description ?? "");
  const debut = /d[èe]s que possible|d[èe]s maintenant/i.test(o.description ?? "") ? "Dès que possible" : null;
  const adresse = lieu ? lieuNormalise(lieu.lignes.filter(Boolean).join(" ")) : o.localisation ?? o.departement;
  const maps = adresse ? "https://maps.google.com/?q=" + encodeURIComponent(adresse) : null;
  const rem = remun ? remuneration(remun.lignes.filter(Boolean).join(" ")) : null;
  const photo = await photoParlementaire(o.parlementaire_slug);
  const email = o.description?.match(EMAIL_RE)?.[0] ?? null;
  const objet = encodeURIComponent("Candidature : " + o.titre);
  const lienFiche = o.parlementaire_slug ? "https://www.dataparl.fr/parlementaires/" + o.parlementaire_slug : null;

  // Consignes de candidature : le texte de l'annonce sans l'adresse e-mail.
  const consignes = (candidater?.lignes.filter(Boolean).join(" ") ?? "")
    .replace(EMAIL_RE, "")
    .replace(/\s+à\s*[,;.]/g, ",")
    .replace(/\s*,\s*,/g, ",");
  const consignesPuces = consignes ? enPuces(consignes) : [];

  return (
    <>
      <p className="meta" style={{ marginBottom: "14px" }}>
        <Link href="/jobs">← Toutes les offres</Link>
      </p>

      {/* 1. En-tête : titre court, élu, photo */}
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <PhotoElu src={photo} prenom={o.elu_prenom} nom={o.elu_nom} />
        <div style={{ minWidth: 220, flex: 1 }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", marginBottom: ".35rem" }}>{o.titre}</h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: ".98rem" }}>
            {nomElu || "Équipe parlementaire"}
            {o.groupe_politique ? ", " + o.groupe_politique : ""}
            {o.chambre ? ", " + (CHAMBRE_NOM[o.chambre] ?? o.chambre) : ""}
          </p>
        </div>
      </div>

      {/* 2. Badges : source, type de contrat, temps de travail, date */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "16px 0 0" }}>
        <PastilleProvenance connector={o.source_connector} avecLibelle />
        <span style={{ background: "var(--jaune)", color: "var(--ink)", borderRadius: 999, padding: "4px 12px", fontSize: ".82rem", fontWeight: 600 }}>
          {contrat}
        </span>
        {travail && (
          <span style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 12px", fontSize: ".82rem" }}>
            {travail}
          </span>
        )}
        <span style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 12px", fontSize: ".82rem" }}>
          {o.publie_le ? "Publiée le " + dateFr(o.publie_le) : "Publication en cours"}
        </span>
      </div>

      {/* 3. Bloc Postuler : action principale, e-mail jamais affiché */}
      <div
        style={{
          margin: "22px 0",
          background: "var(--bg)",
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
          <p className="meta" style={{ margin: "4px 0 0" }}>Envoyez votre CV et lettre de motivation.</p>
          {consignesPuces.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p className="meta" style={{ margin: "0 0 2px", fontWeight: 700 }}>Consignes de candidature</p>
              <Liste items={consignesPuces} />
            </div>
          )}
        </div>
        {email ? (
          <a className="btn" style={{ marginTop: 0 }} href={"mailto:" + email + "?subject=" + objet}>
            Contacter l&apos;équipe
          </a>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 24 }}>
        {/* 4. À propos du poste : intro courte */}
        {chapeau.length > 0 && (
          <section>
            <TitreSection>À propos du poste</TitreSection>
            <p style={{ margin: 0, lineHeight: 1.7 }}>{chapeau.join(" ")}</p>
          </section>
        )}

        {/* 5. Missions */}
        {missions && missions.lignes.filter(Boolean).length > 0 && (
          <section>
            <TitreSection>Missions</TitreSection>
            <Liste items={missions.lignes.map((l) => l.replace(/^\s*[-•*]\s*/, "")).filter(Boolean)} />
          </section>
        )}

        {/* 6. Profil recherché : toujours en puces */}
        {profil && profil.lignes.filter(Boolean).length > 0 && (
          <section>
            <TitreSection>Profil recherché</TitreSection>
            <Liste items={enPuces(profil.lignes.map((l) => l.replace(/^\s*[-•*]\s*/, "")).filter(Boolean).join(" "))} />
          </section>
        )}

        {/* 7. Conditions */}
        <section>
          <TitreSection>Conditions</TitreSection>
          <div style={{ borderBottom: "none" }}>
            <LigneCondition libelle="Type de contrat">{contrat}</LigneCondition>
            {travail && <LigneCondition libelle="Temps de travail">{travail}</LigneCondition>}
            {duree && duree.lignes.filter(Boolean).length > 0 && (
              <LigneCondition libelle="Durée">{duree.lignes.filter(Boolean).join(" ")}</LigneCondition>
            )}
            {debut && <LigneCondition libelle="Date de début">{debut}</LigneCondition>}
            {o.expire_le && <LigneCondition libelle={"Candidatures jusqu'au"}>{dateFr(o.expire_le)}</LigneCondition>}
            {adresse && (
              <LigneCondition libelle="Lieu">
                {adresse}
                {maps && (
                  <>
                    {" "}
                    <a href={maps} target="_blank" rel="noopener noreferrer">Voir sur Google Maps</a>
                  </>
                )}
              </LigneCondition>
            )}
            {rem && (
              <LigneCondition libelle="Rémunération">
                {rem.type}
                {rem.montant ? " : " + rem.montant : ""}
              </LigneCondition>
            )}
            {rem && rem.avantages.length > 0 && (
              <LigneCondition libelle="Avantages">
                <Liste items={rem.avantages} />
              </LigneCondition>
            )}
          </div>
        </section>

        {/* 8. L'équipe */}
        <section>
          <TitreSection>L&apos;équipe</TitreSection>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            Équipe de {nomElu || "l'élu"}
            {o.groupe_politique ? " (" + o.groupe_politique + ")" : ""}
            {o.chambre ? ", " + (CHAMBRE_NOM[o.chambre] ?? o.chambre) : ""}.
          </p>
        </section>
      </div>

      {/* 9. Pied de confiance */}
      <div style={{ marginTop: 26, display: "grid", gap: 8 }}>
        {lienFiche && (
          <p style={{ margin: 0 }}>
            <a href={lienFiche}>Voir l&apos;équipe de {nomElu || "l'élu"} sur DataParl&apos; →</a>
          </p>
        )}
        <p className="meta" style={{ margin: 0 }}>
          {parElu
            ? "Offre publiée directement par l'équipe de l'élu, depuis une adresse parlementaire vérifiée."
            : "Offre collectée automatiquement et relue avant publication."}
        </p>
        <p className="meta" style={{ margin: 0 }}>
          Une anomalie ? Écrivez à <a href="mailto:bienvenue@dataparl.fr">bienvenue@dataparl.fr</a>.
        </p>
      </div>
    </>
  );
}
