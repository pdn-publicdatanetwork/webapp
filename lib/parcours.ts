import "server-only";
import { prenomNom, nomAffiche } from "./format";
import { chevauche, fusionner } from "./periodes";
import {
  appartenancesDe, collaborateursParId, parlementairesParElu, periodesCollab, periodesElu, personne,
  type Appartenance, type Parlementaire, type Periode,
} from "./referentiel";

// Parcours enrichis : pour chaque période, l'élu (fiche, groupe à l'époque)
// et ses commissions pendant la période.

export type PeriodeEnrichie = Periode & {
  elu: { nom: string; slug: string | null; photo: string | null; circonscription: string };
  groupe: string;
  commissions: { libelle: string; fonction: string }[];
};

function enrichir(periodes: Periode[], fiches: Parlementaire[], apps: Appartenance[]): PeriodeEnrichie[] {
  const parElu = new Map(fiches.map((f) => [`${f.chambre}|${f.elu_id}`, f]));
  return periodes.map((p) => {
    const f = p.elu_id ? parElu.get(`${p.chambre}|${p.elu_id}`) : undefined;
    const intervalle = { debut: p.debut, fin: p.en_cours ? "" : p.fin };
    const pendant = f ? apps.filter((a) => a.personne_id === f.personne_id && a.chambre === p.chambre && chevauche(a, intervalle, 7)) : [];
    const groupes = pendant.filter((a) => a.type === "groupe").sort((a, b) => b.debut.localeCompare(a.debut));
    const commissions = fusionner(pendant.filter((a) => a.type !== "groupe"))
      .sort((a, b) => (a.type === "commission" ? 0 : 1) - (b.type === "commission" ? 0 : 1) || b.debut.localeCompare(a.debut));
    const uniques = [...new Map(commissions.map((c) => [c.libelle, { libelle: c.libelle, fonction: c.fonction }])).values()];
    return {
      ...p,
      elu: {
        nom: f
          ? prenomNom(f.prenom, f.nom)
          : p.elu_nom
            ? nomAffiche(p.elu_nom)
            : /groupement/i.test(p.fonction ?? "")
              ? "groupe politique (groupement)"
              : "",
        slug: f?.slug ?? null, photo: f?.photo_url ?? null, circonscription: f?.circonscription ?? "",
      },
      groupe: groupes[0]?.sigle || f?.groupe || "",
      commissions: uniques.slice(0, 6),
    };
  });
}

export async function parcoursCollab(collabId: string): Promise<PeriodeEnrichie[]> {
  const periodes = await periodesCollab(collabId);
  const fiches = await parlementairesParElu(periodes);
  const apps = fiches.length ? await appartenancesDe(fiches.map((f) => f.personne_id)) : [];
  const groupes = fiches.length ? await groupesDe(fiches.map((f) => f.personne_id)) : [];
  return enrichir(periodes, fiches, [...apps, ...groupes]);
}

async function groupesDe(personneIds: string[]): Promise<Appartenance[]> {
  const { dataQueryTout } = await import("./data");
  const ids = [...new Set(personneIds)];
  const out: Appartenance[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    out.push(...(await dataQueryTout<Appartenance>("appartenances",
      new URLSearchParams({ select: "*", personne_id: `in.(${ids.slice(i, i + 100).join(",")})`, type: "eq.groupe" }))));
  }
  return out;
}

export type LigneEquipe = PeriodeEnrichie & { collab: { nom: string; slug: string; genre: string } };

// Tous les collaborateurs d'un élu, toutes chambres confondues.
export async function parcoursElu(personneId: string): Promise<LigneEquipe[]> {
  const { fiches, appartenances } = await personne(personneId);
  const periodes = await periodesElu(fiches);
  const collabs = new Map((await collaborateursParId([...new Set(periodes.map((p) => p.collab_id))])).map((c) => [c.collab_id, c]));
  return enrichir(periodes, fiches, appartenances).map((p) => {
    const c = collabs.get(p.collab_id);
    return { ...p, collab: { nom: c ? prenomNom(c.prenom, c.nom) : "", slug: c?.slug ?? "", genre: c?.genre ?? "X" } };
  });
}
