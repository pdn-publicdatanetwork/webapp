import type { Metadata } from "next";
import { partisExistants } from "@/lib/collectifsData";
import { slugCollectif } from "@/lib/collectifs";
import { libelleParti } from "@/lib/partisNoms";
import { dataQueryTout } from "@/lib/data";

export const revalidate = 86400;

// /collab/parti : la liste des collaborateurs par parti politique, toutes
// chambres confondues. Chaque intitulé porte le nom complet du parti, pas
// seulement le sigle : c'est la requête des internautes.
export const metadata: Metadata = {
  title: "Collaborateurs des élus de chaque parti : la liste par parti",
  description: "Les collaborateurs parlementaires des élus du Rassemblement National, de Renaissance, des Républicains, de La France insoumise… : pour chaque parti, la liste élu employeur par élu employeur.",
  alternates: { canonical: "/collab/parti" },
};

type Periode = { collab_id: string; elu_nom: string };
type Fiche = { prenom: string; nom: string; groupe: string };

// Comparaison de noms insensible à la casse, aux accents et à la ponctuation
// (les publications officielles écrivent « Prénom Nom » ou « Nom, Prénom »).
function norm(s: string): string {
  return (s ?? "").normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
}

export default async function CollabParParti() {
  const [partis, fiches, periodes] = await Promise.all([
    partisExistants().catch((): string[] => []),
    dataQueryTout<Fiche>("parlementaires",
      new URLSearchParams({ select: "prenom,nom,groupe", actif: "eq.true" }), 3600).catch((): Fiche[] => []),
    dataQueryTout<Periode>("periodes",
      new URLSearchParams({ select: "collab_id,elu_nom", en_cours: "eq.true" }), 3600).catch((): Periode[] => []),
  ]);
  // Nom d'élu (normalisé, dans les deux ordres) -> sigle de parti.
  const partiDe = new Map<string, string>();
  for (const f of fiches) {
    if (!f.groupe) continue;
    partiDe.set(norm(f.prenom + " " + f.nom), f.groupe);
    partiDe.set(norm(f.nom + " " + f.prenom), f.groupe);
  }
  const parParti = new Map<string, number>();
  for (const p of periodes) {
    const sigle = partiDe.get(norm(p.elu_nom));
    if (sigle) parParti.set(sigle, (parParti.get(sigle) ?? 0) + 1);
  }
  return (
    <>
      <p className="meta"><a href="/collab">&larr; Tous les collaborateurs</a></p>
      <h1>Collaborateurs <span className="surligne">par parti politique</span></h1>
      <p className="lead">
        La liste des collaborateurs parlementaires de chaque parti, toutes chambres confondues : pour chaque
        parti, les collaborateurs en poste chez ses députés, sénateurs et députés européens, avec l&apos;élu
        employeur et la fonction de chacun. Les fiches des élus par parti :{" "}
        <a href="/parti">voir tous les partis, par élu</a>.
      </p>
      <ul className="liste-deps">
        {partis.map((p) => (
          <li key={p}>
            <a href={"/collab/parti/" + slugCollectif(p)}>{"Collaborateurs des élus du " + libelleParti(p)}</a>
            <span className="meta">{" (" + (parParti.get(p) ?? 0).toLocaleString("fr-FR") + " collaborateur" + ((parParti.get(p) ?? 0) > 1 ? "s" : "") + " en poste)"}</span>
          </li>
        ))}
      </ul>
      {partis.length === 0 && <p className="meta">Aucun parti actif enregistré pour l&apos;instant.</p>}
      <p className="meta">
        Comptages établis d&apos;après les équipes en poste suivies quotidiennement par DataParl&apos;.
        Exports bruts par chambre :{" "}
        <a href="https://media.dataparl.fr/assets/collab/an.csv">Assemblée nationale (CSV)</a>,{" "}
        <a href="https://media.dataparl.fr/assets/collab/senat.csv">Sénat (CSV)</a>,{" "}
        <a href="https://media.dataparl.fr/assets/collab/pe.csv">Parlement européen (CSV)</a>.
      </p>
    </>
  );
}
