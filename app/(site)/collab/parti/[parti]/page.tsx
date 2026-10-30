import type { Metadata } from "next";
import TableauCollabs, { type LigneCollab } from "../../TableauCollabs";
import { elusDuParti, partisExistants } from "@/lib/collectifsData";
import { partiDepuisSlug, slugCollectif } from "@/lib/collectifs";
import { libelleParti, nomCompletParti } from "@/lib/partisNoms";
import { dataQueryTout } from "@/lib/data";

export const revalidate = 86400;
type Props = { params: Promise<{ parti: string }> };

// /collab/parti/<parti> : les collaborateurs parlementaires en poste chez les
// élus d'un parti, toutes chambres confondues ; chaque ligne : collaborateur,
// élu employeur, fonction. Le titre et le H1 portent le nom complet du parti.
type Periode = { collab_id: string; elu_nom: string; fonction: string };
type Collab = { collab_id: string; nom: string; prenom: string };

function norm(s: string): string {
  return (s ?? "").normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).parti;
  const sigle = partiDepuisSlug(slug, await partisExistants().catch((): string[] => []));
  if (!sigle) return { title: "Parti" };
  const complet = nomCompletParti(sigle);
  return {
    title: "Collaborateurs des élus du " + complet + " : la liste complète",
    description: "Les collaborateurs parlementaires en poste chez les élus du " + complet + " (Assemblée nationale, Sénat, Parlement européen) : nom, élu employeur et fonction de chacun.",
    alternates: { canonical: "/collab/parti/" + slug },
  };
}

export default async function CollabDuParti({ params }: Props) {
  const slug = (await params).parti;
  const sigle = partiDepuisSlug(slug, await partisExistants().catch((): string[] => []));
  if (!sigle) {
    return (
      <>
        <p className="meta"><a href="/collab/parti">&larr; Collaborateurs par parti</a></p>
        <h1>Parti introuvable</h1>
        <p className="lead">Ce parti n&apos;a pas (ou plus) d&apos;élu actif enregistré. <a href="/collab/parti">Voir tous les partis</a>.</p>
      </>
    );
  }
  const complet = nomCompletParti(sigle);
  const [elus, periodes, collabs] = await Promise.all([
    elusDuParti(sigle).catch(() => []),
    dataQueryTout<Periode>("periodes",
      new URLSearchParams({ select: "collab_id,elu_nom,fonction", en_cours: "eq.true", order: "elu_nom" }), 3600).catch((): Periode[] => []),
    dataQueryTout<Collab>("collaborateurs",
      new URLSearchParams({ select: "collab_id,nom,prenom" }), 3600).catch((): Collab[] => []),
  ]);
  const nomsElus = new Set<string>();
  for (const e of elus) { nomsElus.add(norm(e.prenom + " " + e.nom)); nomsElus.add(norm(e.nom + " " + e.prenom)); }
  const noms = new Map(collabs.map((c) => [c.collab_id, [c.prenom, c.nom].filter(Boolean).join(" ")]));
  const lignes: LigneCollab[] = periodes
    .filter((p) => nomsElus.has(norm(p.elu_nom)))
    .map((p) => ({ nom: noms.get(p.collab_id) ?? "", elu: p.elu_nom, fonction: p.fonction || "" }))
    .filter((l) => l.nom !== "");
  const maj = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return (
    <>
      <p className="meta">
        <a href="/collab/parti">&larr; Collaborateurs par parti</a>, <a href="/collab">&larr; Tous les collaborateurs</a>
      </p>
      <h1>Les collaborateurs des élus du <span className="surligne">{complet}</span>{complet !== sigle ? <span className="meta"> ({sigle})</span> : null}</h1>
      <p className="lead">
        {lignes.length.toLocaleString("fr-FR")} collaborateur{lignes.length > 1 ? "s" : ""} parlementaire{lignes.length > 1 ? "s" : ""} en poste
        chez les {elus.length} élu{elus.length > 1 ? "s" : ""} du {libelleParti(sigle)}, toutes chambres confondues : nom de chacun,
        élu employeur et fonction. La fiche des élus du parti :{" "}
        <a href={"/parti/" + slugCollectif(sigle)}>élus du {complet}</a>.
      </p>
      {lignes.length === 0 ? (
        <p className="meta">Aucun collaborateur en poste enregistré pour ce parti pour l&apos;instant.</p>
      ) : (
        <TableauCollabs rows={lignes} mode="table" />
      )}
      <p className="meta">
        Listes établies à partir des publications officielles des trois chambres, mises à jour quotidiennement,
        page générée le {maj}. Les groupes parlementaires ont aussi leur fiche :{" "}
        <a href="/groupe">voir tous les groupes</a>.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "Collaborateurs des élus du " + complet,
            description: "Liste des collaborateurs parlementaires en poste chez les élus du " + complet + " : nom, élu employeur et fonction, mise à jour quotidienne.",
            url: "https://www.dataparl.fr/collab/parti/" + slug,
            creator: { "@type": "Organization", name: "DataParl'", url: "https://www.dataparl.fr" },
            isAccessibleForFree: true,
          }),
        }}
      />
    </>
  );
}
