// Outils de dates pour les parcours (sans dépendance, testé).

export type Intervalle = { debut: string; fin: string };

const JOUR = 86400_000;
const t = (iso: string, defaut: number) => (iso ? new Date(iso.length === 4 ? `${iso}-01-01` : iso).getTime() : defaut);

// Deux intervalles se chevauchent-ils (d'au moins `minJours`) ? Une borne
// vide = inconnue ou ouverte.
export function chevauche(a: Intervalle, b: Intervalle, minJours = 0): boolean {
  const debut = Math.max(t(a.debut, -Infinity), t(b.debut, -Infinity));
  const fin = Math.min(t(a.fin, Infinity), t(b.fin, Infinity));
  return fin - debut >= minJours * JOUR;
}

// Fusionne les appartenances successives au même organe (même libellé et même
// fonction) séparées de moins de `tolerance` jours : les députés non inscrits
// changent de commission presque chaque mois, et une même commission apparaît
// sinon des dizaines de fois.
export function fusionner<T extends Intervalle & { libelle: string; fonction: string }>(items: T[], tolerance = 45): T[] {
  const groupes = new Map<string, T[]>();
  for (const x of items) {
    const k = `${x.libelle}|${(x.fonction || "").toLowerCase()}`;
    (groupes.get(k) ?? groupes.set(k, []).get(k)!).push(x);
  }
  const out: T[] = [];
  for (const liste of groupes.values()) {
    liste.sort((a, b) => (a.debut || "").localeCompare(b.debut || ""));
    let cur: T | null = null;
    for (const x of liste) {
      if (cur && (!cur.fin || t(x.debut, 0) - t(cur.fin, 0) <= tolerance * JOUR)) {
        const fin: string = !cur.fin || !x.fin ? "" : cur.fin > x.fin ? cur.fin : x.fin;
        cur = Object.assign({}, cur, { fin }) as T;
      } else {
        if (cur) out.push(cur);
        cur = Object.assign({}, x) as T;
      }
    }
    if (cur) out.push(cur);
  }
  return out.sort((a, b) => Number(!!a.fin) - Number(!!b.fin) || (b.debut || "").localeCompare(a.debut || ""));
}

const mois = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });
export const moisAnnee = (iso: string) => (iso ? mois.format(new Date(iso.length === 4 ? `${iso}-01-01` : iso)) : "");

// « de mars 2019 à juin 2022 », « depuis oct. 2023 », « avant févr. 2017 »…
export function libellePeriode(p: { debut: string; debut_connu: boolean; fin: string; fin_connue: boolean; en_cours: boolean }): string {
  const debut = p.debut ? (p.debut_connu ? moisAnnee(p.debut) : `avant ${moisAnnee(p.debut)}`) : "date inconnue";
  if (p.en_cours) return p.debut ? `depuis ${p.debut_connu ? moisAnnee(p.debut) : `au moins ${moisAnnee(p.debut)}`}` : "en poste (arrivée non datée)";
  const fin = p.fin ? moisAnnee(p.fin) : "date inconnue";
  if (p.debut && p.fin && p.debut_connu && moisAnnee(p.debut) === moisAnnee(p.fin)) return moisAnnee(p.debut);
  if (!p.debut) return `jusqu'à ${fin} (arrivée non datée)`;
  return p.debut_connu ? `de ${debut} à ${fin}` : `${debut} jusqu'à ${fin}`;
}

// Durée en mois (arrondie) quand les deux bornes sont connues.
export function dureeMois(debut: string, fin: string): number | null {
  if (!debut || !fin) return null;
  const d = new Date(debut), f = new Date(fin);
  return Math.max(0, Math.round((f.getTime() - d.getTime()) / (30.44 * 86400_000)));
}

// ─── Groupes politiques d'un mandat (fiches et biographies) ───
// Les sources créent une appartenance « non-inscrit » à chaque renouvellement,
// le temps que les groupes se forment (juillet 2024 à l'AN), et une vraie
// quand l'élu quitte son groupe ; des renommages laissent aussi des sigles
// jamais refermés, UMP resté ouvert après le passage au LR par exemple.
// Ces artefacts ne doivent jamais s'afficher comme des groupes contradictoires.

export type MandatGroupes = { chambre: string; elu_id: string; debut: string; fin: string };
export type AppartenanceGroupe = { chambre: string; elu_id: string; type: string; sigle: string; libelle: string; debut: string; fin: string };

const NON_INSCRIT = /^(ni|non.?inscrit|n['’]appartenant|ne figurant)/i;
// Fenêtre de constitution des groupes : une non-inscription plus courte que ce
// délai, suivie d'un vrai groupe, est un artefact de renouvellement.
const TRANSITOIRE_JOURS = 30;

// Appartenances de type groupe qui couvrent le mandat (chevauchement d'au
// moins 7 jours), triées de la plus ancienne à la plus récente.
export function groupesDuMandat(appartenances: AppartenanceGroupe[], mandat: MandatGroupes): AppartenanceGroupe[] {
  return appartenances
    .filter((a) => a.chambre === mandat.chambre && a.type === "groupe"
      && chevauche(a, mandat, 7) && (!mandat.elu_id || a.elu_id === mandat.elu_id))
    .sort((a, b) => (a.debut || "").localeCompare(b.debut || ""));
}

// Sigles successifs du mandat, dans l'ordre chronologique (« RN puis NI »).
// Les non-inscriptions brèves suivies d'un groupe disparaissent : artefacts
// de renouvellement. Une non-inscription finale, elle, reste : elle dit un
// départ réel du groupe. Les doublons consécutifs sont fusionnés (« SOC puis
// SOC » n'existe pas : bornes de législature qui se touchent).
export function siglesSuccessifs(appartenances: AppartenanceGroupe[]): string[] {
  const tries = [...appartenances].sort((a, b) => (a.debut || "").localeCompare(b.debut || ""));
  const utiles = tries.filter((a, i) => {
    const s = a.sigle || a.libelle || "";
    if (!NON_INSCRIT.test(s)) return true;
    if (i === tries.length - 1) return true;
    if (!a.debut || !a.fin) return true;
    return new Date(a.fin).getTime() - new Date(a.debut).getTime() >= TRANSITOIRE_JOURS * 86400_000;
  });
  const out: string[] = [];
  for (const a of utiles) {
    const s = (a.sigle || a.libelle || "").trim();
    if (s && out[out.length - 1] !== s) out.push(s);
  }
  return out;
}
