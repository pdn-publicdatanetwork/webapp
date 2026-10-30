import "server-only";
import { dataQuery, dataQueryTout, COLONNES_PUBLIQUES } from "./data";
import { PREMIERE_ANNEE, turnoverAnnuel } from "./stats";

// DataParl' Sheets : tableur en ligne maison, open source. Chaque feuille lit
// directement les données via l'API Supabase de DataParl' (lecture publique,
// licence ODbL), sans export ni intermédiaire. La liste des feuilles
// disponibles est déclarée ici.

export type Genre = "texte" | "entier" | "decimal" | "pourcent";
export type Colonne = { cle: string; label: string; genre: Genre; largeur?: number };
export type Ligne = Record<string, string | number | null>;
export type FeuilleDef = {
  id: string;
  titre: string;
  description: string;
  provenance: string; // source affichée sous le titre
  colonnes: Colonne[];
  charger: () => Promise<Ligne[]>;
};

const CHAMBRE_LONG: Record<string, string> = { assemblee: "Assemblée nationale", senat: "Sénat", europarl: "Parlement européen" };
const n = (x: number) => x.toLocaleString("fr-FR");

export const FEUILLES: FeuilleDef[] = [
  {
    id: "vigiparl-annual-chart",
    titre: "Renouvellement annuel des équipes",
    description: "Effectifs au 1er janvier, arrivées et départs comptés ou exclus (fin ou début de mandat), taux de renouvellement : année par année, chambre par chambre.",
    provenance: "Table stats_annuelles (API DataParl'/Supabase), méthode VigiParl'",
    colonnes: [
      { cle: "an", label: "Année", genre: "entier" },
      { cle: "chambre", label: "Chambre", genre: "texte" },
      { cle: "effectif", label: "Effectif 1er janv.", genre: "entier" },
      { cle: "effectif_suivant", label: "Effectif 1er janv. suivant", genre: "entier" },
      { cle: "arrivees", label: "Arrivées comptées", genre: "entier" },
      { cle: "arrivees_debut_mandat", label: "Arrivées exclues (début de mandat)", genre: "entier" },
      { cle: "departs", label: "Départs comptés", genre: "entier" },
      { cle: "departs_fin_mandat", label: "Départs exclus (fin de mandat)", genre: "entier" },
      { cle: "taux", label: "Taux", genre: "pourcent" },
    ],
    charger: async () => {
      const rows = await dataQueryTout<{ an: number; chambre: string; effectif: number; effectif_suivant: number; arrivees: number | null; arrivees_debut_mandat: number | null; departs: number; departs_fin_mandat: number | null }>(
        "stats_annuelles", new URLSearchParams({ select: "an,chambre,effectif,effectif_suivant,arrivees,arrivees_debut_mandat,departs,departs_fin_mandat", order: "chambre,an" }),
      );
      return rows
        .filter((r) => r.an >= (PREMIERE_ANNEE[r.chambre] ?? 0))
        .map((r) => ({
          an: r.an, chambre: CHAMBRE_LONG[r.chambre] ?? r.chambre, effectif: r.effectif, effectif_suivant: r.effectif_suivant,
          arrivees: r.arrivees ?? 0, arrivees_debut_mandat: r.arrivees_debut_mandat ?? 0,
          departs: r.departs, departs_fin_mandat: r.departs_fin_mandat ?? 0,
          taux: (() => { const t = turnoverAnnuel(r as never); return t === null ? null : t; })(),
        }));
    },
  },
  {
    id: "mixiparl-annual-chart",
    titre: "Mixité annuelle des équipes",
    description: "Nombre d'équipes, équipes non mixtes et taux de mixité moyen (100 % à 50/50) : année par année, chambre par chambre.",
    provenance: "Vue stats_mixite_annuelle (API DataParl'/Supabase), méthode MixiParl'",
    colonnes: [
      { cle: "an", label: "Année", genre: "entier" },
      { cle: "chambre", label: "Chambre", genre: "texte" },
      { cle: "equipes", label: "Équipes", genre: "entier" },
      { cle: "equipes_exclues", label: "Équipes exclues", genre: "entier" },
      { cle: "non_mixtes", label: "Équipes non mixtes", genre: "entier" },
      { cle: "mixite_moyenne", label: "Taux de mixité moyen", genre: "pourcent" },
    ],
    charger: async () => {
      const rows = await dataQueryTout<{ an: number; chambre: string; equipes: number; equipes_exclues: number; non_mixtes: number; mixite_moyenne: number }>(
        "stats_mixite_annuelle", new URLSearchParams({ select: "*", order: "chambre,an" }),
      );
      return rows.map((r) => ({ ...r, chambre: CHAMBRE_LONG[r.chambre] ?? r.chambre }));
    },
  },
  {
    id: "gouvernements-2017-2026",
    titre: "Membres des gouvernements 2017 → aujourd'hui",
    description: "Premier ministre, ministres, ministres délégués et secrétaires d'État de chaque gouvernement, une ligne par personne et par période.",
    provenance: "Table ministres (API DataParl'/Supabase), JORF et archives",
    colonnes: [
      { cle: "debut", label: "Début", genre: "texte" },
      { cle: "fin", label: "Fin", genre: "texte" },
      { cle: "civilite", label: "Civ.", genre: "texte" },
      { cle: "prenom", label: "Prénom", genre: "texte" },
      { cle: "nom", label: "Nom", genre: "texte" },
      { cle: "fonction", label: "Fonction", genre: "texte" },
      { cle: "portefeuille", label: "Portefeuille", genre: "texte" },
      { cle: "gouvernement", label: "Gouvernement", genre: "texte" },
      { cle: "rang", label: "Rang", genre: "texte" },
      { cle: "source", label: "Source", genre: "texte" },
    ],
    charger: async () => {
      const rows = await dataQueryTout<{ debut: string; fin: string | null; civilite: string; prenom: string; nom: string; fonction: string; portefeuille: string | null; gouvernement: string; rang: string; source: string }>(
        "ministres", new URLSearchParams({ select: "debut,fin,civilite,prenom,nom,fonction,portefeuille,gouvernement,rang,source", order: "debut.desc,nom.asc" }),
      );
      return rows.map((r) => ({ ...r, fin: r.fin ?? "en fonction" }));
    },
  },
  {
    id: "parlementaires",
    titre: "Parlementaires (2017 → aujourd'hui)",
    description: "Députés, sénateurs et eurodéputés français : identité, circonscription, groupe et premier mandat : une ligne par parlementaire.",
    provenance: "Table parlementaires (API DataParl'/Supabase), données ouvertes AN, Sénat, Parlement européen",
    colonnes: [
      { cle: "chambre", label: "Chambre", genre: "texte" },
      { cle: "civilite", label: "Civ.", genre: "texte" },
      { cle: "prenom", label: "Prénom", genre: "texte" },
      { cle: "nom", label: "Nom", genre: "texte" },
      { cle: "circonscription", label: "Circonscription", genre: "texte" },
      { cle: "groupe_libelle", label: "Groupe", genre: "texte" },
      { cle: "premier_mandat", label: "Premier mandat", genre: "texte" },
      { cle: "actif", label: "En exercice", genre: "texte" },
    ],
    charger: async () => {
      const rows = await dataQueryTout<{ chambre: string; civilite: string; prenom: string; nom: string; circonscription: string | null; groupe_libelle: string | null; premier_mandat: string | null; actif: boolean }>(
        "parlementaires", new URLSearchParams({ select: "chambre,civilite,prenom,nom,circonscription,groupe_libelle,premier_mandat,actif", order: "chambre,nom.asc" }),
      );
      return rows.map((r) => ({
        ...r, chambre: CHAMBRE_LONG[r.chambre] ?? r.chambre,
        circonscription: r.circonscription ?? "", groupe_libelle: r.groupe_libelle ?? "",
        premier_mandat: r.premier_mandat ?? "", actif: r.actif ? "oui" : "non",
      }));
    },
  },
  {
    id: "mouvements-recents",
    titre: "Derniers mouvements",
    description: `Les ${n(2000)} mouvements les plus récents : arrivées, départs et transferts de collaborateurs parlementaires.`,
    provenance: "Table mouvements (API DataParl'/Supabase), suivi quotidien et archives",
    colonnes: [
      { cle: "date_event", label: "Date", genre: "texte" },
      { cle: "chambre", label: "Chambre", genre: "texte" },
      { cle: "type", label: "Type", genre: "texte" },
      { cle: "collab", label: "Collaborateur", genre: "texte" },
      { cle: "elu_nom", label: "Élu", genre: "texte" },
      { cle: "elu_groupe", label: "Groupe", genre: "texte" },
      { cle: "fonction", label: "Fonction", genre: "texte" },
    ],
    charger: async () => {
      const { rows } = await dataQuery<{ date_event: string; chambre: string; type: string; collab_prenom: string; collab_nom: string; elu_nom: string; elu_groupe: string | null; fonction: string | null }>(
        "mouvements", new URLSearchParams({ select: COLONNES_PUBLIQUES, source: "eq.live", order: "date_event.desc,id.asc", limit: "2000" }), 900,
      );
      return rows.map((r) => ({
        date_event: r.date_event, chambre: CHAMBRE_LONG[r.chambre] ?? r.chambre, type: r.type,
        collab: `${r.collab_prenom} ${r.collab_nom}`.trim(), elu_nom: r.elu_nom, elu_groupe: r.elu_groupe, fonction: r.fonction,
      }));
    },
  },
  {
    id: "mixiparl-elus-an",
    titre: "Mixité des équipes, Assemblée nationale, élu par élu",
    description: "Le classement MixiParl' des députés : part de femmes et taux de mixité de l'équipe de chacun, de la plus mixte à la moins mixte.",
    provenance: "Vue stats_turnover_elus (API DataParl'/Supabase), méthode MixiParl'",
    colonnes: [
      { cle: "rang", label: "Rang", genre: "entier" },
      { cle: "elu", label: "Élu", genre: "texte" },
      { cle: "groupe", label: "Groupe", genre: "texte" },
      { cle: "equipe", label: "Équipe", genre: "entier" },
      { cle: "femmes", label: "Femmes", genre: "entier" },
      { cle: "hommes", label: "Hommes", genre: "entier" },
      { cle: "part_femmes", label: "Part de femmes", genre: "pourcent" },
      { cle: "taux", label: "Taux de mixité", genre: "pourcent" },
    ],
    charger: async () => classementMixite("assemblee"),
  },
  {
    id: "mixiparl-elus-senat",
    titre: "Mixité des équipes, Sénat, élu par élu",
    description: "Le classement MixiParl' des sénateurs : part de femmes et taux de mixité de l'équipe de chacun, de la plus mixte à la moins mixte.",
    provenance: "Vue stats_turnover_elus (API DataParl'/Supabase), méthode MixiParl'",
    colonnes: [
      { cle: "rang", label: "Rang", genre: "entier" },
      { cle: "elu", label: "Élu", genre: "texte" },
      { cle: "groupe", label: "Groupe", genre: "texte" },
      { cle: "equipe", label: "Équipe", genre: "entier" },
      { cle: "femmes", label: "Femmes", genre: "entier" },
      { cle: "hommes", label: "Hommes", genre: "entier" },
      { cle: "part_femmes", label: "Part de femmes", genre: "pourcent" },
      { cle: "taux", label: "Taux de mixité", genre: "pourcent" },
    ],
    charger: async () => classementMixite("senat"),
  },
    {
      id: "liste_collab_dataparl",
      titre: "Liste des collaborateurs parlementaires en poste",
      description: "Tous les collaborateurs directs des \u00e9lus fran\u00e7ais actuellement en poste, toutes chambres confondues : nom, \u00e9lu employeur, chambre et fonction : la liste de r\u00e9f\u00e9rence, mise \u00e0 jour quotidiennement.",
      provenance: "Table periodes en cours (API DataParl'/Supabase) \u00b7 listes officielles AN, S\u00e9nat, Parlement europ\u00e9en",
      colonnes: [
        { cle: "collab", label: "Collaborateur", genre: "texte" },
        { cle: "elu", label: "\u00c9lu employeur", genre: "texte" },
        { cle: "chambre", label: "Chambre", genre: "texte" },
        { cle: "fonction", label: "Fonction", genre: "texte" },
        { cle: "depuis", label: "En poste depuis", genre: "texte" },
      ],
      charger: async () => {
        const rows = await dataQueryTout<{ collab_id: string; chambre: string; elu_nom: string; debut: string; fonction: string | null }>(
          "periodes", new URLSearchParams({ select: "collab_id,chambre,elu_nom,debut,fonction", en_cours: "eq.true", order: "elu_nom.asc" }),
        );
        const collabs = await dataQueryTout<{ collab_id: string; prenom: string; nom: string }>(
          "collaborateurs", new URLSearchParams({ select: "collab_id,prenom,nom" }),
        );
        const noms = new Map(collabs.map((c) => [c.collab_id, `${c.prenom} ${c.nom}`]));
        return rows.map((r) => ({
          collab: noms.get(r.collab_id) ?? "",
          elu: r.elu_nom,
          chambre: CHAMBRE_LONG[r.chambre] ?? r.chambre,
          fonction: r.fonction ?? "",
          depuis: r.debut,
        }));
      },
    },
];

