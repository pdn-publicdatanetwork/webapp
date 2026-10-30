import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListeMouvements from "@/app/_components/ListeMouvements";
import Photo from "@/app/_components/Photo";
import { eluDepuisFiche, eluDepuisId, mouvementsElu } from "@/lib/elus";
import { CHAMBRE_LONG, nomAffiche, prenomNom } from "@/lib/format";
import { chevauche, libellePeriode, moisAnnee } from "@/lib/periodes";
import { collaborateurDeLaPersonne, fonctionsGouvernement, parlementaireDepuisId, personne, type Appartenance, type Mandat, type Ministre, type Parlementaire } from "@/lib/referentiel";
import { assainirHtml, estHtml } from "@/lib/htmlBio";
import { editionsManuelles } from "@/lib/editionsManuelles";
import { pubActive } from "@/lib/deblocage";
import BioComplete from "./BioComplete";
import PubGoogle from "@/app/_components/PubGoogle";
import CrayonEdition from "@/app/_components/CrayonEdition";
import BlocRetenir from "@/app/_components/BlocRetenir";

export const revalidate = 86400;
type Props = { params: Promise<{ id: string }> };

const TITRE: Record<string, [string, string]> = {
  assemblee: ["député", "députée"], senat: ["sénateur", "sénatrice"], europarl: ["député européen", "députée européenne"],
};
const role = (f: Pick<Parlementaire, "chambre" | "civilite">) => TITRE[f.chambre][f.civilite === "Mme" ? 1 : 0];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  const f = await parlementaireDepuisId(id).catch(() => null);
  if (!f) return { title: "Biographie" };
  const nom = prenomNom(f.prenom, f.nom);
  const r = f.actif ? role(f) : `${f.civilite === "Mme" ? "ancienne" : "ancien"} ${role(f)}`;
  const description = `Biographie de ${nom}, ${r}${f.circonscription && f.chambre !== "europarl" ? ` (${f.circonscription})` : ""}${f.groupe ? `, groupe ${f.groupe}` : ""} : mandats, groupes et commissions, collaborateurs et mouvements de son équipe parlementaire.`;
  return {
    title: `${nom} : biographie et parcours parlementaire`,
    description,
    alternates: { canonical: `/parlementaires/${encodeURIComponent(f.slug)}/bio` },
    openGraph: { siteName: "DataParl'", title: `${nom} : biographie, DataParl'`, description, url: `https://www.dataparl.fr/parlementaires/${encodeURIComponent(f.slug)}/bio`, type: "profile" },
  };
}

// Rendu léger des biographies manuelles : sections « I. … » en intertitre,
// **gras** et sauts de ligne simples à l'intérieur d'un paragraphe.
const TITRE_SECTION = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\.\s+\S/;
function gras(bloc: string, cle: string) {
  return bloc.split(/(\*\*[^*]+\*\*)/g).map((m, i) =>
    m.startsWith("**") && m.endsWith("**") ? <strong key={`${cle}-${i}`}>{m.slice(2, -2)}</strong> : m);
}

function ParagrapheBio({ texte, i }: { texte: string; i: number }) {
  const lignes = texte.split("\n").filter((l) => l.trim());
  if (TITRE_SECTION.test(texte)) return <h3 style={{ marginTop: 24 }}>{texte}</h3>;
  return (
    <p key={i}>
      {lignes.map((l, j) => (
        <span key={j}>{j > 0 && <br />}{gras(l, `${i}-${j}`)}</span>
      ))}
    </p>
  );
}

// Aperçu public de la biographie (premiers paragraphes), pour les moteurs
// de recherche et pour donner envie de lire la suite.
function apercuTexte(texte: string): string {
  const paras = texte.split(/\n\s*\n/).filter((p) => p.trim());
  let s = paras[0] ?? "";
  if (s.length < 350 && paras[1]) s += `\n\n${paras[1]}`;
  return s.length > 800 ? `${s.slice(0, 800).trim()}…` : s;
}

function apercuHtml(texte: string): string {
  const html = assainirHtml(texte);
  let fin = -1;
  for (let i = 0; i < 2; i++) fin = html.indexOf("</p>", fin + 1);
  const coupe = fin > 0 ? html.slice(0, fin + 4) : html.slice(0, 600);
  return html.length > coupe.length ? `${coupe}<p>…</p>` : coupe;
}

