import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListeMouvements from "@/app/_components/ListeMouvements";
import Partage from "@/app/_components/Partage";
import Photo from "@/app/_components/Photo";
import PubGoogle from "@/app/_components/PubGoogle";
import CrayonEdition from "@/app/_components/CrayonEdition";
import { eluDepuisFiche, eluDepuisId, equipe, lienOfficiel, mouvementsElu, statsElu } from "@/lib/elus";
import { FONCTIONS_SOCIETES } from "@/lib/exclusions";
import { familleDe } from "@/lib/familles";
import { photoAbsolue } from "@/lib/media";
import { CHAMBRE_LONG, nomAffiche, prenomNom } from "@/lib/format";
import { chevauche, fusionner, libellePeriode, moisAnnee } from "@/lib/periodes";
import { collaborateurDeLaPersonne, fonctionsGouvernement, parlementaireDepuisId, periodesElu, personne, type Appartenance, type Mandat, type Ministre, type Parlementaire } from "@/lib/referentiel";
import { partFemmes, pct, tauxTurnover } from "@/lib/stats";
import { hrefGroupe, hrefDepartement, hrefParti, sansGroupe } from "@/lib/collectifs";
import { slugDepartement } from "@/lib/senatoriales";

export const revalidate = 86400;

type Props = { params: Promise<{ id: string }> };

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
      openGraph: { siteName: "DataParl'", title: `${nom} · DataParl'`, description, url, type: "profile" },
      twitter: { card: "summary_large_image", title: `${nom} · DataParl'`, description },
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

function Groupe({ chambre, sigle, libelle }: { chambre: string; sigle: string; libelle?: string }) {
  if (!sigle) return null;
  const fam = familleDe(chambre, sigle);
  // « Aucun » n'est pas un groupe : pas de lien vers une fiche inexistante.
  const href = sansGroupe(sigle) ? null : hrefGroupe(chambre, sigle);
  const contenu = (
    <>
      Groupe {sigle}{fam && fam.code !== sigle ? <span className="meta"> (famille {fam.code})</span> : null}
    </>
  );
  return href ? <a href={href} title={libelle || undefined}>{contenu}</a> : <span title={libelle || undefined}>{contenu}</span>;
}

