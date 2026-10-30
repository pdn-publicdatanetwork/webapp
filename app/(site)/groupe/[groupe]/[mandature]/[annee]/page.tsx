import type { Metadata } from "next";
import Link from "next/link";
import ListeElus, { CHAMBRE_LONG } from "@/app/_components/ListeElus";
import { elusDuScrutin, scrutinsExistants, type EluMandature, type ScrutinExistant } from "@/lib/mandaturesData";
import { groupesExistants } from "@/lib/collectifsData";
import type { EluCollectif } from "@/lib/collectifsData";
import { CHAMBRE_COURTE, decomposerSlugGroupe, sansGroupe, slugCollectif, type GroupeExistant } from "@/lib/collectifs";
import { harmoniserSigle, mandatureDepuisSlug, SCRUTINS_SENAT, sigleDepuisSlug } from "@/lib/mandatures";

// Pages « par scrutin de renouvellement » du Sénat : les sénateurs élus lors
// d'un scrutin (/groupe/senat/serie-1/2023), chambre entière ou par groupe
// (/groupe/senat-lr/serie-1/2023). Comme pour les mandatures, le groupe
// affiché est celui de l'époque et les renommages sont harmonisés ; une page
// n'existe que si des mandats élus cette année-là sont enregistrés.

export const revalidate = 86400;
type Props = { params: Promise<{ groupe: string; mandature: string; annee: string }> };

const CHAMBRE_DEPUIS_SLUG: Record<string, string> = {};
for (const [chambre, courte] of Object.entries(CHAMBRE_COURTE)) CHAMBRE_DEPUIS_SLUG[courte] = chambre;

function Introuvable({ cause }: { cause: string }) {
  return (
    <>
      <h1>Scrutin introuvable</h1>
      <p className="lead">{cause}</p>
      <p><Link className="btn secondaire" href="/groupe">Voir tous les groupes</Link></p>
    </>
  );
}

// Affichage d'un élu avec son groupe de l'époque (et non d'aujourd'hui).
function pourAffichage(e: EluMandature): EluCollectif {
  return { ...e, groupe: e.sigleEpoque || e.groupe, groupe_libelle: e.groupeLibelleEpoque || e.groupe_libelle };
}

// Les autres scrutins de la même série (ceux qui ont des élus enregistrés).
function AutresScrutins({ scrutins, serie, actuel, prefixe }: { scrutins: ScrutinExistant[]; serie: number; actuel: number; prefixe: string }) {
  const autres = scrutins.filter((s) => s.serie === serie && s.annee !== actuel);
  if (!autres.length) return null;
  return (
    <p className="meta">
      {"Autres scrutins de la série : "}
      {autres.map((s, i) => (
        <span key={s.annee}>
          {i > 0 ? ", " : ""}
          <Link href={prefixe + "/" + s.annee}>{s.annee}</Link>
        </span>
      ))}
    </p>
  );
}

function anneeValide(slug: string): number | null {
  return /^\d{4}$/.test(slug ?? "") ? Number(slug) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupe: slugGroupe, mandature: slugMandature, annee: slugAnnee } = await params;
  const chambre = CHAMBRE_DEPUIS_SLUG[slugGroupe] ?? decomposerSlugGroupe(slugGroupe)?.chambre ?? "";
  const serie = chambre ? mandatureDepuisSlug(chambre, slugMandature) : null;
  const annee = anneeValide(slugAnnee);
  if (chambre !== "senat" || serie === null || annee === null) return { title: "Scrutin" };
  const scrutin = SCRUTINS_SENAT.find((s) => s.serie === serie && s.annee === annee);
  if (CHAMBRE_DEPUIS_SLUG[slugGroupe]) {
    return {
      title: "Sénat : scrutin de " + annee + (scrutin ? " (" + scrutin.date + ")" : ""),
      alternates: { canonical: "/groupe/senat/" + slugMandature + "/" + slugAnnee },
    };
  }
  const d = decomposerSlugGroupe(slugGroupe);
  if (!d || d.chambre !== "senat") return { title: "Scrutin" };
  const groupes = await groupesExistants().catch((): GroupeExistant[] => []);
  const resolu = sigleDepuisSlug(d.chambre, d.slugSigle, groupes.filter((g) => g.chambre === d.chambre).map((g) => g.groupe));
  const nom = resolu ? (groupes.find((g) => g.chambre === d.chambre && g.groupe === resolu.actuel)?.groupe_libelle ?? resolu.actuel) : "groupe";
  return {
    title: "Groupe " + nom + " : scrutin de " + annee,
    alternates: { canonical: "/groupe/" + slugGroupe + "/" + slugMandature + "/" + slugAnnee },
  };
}