export default async function Bio({ params }: Props) {
  const id = decodeURIComponent((await params).id);
  const f = await parlementaireDepuisId(id).catch(() => null);
  if (!f) {
    const e = await eluDepuisId(id).catch(() => null);
    if (!e) notFound();
    return <p className="meta">Fiche indisponible pour {nomAffiche(e.nom)}. <a href={`/parlementaires/${encodeURIComponent(id)}`}>Voir l&apos;équipe</a></p>;
  }
  const { fiches, mandats, appartenances } = await personne(f.personne_id);
  const e = eluDepuisFiche(f);
  const [mouvements, commeCollab, gouvernement] = await Promise.all([
    mouvementsElu(e, 5).catch(() => []),
    collaborateurDeLaPersonne(f.personne_id).catch(() => null),
    fonctionsGouvernement(f.personne_id).catch(() => []),
  ]);
  const nom = prenomNom(f.prenom, f.nom);
  const ficheUrl = `/parlementaires/${encodeURIComponent(f.slug)}`;

  // Mandats de la chambre courante, puis les autres chambres.
  const ici = mandats.filter((m) => m.chambre === f.chambre).sort((a, b) => a.debut.localeCompare(b.debut));
  const autres = mandats.filter((m) => m.chambre !== f.chambre);
  const groupes = (m: Mandat) =>
    appartenances.filter((a) => a.chambre === m.chambre && a.type === "groupe" && chevauche(a, m, 7) && (!m.elu_id || a.elu_id === m.elu_id));
  const dernier = ici[ici.length - 1];
  const commissions = appartenances.filter((a) => a.chambre === f.chambre && a.type !== "groupe" && (!a.fin || f.actif));
  // Éditions manuelles (admin.dataparl.fr/elus) : bio, mandats et fonctions.
  const manuel = await editionsManuelles(f.personne_id).catch(() => ({ bio: null, mandats: [], fonctions: [] }));
  const mandatsManuels = manuel.mandats.map((m) => ({
    chambre: m.chambre, elu_id: m.elu_id, personne_id: m.personne_id,
    libelle: m.libelle, circonscription: m.circonscription, legislature: "",
    debut: m.debut, fin: m.fin, cause_fin: m.cause_fin,
  }) as Mandat);
  // Parcours chronologique unique : mandats parlementaires (référentiel et
  // éditions manuelles) et fonctions gouvernementales, du plus récent au plus ancien.
  // Fonctions gouvernementales représentées comme des mandats (« chambre »
  // virtuelle « gouvernement ») pour figurer dans le parcours chronologique.
  type MandatGouv = Omit<Mandat, "chambre"> & { chambre: "gouvernement" };
  type Etape = Mandat | MandatGouv;
  const mandatsGouv: MandatGouv[] = gouvernement.map((g: Ministre) => ({
    chambre: "gouvernement" as const, elu_id: "", personne_id: f.personne_id,
    libelle: g.fonction, circonscription: g.portefeuille || "", legislature: "",
    debut: g.debut, fin: g.fin, cause_fin: "",
  }));
  const parcours: Etape[] = ([...mandats, ...mandatsManuels, ...mandatsGouv] as Etape[]).sort((a, b) => (b.debut || "").localeCompare(a.debut || ""));

  const phrases: string[] = [];
  const elu = f.civilite === "Mme" ? "élue" : "élu";
  phrases.push(
    f.actif
      ? `${nom} est ${role(f)}${dernier?.debut ? ` depuis ${moisAnnee(dernier.debut)}` : ""}` +
        `${f.circonscription && f.chambre !== "europarl" ? `, pour la circonscription « ${f.circonscription} »` : ""}` +
        `${f.groupe ? `, au sein du groupe ${f.groupe}${f.groupe_libelle ? ` (${f.groupe_libelle})` : ""}` : ""}.`
      : `${nom} a été ${role(f)} à ${CHAMBRE_LONG[f.chambre]}${dernier?.debut ? `, ${elu} ${moisAnnee(dernier.debut)}${dernier.fin ? ` pour un mandat terminé en ${moisAnnee(dernier.fin)}` : ""}` : ""}` +
        `${f.groupe ? `, au sein du groupe ${f.groupe}` : ""}.`,
  );
  if (ici.length > 1)
    phrases.push(`Au total, ${nom} compte ${ici.length} mandats à ${CHAMBRE_LONG[f.chambre]}, le premier ${moisAnnee(ici[0].debut)}.`);
  if (autres.length)
    phrases.push(`${f.civilite === "Mme" ? "Elle" : "Il"} a aussi siégé ${autres.map((m) => `à ${CHAMBRE_LONG[m.chambre]}${m.debut ? ` (de ${moisAnnee(m.debut)}${m.fin ? ` à ${moisAnnee(m.fin)}` : " à aujourd'hui"})` : ""}`).join(", ")}.`);
  if (commeCollab)
    phrases.push(`Avant ou entre ses mandats, ${nom} figure aussi sur les listes officielles de collaborateurs parlementaires (${commeCollab.chambres.split(" ").map((c) => CHAMBRE_LONG[c]).join(", ")}, ${commeCollab.premiere_date.slice(0, 4)}${commeCollab.derniere_date.slice(0, 4) !== commeCollab.premiere_date.slice(0, 4) ? `-${commeCollab.derniere_date.slice(0, 4)}` : ""}).`);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Person",
    name: nom, givenName: f.prenom, familyName: f.nom,
    birthDate: f.date_naissance || undefined,
    url: `https://www.dataparl.fr/parlementaires/${f.slug}/bio`,
    jobTitle: f.actif ? role(f) : undefined,
    description: phrases.join(" "),
    sameAs: f.url_officielle ? [f.url_officielle] : undefined,
    memberOf: f.actif ? { "@type": "GovernmentOrganization", name: CHAMBRE_LONG[f.chambre] } : undefined,
  };
  const fil = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Parlementaires", item: "https://www.dataparl.fr/parlementaires" },
      { "@type": "ListItem", position: 2, name: nom, item: `https://www.dataparl.fr/parlementaires/${f.slug}` },
      { "@type": "ListItem", position: 3, name: "Biographie" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(fil).replace(/</g, "\\u003c") }} />
      <p className="meta" style={{ marginTop: 0 }}><a href={ficheUrl}>← Fiche de {nom}</a></p>
      <CrayonEdition personneId={f.personne_id} nom={nom} />
      <div className="entete-elu">
        <Photo chambre={f.chambre} slug={f.slug} src={f.photo_url} nom={nom} />
        <div>
          <p className="meta" style={{ margin: 0 }}>{CHAMBRE_LONG[f.chambre]}, biographie</p>
          <h1 style={{ margin: "2px 0 6px" }}>{nom}</h1>
          <p className="lead" style={{ margin: 0 }}>
            {f.actif ? role(f) : `${f.civilite === "Mme" ? "Ancienne" : "Ancien"} ${role(f)}`}
            {f.circonscription && f.chambre !== "europarl" ? `, ${f.circonscription}` : ""}
            {f.actif && f.groupe ? `, groupe ${f.groupe}` : ""}
          </p>
        </div>
      </div>

      {manuel.bio && (pubActive() ? (
        <>
          <h2>Biographie de {nom}</h2>
          {estHtml(manuel.bio.texte)
            ? <div className="bio-html" dangerouslySetInnerHTML={{ __html: apercuHtml(manuel.bio.texte) }} />
            : apercuTexte(manuel.bio.texte).split(/\n\s*\n/).map((p, i) => <ParagrapheBio key={i} texte={p.trim()} i={i} />)}
          <p className="meta" style={{ marginTop: 12 }}>La suite de la biographie de {nom} est réservée aux comptes DataParl&apos; (gratuits) : elle se débloque en quelques secondes contre une courte vidéo publicitaire.</p>
          <BioComplete personne={f.personne_id} nom={nom} suite={`/parlementaires/${encodeURIComponent(f.slug)}/bio`} />
        </>
      ) : (
        <>
          <h2>Biographie de {nom}</h2>
          {estHtml(manuel.bio.texte)
            ? <div className="bio-html" dangerouslySetInnerHTML={{ __html: assainirHtml(manuel.bio.texte) }} />
            : manuel.bio.texte.split(/\n\s*\n/).map((p, i) => <ParagrapheBio key={i} texte={p.trim()} i={i} />)}
          {manuel.bio.source && (
            <p className="meta">Source : {manuel.bio.source}, biographie éditée par l&apos;équipe DataParl&apos;.</p>
          )}
        </>
      ))}

      <h2>Qui est {nom} ?</h2>
      {phrases.map((p, i) => <p key={i}>{p}</p>)}
      {f.date_naissance && (
        <p className="meta">
          Né{f.civilite === "Mme" ? "e" : ""} {f.date_naissance.length === 4 ? `en ${f.date_naissance}` : `le ${f.date_naissance.split("-").reverse().join("/")}`}.
        </p>
      )}
      <h2>Parcours parlementaire et gouvernemental</h2>
      <ol className="parcours">
        {parcours.map((m, i) => {
          if (m.chambre === "gouvernement") {
            return (
              <li key={`gouv-${m.debut}-${i}`}>
                <p className="parcours-titre">
                  <strong>{m.libelle}</strong>
                  {m.circonscription ? `, ${m.circonscription}` : ""}
                  <span className="meta">, {libellePeriode({ debut: m.debut, debut_connu: !!m.debut, fin: m.fin, fin_connue: !!m.fin, en_cours: !m.fin })}</span>
                  <span className="puce">gouvernement</span>
                </p>
              </li>
            );
          }
          const mandat = m as Mandat;
          const g = mandat.chambre === f.chambre ? groupes(mandat).map((a) => a.sigle || a.libelle).filter(Boolean) : [];
          const manuelItem = mandatsManuels.includes(mandat);
          return (
            <li key={`${mandat.chambre}-${mandat.debut}-${i}`}>
              <p className="parcours-titre">
                <strong>{mandat.libelle}</strong>
                {mandat.circonscription && mandat.chambre !== "europarl" ? `, ${mandat.circonscription}` : ""}
                <span className="meta">, {libellePeriode({ debut: mandat.debut, debut_connu: !!mandat.debut, fin: mandat.fin, fin_connue: !!mandat.fin, en_cours: !mandat.fin })}</span>
                {manuelItem && <span className="puce">précisé par DataParl&apos;</span>}
              </p>
              {g.length > 0 && <p className="meta" style={{ margin: "2px 0" }}>Groupe : {g.join(", ")}</p>}
            </li>
          );
        })}
      </ol>
      {parcours.length === 0 && <p className="meta">Mandats non disponibles.</p>}

      {(commissions.length > 0 || manuel.fonctions.length > 0) && (
        <>
          <h2>Commissions et fonctions{f.actif ? " actuelles" : ""}</h2>
          <ul className="organes">
            {commissions.slice(0, 12).map((a: Appartenance, i) => (
              <li key={`${a.code}-${a.debut}-${i}`}>
                {a.libelle}
                {a.fonction && a.fonction.toLowerCase() !== "membre" && <span className="puce">{a.fonction}</span>}
                <span className="meta">, {a.fin ? `${moisAnnee(a.debut)} à ${moisAnnee(a.fin)}` : `depuis ${moisAnnee(a.debut)}`}</span>
              </li>
            ))}
            {manuel.fonctions.map((a) => (
              <li key={a.id}>
                {a.libelle}
                {a.fonction && a.fonction.toLowerCase() !== "membre" && <span className="puce">{a.fonction}</span>}
                <span className="meta">, {a.fin ? `${a.debut ? `${moisAnnee(a.debut)} à ${moisAnnee(a.fin)}` : `jusqu'en ${moisAnnee(a.fin)}`}` : a.debut ? `depuis ${moisAnnee(a.debut)}` : ""}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Son équipe et ses mouvements</h2>
      <p>
        La fiche complète de {nom} donne la liste de son équipe parlementaire, les arrivées et les départs dans son
        cabinet, et l&apos;historique complet depuis les archives officielles. Les mouvements les plus récents :
      </p>
      {mouvements.length === 0 ? <p className="meta">Aucun mouvement enregistré.</p> : <ListeMouvements mouvements={mouvements} />}
      <p>
        <a className="btn" href={ficheUrl}>Voir l&apos;équipe de {nom}</a>{" "}
        <a className="btn secondaire" href={`${ficheUrl}/historique`}>Historique des collaborateurs</a>
      </p>
      <PubGoogle />
      {/* Rétention : proposer les alertes email après une lecture de bio
          (l'inscription aux alertes inclut la newsletter). */}
      <BlocRetenir />
      {f.url_officielle && (
        <p className="meta">Sources officielles : <a href={f.url_officielle}>fiche institutionnelle</a>, données DataParl&apos; mises à jour chaque jour.</p>
      )}
    </>
  );
}