function ListeOrganes({ items }: { items: Appartenance[] }) {
  if (!items.length) return null;
  return (
    <ul className="organes">
      {items.map((a, i) => (
        <li key={`${a.code}-${a.debut}-${i}`}>
          {a.libelle}
          {a.fonction && a.fonction.toLowerCase() !== "membre" && <span className="puce">{a.fonction}</span>}
          <span className="meta"> · {a.fin ? `${moisAnnee(a.debut)} à ${moisAnnee(a.fin)}` : `depuis ${moisAnnee(a.debut)}`}</span>
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
  // parmi les « indéterminés » : on les retire du décompte affiché — ce ne
  // sont pas des personnes.
  const societes = f.chambre === "europarl" ? collabs.filter((c) => FONCTIONS_SOCIETES.includes(c.fonction)).length : 0;
  const indetermines = stats ? Math.max(0, stats.indetermines - societes) : 0;
  const nbCollabs = new Set(periodes.map((p) => p.collab_id)).size;
  const depuis = periodes.map((p) => p.debut).filter(Boolean).sort()[0];
  const commissionsActuelles = fusionner(appartenances.filter((a) => a.chambre === f.chambre && a.elu_id === f.elu_id && a.type !== "groupe")).filter((a) => !a.fin);
  // Les autres fiches actives de la même personne (une fiche ancienne et inactive
  // — ex. député devenu sénateur — est déjà résumée par ses mandats ci-dessous,
  // et son URL renvoie vers la fiche active).
  const autres = fiches.filter((x) => x.chambre !== f.chambre && x.actif);
  // Parcours chronologique unique : mandats parlementaires et fonctions
  // gouvernementales, du plus récent au plus ancien.
  type Etape = { mandat: Mandat | null; gouvern: Ministre | null };
  const chrono: Etape[] = [
    ...mandats.map((m) => ({ mandat: m, gouvern: null })),
    ...gouvernement.map((g) => ({ mandat: null, gouvern: g })),
  ].sort((a, b) => (b.mandat?.debut ?? b.gouvern!.debut ?? "").localeCompare(a.mandat?.debut ?? a.gouvern!.debut ?? ""));

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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(filAriane).replace(/</g, "\\u003c") }} />
      <div className="entete-elu">
        <Photo chambre={f.chambre} slug={f.slug} src={f.photo_url} nom={nom} />
        <div>
          <p className="meta" style={{ margin: 0 }}>{CHAMBRE_LONG[f.chambre]}{f.actif ? "" : ` · ${ancien(f).toLowerCase()} mandat`}</p>
          <h1 style={{ margin: "2px 0 6px" }}>{nom}</h1>
          <p className="lead" style={{ margin: 0 }}>
            {f.actif ? titre(f) : `${ancien(f)} ${titre(f).toLowerCase()}`}
            {f.circonscription && f.chambre !== "europarl" ? ` · ${f.circonscription}` : ""}
            {f.actif && f.groupe ? <> · <Groupe chambre={f.chambre} sigle={f.groupe} libelle={f.groupe_libelle} /></> : null}
          </p>
          <p className="meta" style={{ marginTop: 6 }}>
            {f.actif ? `En fonction depuis ${moisAnnee(dernierDebut(mandats, f))}` : f.fin_mandat ? `Mandat terminé en ${moisAnnee(f.fin_mandat)}` : ""}
            {f.url_officielle && <> · <a href={f.url_officielle}>fiche officielle</a></>}
            {hrefDepartement(f.departement || f.circonscription, slugDepartement) && <> · <a href={hrefDepartement(f.departement || f.circonscription, slugDepartement)!}>fiche élus de {f.departement || f.circonscription}</a></>}
            {!sansGroupe(f.groupe) && hrefGroupe(f.chambre, f.groupe) && <> · <a href={hrefGroupe(f.chambre, f.groupe)!}>fiche groupe {f.groupe}</a></>}
            {!sansGroupe(f.groupe) && hrefParti(f.groupe) && <> · <a href={hrefParti(f.groupe)!}>fiche parti {f.groupe}</a></>}
            {autres.map((x) => <span key={x.chambre}> · <a href={`/parlementaires/${encodeURIComponent(x.slug)}`}>fiche {CHAMBRE_LONG[x.chambre]}</a></span>)}
          </p>
          <Partage compact url={`https://www.dataparl.fr/parlementaires/${encodeURIComponent(f.slug)}`} titre={nom}
            texte={`${nom} : son équipe de collaborateurs, ses arrivées et ses départs, sur DataParl'`} />
        </div>
      </div>
      <CrayonEdition personneId={f.personne_id} nom={nom} />

      <p className="lead" style={{ marginBottom: 0 }}>
        {nom}, {f.actif ? titre(f).toLowerCase() : `${ancien(f).toLowerCase()} ${titre(f).toLowerCase()}`}
        {f.circonscription && f.chambre !== "europarl" ? ` pour ${f.circonscription}` : ""}
        {f.actif && f.groupe ? ` (groupe ${f.groupe})` : ""} : ici se trouvent son équipe de collaborateurs
        parlementaires, ses mandats et commissions, les mouvements de son cabinet et{" "}
        <a href={`/parlementaires/${encodeURIComponent(f.slug)}/bio`}>sa biographie</a>.
      </p>

      <div className="chiffres">
        {stats && <>
          {f.chambre === "europarl" && !stats.premier_depart ? (
            <div>
              <strong>–</strong>
              <span><a href="/vigiparl">VigiParl&apos;</a> · renouvellement : suivi repris le 8 octobre 2026, taux disponible avec 12 mois de recul</span>
            </div>
          ) : (
            <div>
              <strong style={{ color: "var(--vigi)" }}>{pct(tauxTurnover(stats))}</strong>
              <span><a href="/vigiparl">VigiParl&apos;</a> · renouvellement sur 12 mois ({stats.departs_12m} départ{stats.departs_12m > 1 ? "s" : ""})</span>
            </div>
          )}
          <div>
            <strong style={{ color: "var(--mixi)" }}>{pct(partFemmes(stats))}</strong>
            <span><a href="/mixiparl">MixiParl&apos;</a> · de femmes ({stats.femmes} F, {stats.hommes} H{indetermines > 0 ? `, ${indetermines} ind.` : ""})</span>
          </div>
        </>}
        {nbCollabs > 0 && (
          <div>
            <strong>{nbCollabs}</strong>
            <span><a href={`/parlementaires/${encodeURIComponent(f.slug)}/historique`}>collaborateurs{depuis ? ` depuis ${depuis.slice(0, 4)}` : ""}</a>, toutes chambres</span>
          </div>
        )}
      </div>

      {commissionsActuelles.length > 0 && (
        <>
          <h2>Commissions et délégations</h2>
          <ListeOrganes items={commissionsActuelles} />
        </>
      )}

      {f.actif && (
        <>
          <h2>Ses collaborateurs</h2>
          {collabs.length === 0 ? (
            <p className="meta">Aucun collaborateur dans la dernière publication officielle.</p>
          ) : (
            <table className="stats">
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
          <p>
            <a className="btn secondaire" href={`/collab?elu=${encodeURIComponent(f.slug)}`}>Contacts et export de l&apos;équipe</a>{" "}
            <a className="btn secondaire" href={`/parlementaires/${encodeURIComponent(f.slug)}/historique`}>Historique des collaborateurs</a>{" "}
            <a className="btn secondaire" href={`/parlementaires/${encodeURIComponent(f.slug)}/bio`}>Biographie</a>
          </p>
        </>
      )}
      {!f.actif && nbCollabs > 0 && (
        <p><a className="btn secondaire" href={`/parlementaires/${encodeURIComponent(f.slug)}/historique`}>Historique des collaborateurs</a></p>
      )}

      {commeCollab && (
        <p className="card" style={{ maxWidth: "none" }}>
          Avant ou après ses mandats, {nom} figure aussi sur les listes de collaborateurs parlementaires
          ({commeCollab.chambres.split(" ").map((c) => CHAMBRE_LONG[c]).join(", ")}, {commeCollab.premiere_date.slice(0, 4)}
          {commeCollab.derniere_date.slice(0, 4) !== commeCollab.premiere_date.slice(0, 4) ? `-${commeCollab.derniere_date.slice(0, 4)}` : ""}).{" "}
          <a href={`/collab/${commeCollab.slug}`}>Voir son parcours de {f.civilite === "Mme" ? "collaboratrice" : "collaborateur"}</a>
          <span className="meta"> · rapprochement par le nom, sans chevauchement avec ses mandats</span>
        </p>
      )}

      <h2>Parcours parlementaire et gouvernemental</h2>
      <ol className="parcours">
        {chrono.map(({ mandat: m, gouvern: g }, i) => {
          if (g) {
            return (
              <li key={`gouv-${g.debut}-${i}`}>
                <p className="parcours-titre">
                  <strong>{g.fonction}</strong>
                  <span className="meta">
                    {" · "}gouvernement {g.gouvernement} · {libellePeriode({ debut: g.debut, debut_connu: true, fin: g.fin, fin_connue: !!g.fin, en_cours: !g.fin })}
                  </span>
                </p>
                {g.portefeuille && <p className="meta" style={{ margin: "2px 0" }}>{g.portefeuille}</p>}
                <p className="meta" style={{ margin: "2px 0" }}><a href={"/gouv/m/" + encodeURIComponent(g.id)}>Voir la fiche gouvernement et le cabinet</a></p>
              </li>
            );
          }
          if (!m) return null;
          const pendant = appartenances.filter((a) => a.chambre === m.chambre && chevauche(a, m, 7) && (!m.elu_id || a.elu_id === m.elu_id));
          const groupes = successifs(pendant.filter((a) => a.type === "groupe"));
          // Hors mandat en cours, on écarte les passages de moins de 15 jours (suppléances).
          const organes = fusionner(pendant.filter((a) => a.type !== "groupe")).filter((a) => !m.fin || !a.fin || chevauche(a, a, 15));
          const fiche = fiches.find((x) => x.chambre === m.chambre);
          return (
            <li key={`${m.chambre}-${m.debut}-${i}`}>
              <p className="parcours-titre">
                <strong>{m.libelle}</strong>
                {m.circonscription && m.chambre !== "europarl" ? ` · ${m.circonscription}` : ""}
                <span className="meta"> · {periodeMandat(m)}</span>
                {fiche && fiche.slug !== f.slug && <> · <a href={`/parlementaires/${encodeURIComponent(fiche.slug)}`}>voir la fiche</a></>}
              </p>
              {groupes.length > 0 && (
                <p className="meta" style={{ margin: "2px 0" }}>
                  {groupes.map((g, j) => <span key={j}>{j ? " puis " : "Groupe "}{g}</span>)}
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
      {mandats.length === 0 && <p className="meta">Mandats non disponibles.</p>}

      <h2>Derniers mouvements</h2>
      {mouvements.length === 0 ? <p className="meta">Aucun mouvement enregistré.</p> : <ListeMouvements mouvements={mouvements} />}
      <p><a href={`/parlementaires/${encodeURIComponent(f.slug)}/historique`}>Tout l&apos;historique (compte gratuit)</a></p>
      <PubGoogle />
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
      <h2>Ses collaborateurs</h2>
      <table className="stats">
        <tbody>{collabs.map((c, i) => <tr key={i}><td>{prenomNom(c.collab_prenom, c.collab_nom)}</td><td>{c.fonction || "Collaborateur"}</td></tr>)}</tbody>
      </table>
      <h2>Derniers mouvements</h2>
      <ListeMouvements mouvements={mouvements} />
    </>
  );
}
