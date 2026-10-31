import "server-only";
import { dataQueryTout } from "./data";

// Équipes des groupes parlementaires : secrétaires généraux, adjoints et
// collaborateurs de groupe, collectés depuis les sites officiels des groupes
// et les annuaires des assemblées (nouvelle table `equipes_groupes`).
// Au Parlement européen, les assistants « (groupement) » déjà chargés dans
// `affectations` complètent l'équipe : on ne les duplique pas.

export type MembreEquipeGroupe = {
  chambre: string; groupe: string;
  civilite: string | null; prenom: string | null; nom: string;
  fonction: string | null;
  source: string; url_source: string | null; date_source: string | null; confiance: string;
};

export type AssistantGroupement = {
  collab_civilite: string; collab_prenom: string; collab_nom: string; fonction: string;
};

const COLS_EQ = "chambre,groupe,civilite,prenom,nom,fonction,source,url_source,date_source,confiance";

// Équipe nominative d'un groupe dans une chambre (sources publiques vérifiées).
export async function equipeDuGroupe(chambre: string, sigle: string): Promise<MembreEquipeGroupe[]> {
  return dataQueryTout<MembreEquipeGroupe>("equipes_groupes",
    new URLSearchParams({ select: COLS_EQ, actif: "eq.true", chambre: `eq.${chambre}`, groupe: `eq.${sigle}`, order: "nom,prenom" }), 3600);
}

// Assistants du Parlement européen rattachés au groupement (et non à un eurodéputé).
export async function assistantsGroupement(sigle: string): Promise<AssistantGroupement[]> {
  const rows = await dataQueryTout<AssistantGroupement>("affectations",
    new URLSearchParams({
      select: "collab_civilite,collab_prenom,collab_nom,fonction",
      chambre: "eq.europarl",
      elu_groupe: `eq.${sigle}`,
      fonction: "ilike.*(groupement)*",
      order: "collab_nom,collab_prenom",
    }), 3600);
  // Déduplication : les affectations « (groupement) » peuvent exister en
  // plusieurs exemplaires (imports successifs) ; une seule ligne par
  // personne et fonction.
  const vus = new Set<string>();
  const out: AssistantGroupement[] = [];
  for (const r of rows) {
    const cle = `${r.collab_prenom}|${r.collab_nom}|${r.fonction}`.toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    out.push(r);
  }
  return out;
}

// Groupes politiques (Parlement européen) auxquels un collaborateur est
// rattaché par une affectation « (groupement) » : sert aux fiches
// individuelles /collab/<slug> pour nommer et lier le groupe employeur.
export async function groupesDuCollab(collabId: string): Promise<string[]> {
  const rows = await dataQueryTout<{ elu_groupe: string }>("affectations",
    new URLSearchParams({
      select: "elu_groupe",
      or: `(collab_cle.like.${collabId}*,collab_id.eq.${collabId})`,
      chambre: "eq.europarl",
      fonction: "ilike.*(groupement)*",
    }), 3600).catch((): { elu_groupe: string }[] => []);
  return [...new Set(rows.map((r) => r.elu_groupe).filter(Boolean))];
}