// Classement MixiParl' d'une chambre (mixité par élu), partagé par les
// feuilles « mixiparl-elus-an » et « mixiparl-elus-senat ».
async function classementMixite(chambre: "assemblee" | "senat") {
  const { rows } = await dataQuery<{
    chambre: string; elu_nom: string; elu_groupe: string;
    femmes: number; hommes: number; indetermines: number;
  }>("stats_turnover_elus", new URLSearchParams({ select: "chambre,elu_nom,elu_groupe,femmes,hommes,indetermines", chambre: `eq.${chambre}` }), 3600);
  const eligibles = rows.filter((r) => r.femmes + r.hommes + r.indetermines >= 2 && r.indetermines === 0)
    .sort((a, b) => {
      const ta = a.femmes + a.hommes > 0 ? 1 - Math.abs((2 * a.femmes) / (a.femmes + a.hommes) - 1) : 0;
      const tb = b.femmes + b.hommes > 0 ? 1 - Math.abs((2 * b.femmes) / (b.femmes + b.hommes) - 1) : 0;
      return tb - ta || b.femmes + b.hommes - (a.femmes + a.hommes) || a.elu_nom.localeCompare(b.elu_nom, "fr");
    });
  return eligibles.map((r, i) => ({
    rang: i + 1,
    elu: r.elu_nom,
    groupe: r.elu_groupe ?? "",
    equipe: r.femmes + r.hommes,
    femmes: r.femmes,
    hommes: r.hommes,
    part_femmes: r.femmes + r.hommes > 0 ? Math.round((r.femmes / (r.femmes + r.hommes)) * 1000) / 1000 : null,
    taux: 1 - Math.abs((2 * r.femmes) / (r.femmes + r.hommes) - 1),
  }));
}

export function feuille(id: string): FeuilleDef | undefined {
  return FEUILLES.find((f) => f.id === id);
}
