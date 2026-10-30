import type { Metadata } from "next";
import Link from "next/link";
import GrapheReseau, { type NoeudReseau } from "@/app/_components/GrapheReseau";
import Tableur from "@/app/_components/Tableur";
import { structures, pappers, slugStructure, FONCTIONS_STRUCTURES } from "@/lib/structures";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Le réseau des tiers payants et prestataires des eurodéputés français",
  description: "Toutes les structures employées par les eurodéputés français sur un seul graphe : lesquelles sont en lien avec beaucoup d'élus, et quelles interconnections révèlent les eurodéputés qu'elles partagent.",
  alternates: { canonical: "https://www.dataparl.fr/collab/pe/reseau" },
};

type Fonction = keyof typeof FONCTIONS_STRUCTURES;

export default async function Page() {
  const [tp, pr] = await Promise.all([
    structures("Tiers payant" as Fonction),
    structures("Prestataire de services spécialisé" as Fonction),
  ]);

  // Fusion par structure (une même société peut être à la fois tiers payant
  // chez un élu et prestataire chez un autre).
  type S = { cle: string; nom: string; types: string[]; fiche: string; clients: { elu_id: string; elu_nom: string; elu_groupe: string }[] };
  const parCle = new Map<string, S>();
  const ajouter = (liste: Awaited<ReturnType<typeof structures>>, type: string, slug: string) => {
    for (const s of liste) {
      const existante = parCle.get(s.cle);
      if (existante) {
        if (!existante.types.includes(type)) existante.types.push(type);
        existante.clients.push(...s.clients);
        continue;
      }
      parCle.set(s.cle, { cle: s.cle, nom: s.nom, types: [type], fiche: "/collab/pe/" + slug + "/" + slugStructure(s.nom), clients: [...s.clients] });
    }
  };
  ajouter(tp, "Tiers payant", FONCTIONS_STRUCTURES["Tiers payant" as Fonction].slug);
  ajouter(pr, "Prestataire", FONCTIONS_STRUCTURES["Prestataire de services spécialisé" as Fonction].slug);
  const toutes = [...parCle.values()].sort((a, b) => b.clients.length - a.clients.length);

  // Identification SIREN de chaque structure (appariement prudent, cache 24 h).
  const siren: Record<string, Awaited<ReturnType<typeof pappers>>> = {};
  for (const s of toutes) siren[s.cle] = await pappers(s.nom);

  // Nœuds eurodéputés (dédupliqués) et arêtes structure-élu.
  const elus = new Map<string, { elu_nom: string; elu_groupe: string; contrats: number }>();
  const aretes: { source: string; target: string }[] = [];
  for (const s of toutes) {
    for (const c of s.clients) {
      const e = elus.get(c.elu_id);
      if (e) e.contrats += 1;
      else elus.set(c.elu_id, { elu_nom: c.elu_nom, elu_groupe: c.elu_groupe, contrats: 1 });
      aretes.push({ source: s.cle, target: c.elu_id });
    }
  }

  const noeuds: NoeudReseau[] = [
    ...toutes.map((s) => ({
      id: s.cle, label: s.nom, type: "structure" as const,
      poids: s.clients.length, href: s.fiche,
    })),
    ...[...elus.entries()].map(([id, e]) => ({
      id, label: e.elu_nom, type: "elu" as const,
      groupe: e.elu_groupe || undefined, poids: e.contrats,
      href: "/parlementaires/" + encodeURIComponent(id),
    })),
  ];

  const multi = [...elus.values()].filter((e) => e.contrats >= 2).length;
  const TOP = toutes.filter((s) => s.clients.length >= 5).length;

  const entetes = ["Structure", "Type", "Eurodéputés clients", "SIREN"];
  const donnees = toutes.map((s) => [
    s.nom,
    s.types.join(" + "),
    s.clients.length,
    siren[s.cle]?.siren || "non identifiée",
  ]);
  const liens = toutes.map((s) => [s.fiche, null, null, null]);

  return (
    <>
      <p className="meta">
        <Link href={"/collab/pe/" + FONCTIONS_STRUCTURES["Tiers payant" as Fonction].slug}>Tiers payants</Link>,{" "}
        <Link href={"/collab/pe/" + FONCTIONS_STRUCTURES["Prestataire de services spécialisé" as Fonction].slug}>Prestataires</Link>, Parlement européen
      </p>
      <h1>Le réseau des tiers payants et prestataires</h1>
      <p className="lead">
        {toutes.length} structures, {elus.size} eurodéputés français, {aretes.length} contrats, sur un seul graphe.
        Les structures en lien avec beaucoup d&apos;élus apparaissent en haut du classement ; et quand un même
        eurodéputé emploie plusieurs structures, il fait le pont entre elles : c&apos;est là que se lisent les
        interconnections. {TOP} structure(s) comptent au moins 5 clients ; {multi} eurodéputé(s) en emploient plusieurs.
      </p>
      <GrapheReseau noeuds={noeuds} aretes={aretes} />
      <p className="meta">
        Export :{" "}
        <a href="https://media.dataparl.fr/assets/pe/reseau">graphe SVG (media.dataparl.fr/assets/pe/reseau)</a>
        {", "}
        <a href="https://media.dataparl.fr/assets/pe/reseau?telecharger=1">télécharger le fichier</a>
        {" : données ouvertes DataParl&apos;, rafraîchies toutes les heures."}
      </p>
      <h2>Classement des structures</h2>
      <Tableur
        id="reseau-structures"
        titre="Structures par nombre d'eurodéputés clients"
        description=""
        provenance="Table affectations (API DataParl'/Supabase), registre des entreprises (Pappers)"
        entetes={entetes}
        donnees={donnees}
        liens={liens}
        lectureSeule
      />
      <p className="meta">
        Identification SIREN automatique (appariement prudent : « non identifiée » quand plusieurs sociétés
        homonymes actives existent). Chaque structure ouvre sa fiche détaillée ; chaque eurodéputé du graphe
        ouvre la sienne.
      </p>
    </>
  );
}
