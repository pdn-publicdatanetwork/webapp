import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CHAMBRE_LONG, prenomNom } from "@/lib/format";
import { libellePeriode, moisAnnee } from "@/lib/periodes";
import { collaborateurDepuisSlug, parlementaireDepuisId, parlementairesParElu, periodesCollab } from "@/lib/referentiel";
import { nomAffiche } from "@/lib/format";
import { slugCollectif } from "@/lib/collectifs";
import { groupesDuCollab } from "@/lib/equipesGroupesData";
import { cabinetsDeCollab, ministresParIds } from "@/lib/gouvernement";
import { finEffective, periode } from "@/lib/gouvernementTypes";
import ParcoursCollab from "./ParcoursCollab";
import ProfilCV from "./ProfilCV";
import Partager from "./Partager";
import styles from "./fiche.module.css";
import PubGoogle from "@/app/_components/PubGoogle";
import BlocRetenir from "@/app/_components/BlocRetenir";

// Fraîcheur horaire : le balayage JORF du matin (cron ~07:10 UTC) apparaît
// sur le site dans la journée (avant : 24 h).
export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

// Fiches collaborateurs indexables : listes officielles publiques (AN, Senat).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await collaborateurDepuisSlug((await params).slug).catch(() => null);
  if (!c) return { title: "Collaborateur" };
  const nom = prenomNom(c.prenom, c.nom);
  // Claims Google (brief) : title « Nom | DataParl' » (template du layout racine),
  // description « Parcours de Nom sur DataParl' : élus, mouvements et historique
  // depuis 2015. », og:title « Nom sur DataParl' » (og:site_name vient du layout).
  const claim = "Parcours de " + nom + " sur DataParl’ : élus, mouvements et historique depuis 2015.";
  return {
    title: nom,
    description: claim,
    alternates: { canonical: "/collab/" + c.slug },
    openGraph: { siteName: "DataParl'", title: nom + " sur DataParl’", description: claim },
  };
}

