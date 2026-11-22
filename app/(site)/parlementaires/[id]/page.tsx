import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import ListeMouvements from "@/app/_components/ListeMouvements";
import Partage from "@/app/_components/Partage";
import Photo from "@/app/_components/Photo";
import PubGoogle from "@/app/_components/PubGoogle";
import CrayonEdition from "@/app/_components/CrayonEdition";
import { eluDepuisFiche, eluDepuisId, equipe, lienOfficiel, mouvementsElu, statsElu } from "@/lib/elus";
import { FONCTIONS_SOCIETES } from "@/lib/exclusions";
import { CODE_CHAMBRE, CREDIT, photoAbsolue, urlLicence } from "@/lib/media";
import { CHAMBRE_LONG, nomAffiche, prenomNom } from "@/lib/format";
import { chevauche, fusionner, libellePeriode, moisAnnee } from "@/lib/periodes";
import { collaborateurDeLaPersonne, fonctionsGouvernement, parlementaireDepuisId, periodesElu, personne, type Appartenance, type Mandat, type Ministre, type Parlementaire } from "@/lib/referentiel";
import { partFemmes, pct, tauxTurnover } from "@/lib/stats";
import { hrefGroupe, hrefDepartement, hrefParti, sansGroupe } from "@/lib/collectifs";
import { slugDepartement } from "@/lib/senatoriales";

import "./fiche-elu.css";

export const revalidate = 86400;

type Props = { params: Promise<{ id: string }> };

// Ordinaux typographiques : « 1re », « 3e » -> « 1ʳᵉ », « 3ᵉ » (charte éditoriale,
// exposant unicode plutôt que <sup> : le texte reste copiable et sélectionnable).
const ordinaux = (s: string) => s.replace(/\b1re\b/g, "1ʳᵉ").replace(/(\d+)e\b/g, "$1ᵉ");

// Dates complètes du référentiel en toutes lettres (1961-03-16 -> « 16 mars
// 1961 ») : état civil et jour exact de fin de mandat (gabarit « notice »).
const dateLongue = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const jourMoisAnnee = (iso: string) => (iso ? (iso.length === 4 ? moisAnnee(iso) : dateLongue.format(new Date(iso))) : "");

