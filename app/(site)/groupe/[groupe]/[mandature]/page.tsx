import type { Metadata } from "next";
import Link from "next/link";
import ListeElus, { CHAMBRE_LONG } from "@/app/_components/ListeElus";
import { elusDeMandature, mandaturesExistantes, scrutinsExistants, type EluMandature, type MandatureExistante, type ScrutinExistant } from "@/lib/mandaturesData";
import { groupesExistants } from "@/lib/collectifsData";
import type { EluCollectif } from "@/lib/collectifsData";
import { CHAMBRE_COURTE, decomposerSlugGroupe, sansGroupe, slugCollectif, type GroupeExistant } from "@/lib/collectifs";
import { harmoniserSigle, libelleMandature, mandatureDepuisSlug, RENOUVELLEMENTS_SERIES, sigleDepuisSlug } from "@/lib/mandatures";

// Pages « groupes par mandature » : une chambre pendant une mandature
// (/groupe/an/xvii, /groupe/pe/10e, /groupe/senat/serie-1) et un groupe pendant
// une mandature (/groupe/pe-renew/10e, /groupe/an-rn/xvii…). Les renommages
// sont harmonisés : les élus du FN d'hier figurent sur la fiche RN d'aujourd'hui,
// avec le groupe de l'époque rappelé. Les mandatures sont déduites des mandats
// réellement enregistrés (« jusqu'où on a les valeurs ») ; au Sénat, chaque
// série pointe vers ses scrutins (/groupe/senat/serie-1/2023…).

export const revalidate = 86400;
type Props = { params: Promise<{ groupe: string; mandature: string }> };

const CHAMBRE_DEPUIS_SLUG: Record<string, string> = {};
for (const [chambre, courte] of Object.entries(CHAMBRE_COURTE)) CHAMBRE_DEPUIS_SLUG[courte] = chambre;

// Les autres mandatures de la même chambre (ou du même groupe).
function AutresMandatures({ mandatures, chambre, actuelle, prefixe }: { mandatures: MandatureExistante[]; chambre: string; actuelle: string; prefixe: string }) {
  const autres = mandatures.filter((m) => m.chambre === chambre && m.slug !== actuelle);
  if (!autres.length) return null;
  return (
    <p className="meta">
      {"Autres mandatures : "}
      {autres.map((m, i) => (
        <span key={m.slug}>
          {i > 0 ? ", " : ""}
          <Link href={prefixe + "/" + m.slug}>{m.libelle}</Link>
        </span>
      ))}
    </p>
  );
}

// Les scrutins de renouvellement d'une série du Sénat (data-driven).
function ScrutinsDeSerie({ scrutins, serie, prefixe }: { scrutins: ScrutinExistant[]; serie: number; prefixe: string }) {
  const liste = scrutins.filter((s) => s.serie === serie);
  if (!liste.length) return null;
  return (
    <p className="meta">
      {"Par scrutin de renouvellement : "}
      {liste.map((s, i) => (
        <span key={s.annee}>
          {i > 0 ? ", " : ""}
          <Link href={prefixe + "/" + s.annee}>{s.annee}</Link>
          <span className="meta"> ({s.elus} élu{s.elus > 1 ? "s" : ""})</span>
        </span>
      ))}
    </p>
  );
}

function Introuvable({ cause }: { cause: string }) {
  return (
    <>
      <h1>Mandature introuvable</h1>
      <p className="lead">{cause}</p>
      <p><Link className="btn secondaire" href="/groupe">Voir tous les groupes</Link></p>
    </>
  );
}

