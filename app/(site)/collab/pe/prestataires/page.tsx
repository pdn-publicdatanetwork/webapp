import type { Metadata } from "next";
import Link from "next/link";
import Tableur from "@/app/_components/Tableur";
import { structures, pappers, FONCTIONS_STRUCTURES, slugStructure } from "@/lib/structures";

export const revalidate = 3600;

const F = FONCTIONS_STRUCTURES["Prestataire de services spécialisé" as const];
const BASE = "/collab/pe/" + F.slug;

export const metadata: Metadata = {
  title: "Prestataires de services spécialisés du Parlement européen : quelles sociétés gèrent les contrats des eurodéputés français",
  description: "Liste des prestataires de services employés par les eurodéputés français au Parlement européen : sociétés, forme juridique, SIREN et clients parlementaires.",
  alternates: { canonical: "https://www.dataparl.fr" + BASE },
};

export default async function Page() {
  const liste = await structures("Prestataire de services spécialisé" as keyof typeof FONCTIONS_STRUCTURES);
  const siren: Record<string, (Awaited<ReturnType<typeof pappers>>)> = {};
  for (const s of liste.slice(0, 100)) {
    siren[s.cle] = await pappers(s.nom);
  }
  const nClients = new Set(liste.flatMap((s) => s.clients.map((c) => c.elu_id))).size;
  const entetes = ["Structure", "Eurodéputés clients", "Forme juridique", "SIREN"];
  const donnees = liste.map((s) => {
    const info = siren[s.cle];
    return [s.nom, s.clients.length, info?.forme_juridique || "non identifiée", info?.siren || "non identifiée"];
  });
  const liens = liste.map((s) => [BASE + "/" + slugStructure(s.nom), null, null, null]);
  return (
    <>
      <p className="meta">Parlement européen, eurodéputés français</p>
      <h1>{F.titre}</h1>
      <p className="lead">
        {F.definition} DataParl&apos; recense ici toutes les structures employées par les {nClients} eurodéputés
        français suivis : une information publique mais jamais agrégée jusqu&apos;ici, au-delà de la page « assistants »
        du Parlement européen.
      </p>
      <Tableur
        id={F.slug}
        titre={F.titre}
        description=""
        provenance="Table affectations (API DataParl'/Supabase), registre des entreprises (Pappers)"
        entetes={entetes}
        donnees={donnees}
        liens={liens}
        lectureSeule
      />
      <p className="meta">
        Suivi quotidien depuis le 8 octobre 2026 ; les arrivées et départs de structures apparaissent dans les{" "}
        <Link href="/mouvements/europarl">mouvements du Parlement européen</Link>. Identification SIREN via le registre
        des entreprises (Pappers) pour les structures appariées. Le nom de chaque structure ouvre sa fiche détaillée :
        eurodéputés clients en graphe relationnel, identification SIREN et mouvements.{" "}
        <Link href="/collab/pe/reseau">Voir le réseau global des structures →</Link>
      </p>
    </>
  );
}