export default async function PageScrutin({ params }: Props) {
  const { groupe: slugGroupe, mandature: slugMandature, annee: slugAnnee } = await params;
  const chambre = CHAMBRE_DEPUIS_SLUG[slugGroupe];
  if (chambre) {
    if (chambre !== "senat") {
      return <Introuvable cause="Les pages par scrutin de renouvellement n'existent que pour le Sénat : l'Assemblée nationale et le Parlement européen suivent des législatures numérotées." />;
    }
    return <ScrutinChambre slugMandature={slugMandature} slugAnnee={slugAnnee} />;
  }
  return <GroupeScrutin slugGroupe={slugGroupe} slugMandature={slugMandature} slugAnnee={slugAnnee} />;
}

// Tout le Sénat lors d'un scrutin : les élus regroupés par groupe de
// l'époque, renommages harmonisés, tri par effectif.
async function ScrutinChambre({ slugMandature, slugAnnee }: { slugMandature: string; slugAnnee: string }) {
  const serie = mandatureDepuisSlug("senat", slugMandature);
  const annee = anneeValide(slugAnnee);
  if (serie === null) return <Introuvable cause={"La série « " + slugMandature + " » n'existe pas (serie-1 ou serie-2)."} />;
  if (annee === null) return <Introuvable cause={"L'année « " + slugAnnee + " » n'est pas valide."} />;
  const scrutin = SCRUTINS_SENAT.find((s) => s.serie === serie && s.annee === annee);
  if (!scrutin) {
    return <Introuvable cause={"Aucun scrutin de la série " + serie + " n'a eu lieu en " + annee + " depuis 2010. Les scrutins connus : " + SCRUTINS_SENAT.filter((s) => s.serie === serie).map((s) => s.annee).join(", ") + "."} />;
  }
  const [elus, scrutins] = await Promise.all([
    // mandatureDepuisSlug valide déjà serie-1 / serie-2 : la série est 1 ou 2.
    elusDuScrutin(serie as 1 | 2, annee).catch((): EluMandature[] => []),
    scrutinsExistants().catch((): ScrutinExistant[] => []),
  ]);
  if (!elus.length) {
    return <Introuvable cause={"Aucun élu enregistré pour le scrutin du " + scrutin.date + " : les pages suivent les mandats réellement enregistrés."} />;
  }
  const sections = new Map<string, { sigle: string; libelle: string; elus: EluMandature[]; anciens: Set<string> }>();
  let horsGroupe: EluMandature[] = [];
  for (const e of elus) {
    if (sansGroupe(e.sigleEpoque)) { horsGroupe.push(e); continue; }
    const sigle = harmoniserSigle("senat", e.sigleEpoque);
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
        {" "}<a href={"/groupe/senat/" + slugMandature}>← Série {serie}</a>
      </p>
      <h1>
        Sénat : <span className="surligne">scrutin de {annee}</span>
      </h1>
      <p className="lead">
        Les {elus.length} sénateurs élus lors du scrutin du {scrutin.date} (série {serie}, {scrutin.sieges} sièges renouvelés),
        avec, pour chacun, le groupe de l&apos;époque.
      </p>
      <AutresScrutins scrutins={scrutins} serie={serie} actuel={annee} prefixe={"/groupe/senat/" + slugMandature} />
      {liste.map((s) => (
        <section key={s.sigle}>
          <h2>
            <a href={"/groupe/senat-" + slugCollectif(s.sigle) + "/"}>
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

// Un groupe lors d'un scrutin : les élus du groupe élus ce scrutin-là,
// même sous l'ancien nom (UMP d'hier sur la fiche LR d'aujourd'hui).
async function GroupeScrutin({ slugGroupe, slugMandature, slugAnnee }: { slugGroupe: string; slugMandature: string; slugAnnee: string }) {
  const d = decomposerSlugGroupe(slugGroupe);
  if (!d || d.chambre !== "senat") {
    return <Introuvable cause="Les pages par scrutin de renouvellement n'existent que pour le Sénat : l'Assemblée nationale et le Parlement européen suivent des législatures numérotées." />;
  }
  const serie = mandatureDepuisSlug("senat", slugMandature);
  const annee = anneeValide(slugAnnee);
  if (serie === null) return <Introuvable cause={"La série « " + slugMandature + " » n'existe pas (serie-1 ou serie-2)."} />;
  if (annee === null) return <Introuvable cause={"L'année « " + slugAnnee + " » n'est pas valide."} />;
  const scrutin = SCRUTINS_SENAT.find((s) => s.serie === serie && s.annee === annee);
  if (!scrutin) {
    return <Introuvable cause={"Aucun scrutin de la série " + serie + " n'a eu lieu en " + annee + " depuis 2010."} />;
  }
  const groupes = await groupesExistants().catch((): GroupeExistant[] => []);
  const actuels = groupes.filter((g) => g.chambre === "senat").map((g) => g.groupe);
  const resolu = sigleDepuisSlug("senat", d.slugSigle, actuels);
  if (!resolu) return <Introuvable cause="Ce groupe n'existe pas (ou plus) au Sénat." />;
  const fiche = groupes.find((g) => g.chambre === "senat" && g.groupe === resolu.actuel);
  const [elus, scrutins] = await Promise.all([
    // mandatureDepuisSlug valide déjà serie-1 / serie-2 : la série est 1 ou 2.
    elusDuScrutin(serie as 1 | 2, annee).catch((): EluMandature[] => []),
    scrutinsExistants().catch((): ScrutinExistant[] => []),
  ]);
  const duGroupe = elus.filter((e) => !sansGroupe(e.sigleEpoque) && harmoniserSigle("senat", e.sigleEpoque) === resolu.actuel);
  if (!duGroupe.length) {
    return <Introuvable cause={"Aucun élu du groupe " + resolu.actuel + " enregistré pour le scrutin du " + scrutin.date + "."} />;
  }
  const anciens = [...new Set(duGroupe.filter((e) => e.sigleEpoque !== resolu.actuel).map((e) => e.sigleEpoque))];
  return (
    <>
      <p className="meta" style={{ marginTop: 0 }}>
        <a href="/groupe">← Tous les groupes</a>
        {" "}<a href={"/groupe/" + slugGroupe + "/"}>← Fiche actuelle du groupe</a>
        {" "}<a href={"/groupe/" + slugGroupe + "/" + slugMandature}>← Série {serie}</a>
      </p>
      <h1>
        Groupe <span className="surligne">{fiche?.groupe_libelle || resolu.actuel}</span> : Sénat, scrutin de {annee}
      </h1>
      <p className="lead">
        Les {duGroupe.length} sénateurs du groupe {resolu.actuel} élus lors du scrutin du {scrutin.date} (série {serie},
        {scrutin.sieges} sièges renouvelés), avec, pour chacun, le groupe de l&apos;époque.
      </p>
      {anciens.length > 0 && (
        <p className="meta">Nom de l&apos;époque : {anciens.join(", ")} (renommage harmonisé vers {resolu.actuel}).</p>
      )}
      {resolu.ancien && (
        <p className="meta">Adresse « {slugGroupe} » : ancien nom {resolu.ancien}, fiche d&apos;aujourd&apos;hui {resolu.actuel}.</p>
      )}
      <AutresScrutins scrutins={scrutins} serie={serie} actuel={annee} prefixe={"/groupe/" + slugGroupe + "/" + slugMandature} />
      <ListeElus elus={duGroupe.map(pourAffichage)} afficher="groupe" />
    </>
  );
}