export default async function FicheCollab({ params }: Props) {
  const { slug } = await params;
  const c = await collaborateurDepuisSlug(slug).catch(() => null);
  if (!c) notFound();
  const periodes = await periodesCollab(c.collab_id);
  const actuelles = periodes.filter((p) => p.en_cours);
  // Déduplication : une ligne par poste en cours (chambre, employeur,
  // fonction) ; les périodes peuvent exister en plusieurs exemplaires
  // (imports successifs, affectations « (groupement) » du PE).
  const vus = new Set<string>();
  const actuellesVues = actuelles.filter((p) => {
    const cle = [p.chambre, p.elu_id, p.elu_nom, p.fonction].join("|");
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
  const [fiches, commeElu] = await Promise.all([
    parlementairesParElu(actuelles).catch(() => []),
    c.parlementaire_slug ? parlementaireDepuisId(c.parlementaire_slug).catch(() => null) : Promise.resolve(null),
  ]);
  const nom = prenomNom(c.prenom, c.nom);
  // Membres de cabinets ministériels rattachés à cette personne (rapprochement
  // par collab_id) : la même fiche réunit les deux parcours.
  const cabinets = c.collab_id ? await cabinetsDeCollab([c.collab_id]).catch(() => []) : [];
  // Groupes politiques auxquels cette personne est rattachée en tant
  // qu'assistant de groupement (Parlement européen) : pour nommer et lier
  // l'employeur collectif sur les périodes sans élu individuel.
  const groupesGroupement = await groupesDuCollab(c.collab_id).catch(() => []);
  const ministresGouv = new Map((await ministresParIds([...new Set(cabinets.map((p) => p.ministre_id))]).catch(() => [])).map((x) => [x.id, x]));
  const role = c.genre === "F" ? "Collaboratrice parlementaire" : c.genre === "H" ? "Collaborateur parlementaire" : "Collaborateur(rice) parlementaire";

  return (
    <>
      <p className="meta" style={{ marginBottom: 0 }}>{role}, {c.chambres.split(" ").map((x) => CHAMBRE_LONG[x]).join(", ")}</p>
      {/* Photo de profil déclarée par l'intéressé (Ma fiche) : visible à côté
          du nom ; rien n'est affiché si la personne n'en a pas publiée. */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {c.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.photo_url}
            alt={"Photo de " + nom}
            style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)", flex: "none", background: "var(--bg)" }}
          />
        ) : null}
        <h1 style={{ margin: 0 }}>{nom}</h1>
      </div>
      <p className="lead">
        {c.actif ? "En poste aujourd'hui." : `Dernière présence connue : ${moisAnnee(c.derniere_date)}.`}{" "}
        {c.n_elus > 1 ? `A travaillé pour ${c.n_elus} élus` :
 "A travaillé pour 1 élu"}
        {c.premiere_date ?
 ` depuis ${c.premiere_date.slice(0, 4)}` : ""}.
      </p>

      <Partager slug={c.slug} nom={nom} />

      {commeElu && (
        <p className="card" style={{ maxWidth: "none" }}>
          {nom} a aussi été {commeElu.actif ? "élu(e)" : "parlementaire"} :{" "}
          <a href={`/parlementaires/${encodeURIComponent(commeElu.slug)}`}>
            {commeElu.chambre === "senat" ? (commeElu.civilite === "Mme" ? "sénatrice" : "sénateur") : commeElu.chambre === "europarl" ? (commeElu.civilite === "Mme" ? "députée européenne" : "député européen") : (commeElu.civilite === "Mme" ? "députée" : "député")}
            {commeElu.circonscription && commeElu.chambre !== "europarl" ? ` (${commeElu.circonscription})` : ""}
          </a>
          {commeElu.actif ? ", en fonction" : commeElu.fin_mandat ? `, jusqu'en ${commeElu.fin_mandat.slice(0, 4)}` : ""}.
          <span className="meta"> Rapprochement par le nom, sans chevauchement entre ses mandats et ses postes de collaborateur.</span>
        </p>
      )}

      {/* Parcours certifié : sources officielles AN/Sénat, vérifié par
          DataParl'. Visuellement distinct du profil CV déclaré. */}
      <section className={styles.bloc}>
        <div className={styles.enteteBloc}>
          <h2>Parcours</h2>
          <span className={`${styles.badge} ${styles.badgeOfficiel}`}>✓ Certifié DataParl&apos;, listes officielles</span>
        </div>
        <p className="meta" style={{ margin: "2px 0 14px" }}>
          Chaque poste provient des listes officielles de l&apos;Assemblée nationale et du Sénat, vérifiées par DataParl&apos;.
        </p>

        {actuelles.length > 0 && (
          <>
            <h3>Aujourd&apos;hui</h3>
            <ul className="organes">
              {actuellesVues.map((p, i) => {
                const f = fiches.find((x) => x.chambre === p.chambre && x.elu_id === p.elu_id);
                // Assistant rattaché au groupement (Parlement européen) : pas
                // d'élu employeur individuel, le groupe politique est
                // l'employeur collectif.
                if (!f && !p.elu_nom && /groupement/i.test(p.fonction ?? "")) {
                  const sigle = p.chambre === "europarl" ? groupesGroupement[0] : "";
                  const fonction = (p.fonction || "").replace(/\s*\(groupement\)\s*/i, " ").trim();
                  return (
                    <li key={i}>
                      {(fonction || (c.genre === "F" ? "Collaboratrice" : "Collaborateur")) + " rattaché" + (c.genre === "F" ? "e" : "") + " au "}
                      {sigle
                        ? <a href={`/groupe/pe-${slugCollectif(sigle)}/`}>{`groupe politique ${sigle} (groupement)`}</a>
                        : "groupe politique (groupement)"}
                      <span className="meta">, {CHAMBRE_LONG[p.chambre]}, {libellePeriode(p)}</span>
                    </li>
                  );
                }
                const eluNom = f ? prenomNom(f.prenom, f.nom) : nomAffiche(p.elu_nom);
                return (
                  <li key={i}>
                    {p.fonction || (c.genre === "F" ? "Collaboratrice" : "Collaborateur")} de{" "}
                    {f ? <a href={`/parlementaires/${encodeURIComponent(f.slug)}`}>{eluNom}</a> : eluNom}
                    <span className="meta">, {CHAMBRE_LONG[p.chambre]}{f?.groupe ? `, ${f.groupe}` : ""}, {libellePeriode(p)}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <ParcoursCollab id={c.collab_id} suite={`/collab/${c.slug}`} />
      </section>

      {/* Profil CV déclaré par l'intéressé : rubrique séparée, réservée aux
          comptes, jamais mélangée aux parcours sourcés AN/Sénat. */}
      <ProfilCV slug={c.slug} />

      {cabinets.length > 0 && (
        <>
          <h2>Cabinet ministériel</h2>
          <ul className="gouvernement">
            {cabinets.map((p) => {
              const mi = ministresGouv.get(p.ministre_id);
              return (
                <li key={p.id}>
                  {p.fonction || "Membre de cabinet"} au cabinet de{" "}
                  {mi ? <a href={"/gouv/m/" + encodeURIComponent(mi.id)}>{prenomNom(mi.prenom, mi.nom)}</a> : "ministre inconnu"}
                  <span className="meta">
                    {" (" + (mi ? (mi.portefeuille || mi.fonction) + ", " + mi.gouvernement + ", " : "") + periode(p.debut, finEffective(p.fin, mi?.fin ?? null)) + ")"}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Annonce display AdSense : après le contenu, avant les fiches liées.
          Aucun espace réservé tant que NEXT_PUBLIC_ADSENSE_SLOT n'est pas défini. */}
      <PubGoogle />

      {/* Rétention : après une lecture de fiche, proposer les alertes email
          (l'inscription aux alertes inclut la newsletter). */}
      <BlocRetenir />

      <p className="meta" style={{ marginTop: 32 }}>
        Fiche établie d&apos;après les listes officielles de collaborateurs publiées par l&apos;Assemblée nationale et le Sénat.
        Deux personnes homonymes peuvent être confondues. Pour faire rectifier ou masquer une information :{" "}
        <a href="/contact?sujet=rgpd">formulaire de contact</a>.
      </p>
    </>
  );
}