// Affichage d'un élu avec son groupe de l'époque (et non d'aujourd'hui).
function pourAffichage(e: EluMandature): EluCollectif {
  return { ...e, groupe: e.sigleEpoque || e.groupe, groupe_libelle: e.groupeLibelleEpoque || e.groupe_libelle };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupe: slugGroupe, mandature: slug } = await params;
  const chambre = CHAMBRE_DEPUIS_SLUG[slugGroupe] ?? decomposerSlugGroupe(slugGroupe)?.chambre ?? "";
  const valeur = chambre ? mandatureDepuisSlug(chambre, slug) : null;
  if (!chambre || valeur === null) return { title: "Mandature" };
  const libelle = libelleMandature(chambre, valeur) ?? "mandature";
  if (CHAMBRE_DEPUIS_SLUG[slugGroupe]) {
    return { title: CHAMBRE_LONG[chambre] + " : " + libelle, alternates: { canonical: "/groupe/" + slugGroupe + "/" + slug } };
  }
  const d = decomposerSlugGroupe(slugGroupe);
  if (!d) return { title: "Mandature" };
  const groupes = await groupesExistants().catch((): GroupeExistant[] => []);
  const resolu = sigleDepuisSlug(d.chambre, d.slugSigle, groupes.filter((g) => g.chambre === d.chambre).map((g) => g.groupe));
  const nom = resolu ? (groupes.find((g) => g.chambre === d.chambre && g.groupe === resolu.actuel)?.groupe_libelle ?? resolu.actuel) : "groupe";
  return { title: "Groupe " + nom + " : " + libelle, alternates: { canonical: "/groupe/" + slugGroupe + "/" + slug } };
}

export default async function PageMandature({ params }: Props) {
  const { groupe: slugGroupe, mandature: slug } = await params;
  const chambre = CHAMBRE_DEPUIS_SLUG[slugGroupe];
  if (chambre) return <MandatureChambre chambre={chambre} slug={slug} />;
  return <GroupeMandature slugGroupe={slugGroupe} slug={slug} />;
}