// Motif de fin de mandat en mention courte pour la ligne de période (champ
// motif_fin_mandat : causeFin de l'Assemblée, « Motif fin de mandat » du Sénat).
// Libellés sources testés dans cet ordre, du plus précis au plus général.
const MOTIF_COURT: [RegExp, string][] = [
  [/législature/i, "fin de législature"],
  [/décès|décédé/i, "décès"],
  [/annulation de l['’]élection/i, "invalidation de l'élection par le Conseil constitutionnel"],
  [/démission d['’]office/i, "démission d'office"],
  [/déchéance/i, "déchéance"],
  [/démission avant entrée/i, "démission avant entrée en fonction"],
  [/incompatibilité/i, "démission pour incompatibilité"],
  [/reprise de l['’]exercice/i, "reprise du mandat après le Gouvernement"],
  [/démission/i, "démission"],
  [/président de la république/i, "élection à la présidence de la République"],
  [/gouvernement/i, "nomination au Gouvernement"],
  [/prolongation/i, "prolongation d'une mission temporaire"],
  [/sénat/i, "élection au Sénat"],
  [/élu député|élection à l['’]assemblée/i, "élection à l'Assemblée nationale"],
  [/européen/i, "élection au Parlement européen"],
  [/ne se représent/i, "non-candidature à sa succession"],
  [/non réélu/i, "non réélection"],
  [/cessation/i, "cessation de mandat"],
  [/membre du conseil constitutionnel/i, "nomination au Conseil constitutionnel"],
];
const motifCourt = (m: string | null): string => {
  const s = (m ?? "").trim();
  if (!s) return "";
  for (const [motif, court] of MOTIF_COURT) if (motif.test(s)) return court;
  return s.charAt(0).toLowerCase() + s.slice(1);
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  const f = await parlementaireDepuisId(id).catch(() => null);
  if (f) {
    const nom = prenomNom(f.prenom, f.nom);
    const role = `${f.actif ? titre(f) : `${ancien(f)} ${titre(f).toLowerCase()}`}${f.circonscription && f.chambre !== "europarl" ? ` (${f.circonscription})` : ""}`;
    const description = `${nom}, ${role.charAt(0).toLowerCase()}${role.slice(1)}${f.groupe ? `, groupe ${f.groupe}` : ""} : collaborateurs parlementaires, mouvements de l'équipe, mandats et commissions.`;
    const url = `https://www.dataparl.fr/parlementaires/${encodeURIComponent(f.slug)}`;
    const photo = f.photo_url ? photoAbsolue(f.chambre, f.slug, 400) : null;
    return {
      title: `${nom}${f.groupe ? ` (${f.groupe})` : ""} : ses collaborateurs, bio et mandats`, description,
      alternates: { canonical: url },
      // og:image : la carte de partage 1200×630 générée par opengraph-image.tsx
      // (charte du site, nom de l'élu) prend le dessus sur une photo 400×400.
      openGraph: { siteName: "DataParl'", title: `${nom}, DataParl'`, description, url, type: "profile" },
      twitter: { card: "summary_large_image", title: `${nom}, DataParl'`, description },
    };
  }
  const e = await eluDepuisId(id).catch(() => null);
  return e ? { title: `${nomAffiche(e.nom)} : son équipe` } : { title: "Parlementaire" };
}

const TITRE: Record<string, [string, string]> = {
  assemblee: ["Député", "Députée"], senat: ["Sénateur", "Sénatrice"], europarl: ["Député européen", "Députée européenne"],
};
const titre = (f: Pick<Parlementaire, "chambre" | "civilite">) => TITRE[f.chambre][f.civilite === "Mme" ? 1 : 0];
const ancien = (f: Pick<Parlementaire, "civilite">) => (f.civilite === "Mme" ? "Ancienne" : "Ancien");

function ListeOrganes({ items }: { items: Appartenance[] }) {
  if (!items.length) return null;
  return (
    <ul className="organes">
      {items.map((a, i) => (
        <li key={`${a.code}-${a.debut}-${i}`}>
          {a.libelle}
          {a.fonction && a.fonction.toLowerCase() !== "membre" && <span className="puce">{a.fonction}</span>}
          <span className="meta">, {a.fin ? `${moisAnnee(a.debut)} à ${moisAnnee(a.fin)}` : `depuis ${moisAnnee(a.debut)}`}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function Parlementaire({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const f = await parlementaireDepuisId(id).catch(() => null);
  if (!f) return <FicheSimple id={id} />;

  const { fiches, mandats, appartenances } = await personne(f.personne_id);
  const e = eluDepuisFiche(f);
  const [collabs, mouvements, stats, periodes, commeCollab, gouvernement] = await Promise.all([
    f.actif ? equipe(e) : Promise.resolve([]),
    mouvementsElu(e, 5).catch(() => []),
    f.actif ? statsElu(e).catch(() => null) : Promise.resolve(null),
    periodesElu(fiches).catch(() => []),
    collaborateurDeLaPersonne(f.personne_id).catch(() => null),
    // Table ministres absente ou vide tant que la migration n'est pas passée : fiche intacte.
    fonctionsGouvernement(f.personne_id).catch(() => []),
  ]);
  const nom = prenomNom(f.prenom, f.nom);
  // La vue de stats compte aussi les sociétés (tiers payants, prestataires PE)
  // parmi les « indéterminés » : on les retire du décompte affiché : ce ne
  // sont pas des personnes.
  const societes = f.chambre === "europarl" ? collabs.filter((c) => FONCTIONS_SOCIETES.includes(c.fonction)).length : 0;
  const indetermines = stats ? Math.max(0, stats.indetermines - societes) : 0;
  const nbCollabs = new Set(periodes.map((p) => p.collab_id)).size;
  const depuis = periodes.map((p) => p.debut).filter(Boolean).sort()[0];
  // Les autres fiches actives de la même personne (une fiche ancienne et inactive
  // (ex. député devenu sénateur) est déjà résumée par ses mandats ci-dessous,
  // et son URL renvoie vers la fiche active).
  const autres = fiches.filter((x) => x.chambre !== f.chambre && x.actif);
  // Motif de fin de mandat en mention courte (causeFin de l'Assemblée,
  // « Motif fin de mandat » du Sénat) : il alimente la ligne de précision de
  // l'en-tête et la mention de remplacement du parcours, jamais la période.
  // Fiche du suppléant : lien depuis le parcours (art. LO176 du Code électoral).
  const motif = !f.actif ? motifCourt(f.motif_fin_mandat) : "";
  const ficheSuppleant = f.suppleant_id ? await parlementaireDepuisId(f.suppleant_id).catch(() => null) : null;
  const nomSuppleant = f.suppleant || (ficheSuppleant ? prenomNom(ficheSuppleant.prenom, ficheSuppleant.nom) : "");
  // Période affichée dans l'en-tête : en exercice, ou mandat complet avec la
  // date exacte de fin (gabarit : « De juin 2002 au 19 novembre 2026 »).
  const periodeAffichee = f.actif
    ? `En fonction depuis ${moisAnnee(dernierDebut(mandats, f))}`
    : f.fin_mandat
      ? (f.premier_mandat ? `De ${moisAnnee(f.premier_mandat)} au ${jourMoisAnnee(f.fin_mandat)}` : `Mandat terminé le ${jourMoisAnnee(f.fin_mandat)}`)
      : "";
  // Précisions sous la période, en couleur d'encre, séparées par des puces
  // fines (gabarit) : décès en toutes lettres, invalidation en alerte, autre
  // motif de fin sauf les fins ordinaires déjà lisibles dans la période.
  const FIN_ORDINAIRE = new Set(["fin de législature", "non-réélection", "non-candidature à sa succession", "cessation de mandat"]);
  const precision: ReactNode[] = [];
  if (!f.actif) {
    if (motif === "décès" || f.date_deces) {
      precision.push(`${f.civilite === "Mme" ? "Décédée" : "Décédé"} le ${jourMoisAnnee(f.date_deces || f.fin_mandat)}`);
    } else if (motif === "invalidation de l'élection par le Conseil constitutionnel") {
      precision.push(<span className="alerte-texte">Élection invalidée</span>);
      precision.push(<>décision du <a href="https://www.conseil-constitutionnel.fr" target="_blank" rel="noopener noreferrer">Conseil constitutionnel</a></>);
    } else if (motif && !FIN_ORDINAIRE.has(motif)) {
      precision.push(motif.charAt(0).toUpperCase() + motif.slice(1));
    }
  }
  // Encadré « Repères » (gabarit notice) : état civil, dernier groupe connu de
  // la chambre et identifiant public, sur des lignes dt/dd zébrées.
  const groupesChambre = appartenances
    .filter((a) => a.chambre === f.chambre && a.type === "groupe" && (a.sigle || a.libelle))
    .sort((a, b) => (a.debut || "").localeCompare(b.debut || ""));
  const dernierGroupe = groupesChambre[groupesChambre.length - 1];
  const premierMandatAffiche = f.premier_mandat || mandats.map((m) => m.debut).filter(Boolean).sort()[0] || "";
  const derFin = f.fin_mandat || [...mandats].sort((a, b) => (b.fin || b.debut).localeCompare(a.fin || a.debut))[0]?.fin || "";
  const lignesReperes: [string, ReactNode][] = [];
  if (f.date_naissance) lignesReperes.push([f.civilite === "Mme" ? "Née le" : "Né le", jourMoisAnnee(f.date_naissance)]);
  if (f.date_deces) lignesReperes.push([f.civilite === "Mme" ? "Décédée le" : "Décédé le", jourMoisAnnee(f.date_deces)]);
  if (dernierGroupe) {
    lignesReperes.push([f.actif ? "Groupe" : "Dernier groupe", <>
      {dernierGroupe.sigle || dernierGroupe.libelle}{dernierGroupe.debut ? `, depuis ${dernierGroupe.debut.slice(0, 4)}` : ""}
    </>]);
  }
  lignesReperes.push(["Identifiant", f.elu_id]);
  const resumeFiche = mandats.length > 0
    ? `${mandats.length} mandat${mandats.length > 1 ? "s" : ""} parlementaire${mandats.length > 1 ? "s" : ""}`
      + (premierMandatAffiche ? (f.actif ? `, depuis ${moisAnnee(premierMandatAffiche)}` : derFin ? `, de ${moisAnnee(premierMandatAffiche)} à ${jourMoisAnnee(derFin)}` : "") : "")
    : "";
  // Parcours chronologique unique : mandats parlementaires et fonctions
  // gouvernementales, du plus récent au plus ancien.
  type Etape = { mandat: Mandat | null; gouvern: Ministre | null };
  const chrono: Etape[] = [
    ...mandats.map((m) => ({ mandat: m, gouvern: null })),
    ...gouvernement.map((g) => ({ mandat: null, gouvern: g })),
  ].sort((a, b) => (b.mandat?.debut ?? b.gouvern!.debut ?? "").localeCompare(a.mandat?.debut ?? a.gouvern?.debut ?? ""));

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Person", name: nom, givenName: f.prenom, familyName: f.nom,
    image: (f.photo_url && photoAbsolue(f.chambre, f.slug, 400)) || undefined, url: `https://www.dataparl.fr/parlementaires/${f.slug}`,
    jobTitle: f.actif ? titre(f) : undefined, sameAs: f.url_officielle ? [f.url_officielle] : undefined,
    memberOf: f.actif ? { "@type": "GovernmentOrganization", name: CHAMBRE_LONG[f.chambre] } : undefined,
  };
  const filAriane = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Parlementaires", item: "https://www.dataparl.fr/parlementaires" },
      { "@type": "ListItem", position: 2, name: nom, item: `https://www.dataparl.fr/parlementaires/${f.slug}` },
    ],
  };
  // Métadonnées de licence de la photo officielle (Google Images : crédit du
  // détenteur, badge « Licensable »). La page de crédit de la photo
  // (www.dataparl.fr/photo-credit?img=…) détaille source, licence et usage.
  const photoPourLicence = (f.photo_url && photoAbsolue(f.chambre, f.slug, 400)) || null;
  const codePhoto = CODE_CHAMBRE[f.chambre];
  const jsonLdPhoto = photoPourLicence ? {
    "@context": "https://schema.org", "@type": "ImageObject",
    contentUrl: photoPourLicence,
    name: `Photo officielle de ${nom}`,
    creditText: CREDIT[codePhoto],
    copyrightNotice: `© ${CREDIT[codePhoto]}`,
    license: urlLicence(codePhoto) ?? undefined,
  } : null;
  // Lien vers la page de crédit de la photo affichée sur la fiche (200 px),
  // affiché sous la photo plutôt qu'en pleine zone de texte.
  const imgCredit = `${codePhoto}/${f.slug}_${codePhoto}_200.png`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane).replace(/</g, "\\u003c") }} />
      {jsonLdPhoto && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPhoto).replace(/</g, "\\u003c") }} />}
      <div className="entete-elu">
        <figure className="photo-col">
          <Photo chambre={f.chambre} slug={f.slug} src={f.photo_url} nom={nom} />
          {photoPourLicence && (
            <figcaption>
              <a href={`/photo-credit?img=${encodeURIComponent(imgCredit)}`}>© {CREDIT[codePhoto]}</a>
            </figcaption>
          )}
        </figure>
        <div>
          <h1 style={{ margin: "0 0 10px" }}>{nom}</h1>
          <ul className="statut-puces">
            <li>{f.actif ? titre(f) : `${ancien(f)} ${titre(f).toLowerCase()}`}</li>
            {f.circonscription && f.chambre !== "europarl" && <li>{ordinaux(f.circonscription)}</li>}
            {f.actif && f.groupe && <li>Groupe {f.groupe}</li>}
          </ul>
          {periodeAffichee && <p className="meta" style={{ margin: "0 0 12px" }}>{periodeAffichee}</p>}
          {precision.length > 0 && (
            <ul className="ligne-motif-fin">
              {precision.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          <ul className="liens-secondaires">
            {f.url_officielle && <li><a href={f.url_officielle}>Fiche officielle</a></li>}
            {hrefDepartement(f.departement || f.circonscription, slugDepartement) && (
              <li><a href={hrefDepartement(f.departement || f.circonscription, slugDepartement)!}>Élus de {f.departement || f.circonscription}</a></li>
            )}
            {!sansGroupe(f.groupe) && hrefGroupe(f.chambre, f.groupe) && <li><a href={hrefGroupe(f.chambre, f.groupe)!}>Groupe {f.groupe}</a></li>}
            {!sansGroupe(f.groupe) && hrefParti(f.groupe) && <li><a href={hrefParti(f.groupe)!}>Parti {f.groupe}</a></li>}
            {autres.map((x) => <li key={x.chambre}><a href={`/parlementaires/${encodeURIComponent(x.slug)}`}>{CHAMBRE_LONG[x.chambre]}</a></li>)}
            <li><a href={`/parlementaires/${encodeURIComponent(f.slug)}/bio`}>Biographie</a></li>
          </ul>
          <Partage compact url={`https://www.dataparl.fr/parlementaires/${encodeURIComponent(f.slug)}`} titre={nom}
            texte={`${nom} : son équipe de collaborateurs, ses arrivées et ses départs, sur DataParl'`} />
        </div>
      </div>
      <CrayonEdition personneId={f.personne_id} nom={nom} />

      <div className="grille-fiche">
        <div className="col-principale">
        <p className="lead" style={{ marginBottom: 0 }}>
          {nom}, {f.actif ? titre(f).toLowerCase() : `${ancien(f).toLowerCase()} ${titre(f).toLowerCase()}`}
          {f.circonscription && f.chambre !== "europarl" ? ` pour ${ordinaux(f.circonscription)}` : ""}
          {f.actif && f.groupe ? ` (groupe ${f.groupe})` : ""} : ici se trouvent son équipe de collaborateurs
          parlementaires, ses mandats et commissions et les mouvements de son cabinet.
        </p>

        <div className="chiffres fiche">
          {stats && <>
            {f.chambre === "europarl" && !stats.premier_depart ? (
              <div>
                <strong>–</strong>
                <span><a href="/vigiparl">VigiParl&apos;</a>, renouvellement : suivi repris le 8 octobre 2026, taux disponible avec 12 mois de recul</span>
              </div>
            ) : (
              <div>
                <strong style={{ color: "var(--vigi)" }}>{pct(tauxTurnover(stats))}</strong>
                <span><a href="/vigiparl">VigiParl&apos;</a>, renouvellement sur 12 mois ({stats.departs_12m} départ{stats.departs_12m > 1 ? "s" : ""})</span>
              </div>
            )}
            <div>
              <strong style={{ color: "var(--mixi)" }}>{pct(partFemmes(stats))}</strong>
              <span><a href="/mixiparl">MixiParl&apos;</a>, de femmes ({stats.femmes} F, {stats.hommes} H{indetermines > 0 ? `, ${indetermines} ind.` : ""})</span>
            </div>
          </>}
          {nbCollabs > 0 && (
            <div>
              <strong>{nbCollabs}</strong>
              <span><a href={`/parlementaires/${encodeURIComponent(f.slug)}/historique`}>collaborateurs{depuis ? ` depuis ${depuis.slice(0, 4)}` : ""}</a>, toutes chambres</span>
            </div>
          )}
        </div>

        <h2>Parcours parlementaire et gouvernemental</h2>
        <ol className="parcours parcours-notice">
          {chrono.map(({ mandat: m, gouvern: g }, i) => {
            if (g) {
              return (
                <li key={`gouv-${g.debut}-${i}`}>
                  <p className="parcours-titre">
                    <span>
                      <strong>{g.fonction}</strong>
                      {g.portefeuille ? `, ${g.portefeuille}` : ""}
                    </span>
                    <span className="meta">gouvernement {g.gouvernement}, {libellePeriode({ debut: g.debut, debut_connu: true, fin: g.fin, fin_connue: !!g.fin, en_cours: !g.fin })}</span>
                  </p>
                  <p className="meta" style={{ margin: "4px 0" }}><a href={"/gouv/m/" + encodeURIComponent(g.id)}>Voir la fiche gouvernement et le cabinet</a></p>
                </li>
              );
            }
            if (!m) return null;
            const pendant = appartenances.filter((a) => a.chambre === m.chambre && chevauche(a, m, 7) && (!m.elu_id || a.elu_id === m.elu_id));
            const groupes = successifs(pendant.filter((a) => a.type === "groupe"));
            // Hors mandat en cours, on écarte les passages de moins de 15 jours (suppléances).
            const organes = fusionner(pendant.filter((a) => a.type !== "groupe")).filter((a) => !m.fin || !a.fin || chevauche(a, a, 15));
            const fiche = fiches.find((x) => x.chambre === m.chambre);
            // Mandat clos à l'Assemblée hors fin de législature : remplacement
            // par le suppléant (art. LO176 du Code électoral), mots du gabarit.
            const remplacement = m.chambre === "assemblee" && f.chambre === "assemblee" && !f.actif
              && !!m.fin && m.fin === f.fin_mandat && !!motif && motif !== "fin de législature";
            return (
              <li key={`${m.chambre}-${m.debut}-${i}`}>
                <p className="parcours-titre">
                  <span>
                    <strong>{ordinaux(m.libelle)}</strong>
                    {m.circonscription && m.chambre !== "europarl" ? `, ${ordinaux(m.circonscription)}` : ""}
                    {fiche && fiche.slug !== f.slug && <>, <a href={`/parlementaires/${encodeURIComponent(fiche.slug)}`}>voir la fiche</a></>}
                  </span>
                  <span className="meta">{periodeMandat(m)}</span>
                </p>
                {groupes.length > 0 && (
                  <p className="meta" style={{ margin: "2px 0" }}>
                    {groupes.map((g, j) => <span key={j}>{j ? " puis " : "Groupe "}{g}</span>)}
                  </p>
                )}
                {remplacement && (
                  <p className="notice-suite">
                    Élection suivie du remplacement par le suppléant{nomSuppleant ? <>
                      {", "}
                      {ficheSuppleant && ficheSuppleant.slug !== f.slug
                        ? <a href={`/parlementaires/${encodeURIComponent(ficheSuppleant.slug)}`}>{nomSuppleant}</a>
                        : nomSuppleant}
                    </> : ""} (art. LO176 du Code électoral)
                  </p>
                )}
                {organes.length > 0 && (
                  <details open={!m.fin}>
                    <summary>{organes.length} commission{organes.length > 1 ? "s" : ""} et délégation{organes.length > 1 ? "s" : ""}</summary>
                    <ListeOrganes items={organes} />
                  </details>
                )}
              </li>
            );
          })}
        </ol>
        {chrono.length === 0 && <p className="meta">Mandats non disponibles.</p>}

        {commeCollab && (
          <p className="card" style={{ maxWidth: "none" }}>
            Avant ou après ses mandats, {nom} figure aussi sur les listes de collaborateurs parlementaires
            ({commeCollab.chambres.split(" ").map((c) => CHAMBRE_LONG[c]).join(", ")}, {commeCollab.premiere_date.slice(0, 4)}
            {commeCollab.derniere_date.slice(0, 4) !== commeCollab.premiere_date.slice(0, 4) ? `-${commeCollab.derniere_date.slice(0, 4)}` : ""}).{" "}
            <a href={`/collab/${commeCollab.slug}`}>Voir son parcours de {f.civilite === "Mme" ? "collaboratrice" : "collaborateur"}</a>
            <span className="meta">, rapprochement par le nom, sans chevauchement avec ses mandats</span>
          </p>
        )}

        <h2 id="collaborateurs">Collaborateurs</h2>
        {f.actif ? (
          <>
            <h3>Équipe parlementaire actuelle</h3>
            {collabs.length === 0 ? (
              <p className="meta">Aucun collaborateur recensé sur la période en cours.</p>
            ) : (
              <table className="stats stats-zebres">
                <thead><tr><th>Collaborateur</th><th>Fonction</th></tr></thead>
                <tbody>
                  {collabs.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <a href={`/collab/k/${encodeURIComponent(c.collab_cle)}`}>{prenomNom(c.collab_prenom, c.collab_nom)}</a>
                        {c.statut === "conge_sans_solde" && <span className="meta"> (congé)</span>}
                      </td>
                      <td>{c.fonction || "Collaborateur"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <p className="meta">
            {nbCollabs > 0
              ? "Mandat terminé : aucune équipe en exercice. Les collaborateurs ayant travaillé sous ce mandat figurent dans les mouvements ci-dessous et dans l'historique complet."
              : "Aucun collaborateur recensé pour ce parlementaire."}
          </p>
        )}
        <h3>{f.actif ? "Derniers mouvements" : "Historique des mouvements"}</h3>
        {mouvements.length === 0 ? <p className="meta">Aucun mouvement enregistré.</p> : <ListeMouvements mouvements={mouvements} />}
        <p>
          {f.actif && <a className="btn secondaire" href={`/collab?elu=${encodeURIComponent(f.slug)}`}>Contacts et export de l&apos;équipe</a>}
          {(f.actif || nbCollabs > 0) && (
            <>
              {f.actif && " "}
              <a className="btn secondaire" href={`/parlementaires/${encodeURIComponent(f.slug)}/historique`}>Consulter l&apos;historique complet des collaborateurs</a>
            </>
          )}
        </p>
        <PubGoogle />
        </div>

        <aside className="fiche-repere" aria-labelledby="titre-repere">
          <h2 id="titre-repere">Repères</h2>
          {resumeFiche && <p className="lead resume-repere">{resumeFiche}</p>}
          <dl>
            {lignesReperes.map(([label, valeur], i) => (
              <div className="ligne-repere" key={i}>
                <dt>{label}</dt>
                <dd>{valeur}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </>
  );
}

function dernierDebut(mandats: Mandat[], f: Parlementaire): string {
  const m = mandats.filter((x) => x.chambre === f.chambre && !x.fin).sort((a, b) => a.debut.localeCompare(b.debut));
  // Mandats successifs sans interruption (renouvellements) : on remonte au premier.
  const tous = mandats.filter((x) => x.chambre === f.chambre).sort((a, b) => b.debut.localeCompare(a.debut));
  let debut = m[0]?.debut ?? f.premier_mandat;
  for (const x of tous) if (x.fin && debut && Math.abs(new Date(debut).getTime() - new Date(x.fin).getTime()) < 5 * 86400_000) debut = x.debut;
  return debut;
}

// Groupes successifs dans l'ordre chronologique, sans répétition consécutive.
function successifs(groupes: Appartenance[]): string[] {
  const out: string[] = [];
  for (const g of [...groupes].sort((a, b) => a.debut.localeCompare(b.debut))) {
    const s = g.sigle || g.libelle;
    if (s && out[out.length - 1] !== s) out.push(s);
  }
  return out;
}

function periodeMandat(m: Mandat): string {
  return libellePeriode({ debut: m.debut, debut_connu: true, fin: m.fin, fin_connue: !!m.fin, en_cours: !m.fin });
}

// Élu absent du référentiel (cas rare) : fiche réduite d'après les données de collaborateurs.
async function FicheSimple({ id }: { id: string }) {
  const e = await eluDepuisId(id).catch(() => null);
  if (!e) notFound();
  const [collabs, mouvements] = await Promise.all([equipe(e), mouvementsElu(e, 5)]);
  const officiel = lienOfficiel(e);
  return (
    <>
      <p className="meta">{CHAMBRE_LONG[e.chambre]}</p>
      <h1>{nomAffiche(e.nom)}</h1>
      <p className="lead">{e.groupe ? `Groupe ${e.groupe}. ` : ""}{officiel && <a href={officiel}>Fiche officielle</a>}</p>
      <h2>Collaborateurs</h2>
      <table className="stats stats-zebres">
        <thead><tr><th>Collaborateur</th><th>Fonction</th></tr></thead>
        <tbody>
          {collabs.map((c, i) => (
            <tr key={i}>
              <td><a href={`/collab/k/${encodeURIComponent(c.collab_cle)}`}>{prenomNom(c.collab_prenom, c.collab_nom)}</a></td>
              <td>{c.fonction || "Collaborateur"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Derniers mouvements</h3>
      <ListeMouvements mouvements={mouvements} />
    </>
  );
}