// Une chambre pendant une mandature : les élus regroupés par groupe de
// l'époque, renommages harmonisés, tri par effectif.
async function MandatureChambre({ chambre, slug }: { chambre: string; slug: string }) {
  const valeur = mandatureDepuisSlug(chambre, slug);
  if (valeur === null) return <Introuvable cause={"La mandature « " + slug + " » n'existe pas pour " + CHAMBRE_LONG[chambre] + "."} />;
  const [elus, mandatures, scrutins] = await Promise.all([
    elusDeMandature(chambre, valeur).catch((): EluMandature[] => []),
    mandaturesExistantes().catch((): MandatureExistante[] => []),
    scrutinsExistants().catch((): ScrutinExistant[] => []),
  ]);
  if (!elus.length) return <Introuvable cause={"Aucun élu enregistré pour cette mandature (" + (libelleMandature(chambre, valeur) ?? slug) + "."} />;
  const libelle = libelleMandature(chambre, valeur) ?? "mandature";
  const sections = new Map<string, { sigle: string; libelle: string; elus: EluMandature[]; anciens: Set<string> }>();
  let horsGroupe: EluMandature[] = [];
  for (const e of elus) {
    if (sansGroupe(e.sigleEpoque)) { horsGroupe.push(e); continue; }
    const sigle = harmoniserSigle(chambre, e.sigleEpoque);
    let s = sections.get(sigle);
    if (!s) { s = { sigle, libelle: e.groupeLibelleEpoque || sigle, elus: [], anciens: new Set<string>() }; sections.set(sigle, s); }
    s.elus.push(e);
    if (e.sigleEpoque !== sigle) s.anciens.add(e.sigleEpoque);
  }
  const liste = [...sections.values()].sort((a, b) => b.elus.length - a.elus.length || a.sigle.localeCompare(b.sigle));
  return (
    <>
      <p className="meta" style={{ marginTop: 0 }}>
        <a href="/groupe">← Tous les groupes</a>
      </p>
      <h1>
        {CHAMBRE_LONG[chambre] : <span className="surligne">{libelle}</span>
      </h1>
      <p className="lead">
        Les {elus.length} élus ayant siégé à {CHAMBRE_LONG[chambre]} pendant la {libelle}, avec, pour chacun, le groupe de l&apos;époque.
      </p>
      {chambre === "senat" && (
        <p className="meta">Série {valeur} du Sénat : {RENOUVELLEMENTS_SERIES[valeur]}.</p>
      )}
      <AutresMandatures mandatures={mandatures} chambre={chambre} actuelle={slug} prefixe={"/groupe/" + CHAMBRE_COURTE[chambre]} />
      {chambre === "senat" && (
        <ScrutinsDeSerie scrutins={scrutins} serie={valeur} prefixe={"/groupe/" + CHAMBRE_COURTE[chambre] + "/" + slug} />
      )}
      {liste.map((s) => (
        <section key={s.sigle}>
          <h2>
            <a href={"/groupe/" + CHAMBRE_COURTE[chambre] + "-" + slugCollectif(s.sigle) + "/"}>
              Groupe {s.libelle || s.sigle} ({s.sigle})
            </a>
            <span className="meta">, {s.elus.length} élu{s.elus.length > 1 ? "s" : ""}</span>
            {s.anciens.size > 0 && <span className="meta">, alors {[...s.anciens].join(", ")}</span>}
          </h2>
          <ListeElus elus={s.elus.map(pourAffichage)} afficher="groupe" />
        </section>
      ))}
      {horsGroupe.length > 0 && (
        <section>
          <h2>
            Sans groupe<span className="meta">, {horsGroupe.length} élu{horsGroupe.length > 1 ? "s" : ""}</span>
          </h2>
          <ListeElus elus={horsGroupe.map(pourAffichage)} afficher="groupe" />
        </section>
      )}
    </>
  );
}

// Un groupe pendant une mandature : les élus du groupe ayant siégé, même
// sous l'ancien nom (FN d'hier sur la fiche RN d'aujourd'hui).
async function GroupeMandature({ slugGroupe, slug }: { slugGroupe: string; slug: string }) {
  const d = decomposerSlugGroupe(slugGroupe);
  if (!d) return <Introuvable cause="Ce groupe n'existe pas (ou plus) : l'adresse ne commence par aucune chambre." />;
  const valeur = mandatureDepuisSlug(d.chambre, slug);
  if (valeur === null) return <Introuvable cause={"La mandature « " + slug + " » n'existe pas pour " + CHAMBRE_LONG[d.chambre] + "."} />;
  const groupes = await groupesExistants().catch((): GroupeExistant[] => []);
  const actuels = groupes.filter((g) => g.chambre === d.chambre).map((g) => g.groupe);
  const resolu = sigleDepuisSlug(d.chambre, d.slugSigle, actuels);
  if (!resolu) return <Introuvable cause="Ce groupe n'existe pas (ou plus) dans cette chambre." />;
  const fiche = groupes.find((g) => g.chambre === d.chambre && g.groupe === resolu.actuel);
  const [elus, mandatures, scrutins] = await Promise.all([
    elusDeMandature(d.chambre, valeur).catch((): EluMandature[] => []),
    mandaturesExistantes().catch((): MandatureExistante[] => []),
    scrutinsExistants().catch((): ScrutinExistant[] => []),
  ]);
  const duGroupe = elus.filter((e) => !sansGroupe(e.sigleEpoque) && harmoniserSigle(d.chambre, e.sigleEpoque) === resolu.actuel);
  if (!duGroupe.length) return <Introuvable cause={"Aucun élu du groupe " + resolu.actuel + " enregistré pour cette mandature."} />;
  const libelle = libelleMandature(d.chambre, valeur) ?? "mandature";
  const anciens = [...new Set(duGroupe.filter((e) => e.sigleEpoque !== resolu.actuel).map((e) => e.sigleEpoque))];
  return (
    <>
      <p className="meta" style={{ marginTop: 0 }}>
        <a href="/groupe">← Tous les groupes</a>
        {" "}<a href={"/groupe/" + slugGroupe + "/"}>← Fiche actuelle du groupe</a>
      </p>
      <h1>
        Groupe <span className="surligne">{fiche?.groupe_libelle || resolu.actuel}</span> : {CHAMBRE_LONG[d.chambre]}, {libelle}
      </h1>
      <p className="lead">
        Les {duGroupe.length} élus du groupe {resolu.actuel} ayant siégé à {CHAMBRE_LONG[d.chambre]} pendant la {libelle},
        avec, pour chacun, le groupe de l&apos;époque.
      </p>
      {anciens.length > 0 && (
        <p className="meta">Nom de l&apos;époque : {anciens.join(", ")} (renommage harmonisé vers {resolu.actuel}).</p>
      )}
      {resolu.ancien && (
        <p className="meta">Adresse « {slugGroupe} » : ancien nom {resolu.ancien}, fiche d&apos;aujourd&apos;hui {resolu.actuel}.</p>
      )}
      <AutresMandatures mandatures={mandatures} chambre={d.chambre} actuelle={slug} prefixe={"/groupe/" + slugGroupe} />
      {d.chambre === "senat" && (
        <ScrutinsDeSerie scrutins={scrutins} serie={valeur} prefixe={"/groupe/" + slugGroupe + "/" + slug} />
      )}
      <ListeElus elus={duGroupe.map(pourAffichage)} afficher="groupe" />
    </>
  );
}
