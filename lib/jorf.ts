import { inflateRawSync } from "node:zlib";
import { cleNom } from "./format.ts";

// Balayage du Journal officiel (JORF, édition « Lois et décrets ») :
// téléchargement des dumps quotidiens de la DILA (JORFSIMPLE), extraction des
// mesures nominatives qui concernent le gouvernement (ministres) et les
// cabinets ministériels (directeurs, chefs de cabinet, conseillers…).
//
// Aucune dépendance : le zip est lu à la main (zlib natif), le XML est
// analysé par expression régulière : le format DILA est régulier.
// Source : https://www.data.gouv.fr/…/jorf-les-donnees-de-l-edition-lois-et-decrets…
// (Premier ministre / DILA, réutilisation libre).

const BASE = "https://echanges.dila.gouv.fr/OPENDATA/JORFSIMPLE";

export type MesureJORF = {
  id_texte: string;
  date: string; // ISO (AAAA-MM-JJ)
  nature: string;
  titre: string;
  type: "nomination" | "cessation";
  role: "ministre" | "cabinet";
  civilite: "M." | "Mme";
  prenom: string;
  nom: string;
  fonction: string; // fonction telle que citée (ex. « directeur de cabinet », « conseiller parlementaire »)
  portefeuille: string; // titre ministériel complet (ex. « ministre des sports »)
  ministre: { prenom: string; nom: string } | null; // ministre de rattachement nommé dans le décret
  cabinet_titre: string; // intitulé du cabinet (« Premier ministre », « ministre délégué…, chargé… »), vide sinon
  extrait: string; // phrase nominative, pour l'audit
};

export const lienJORF = (date: string) => `${BASE}/JORFSIMPLE_${date.replace(/-/g, "")}.zip`;

// ---------------------------------------------------------------------------
// 1. Zip : lecture du répertoire central puis décompression (méthode 0 ou 8).
// ---------------------------------------------------------------------------
export function xmlDuZip(buf: Buffer): string[] {
  const fin = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); // EOCD
  if (fin < 0) throw new Error("JORF : zip illisible (pas de fin de répertoire)");
  const nbEntrees = buf.readUInt16LE(fin + 10);
  const dir = buf.readUInt32LE(fin + 16);
  const out: string[] = [];
  let p = dir;
  for (let i = 0; i < nbEntrees; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const methode = buf.readUInt16LE(p + 10);
    const tailleCompressee = buf.readUInt32LE(p + 20);
    const taille = buf.readUInt32LE(p + 24);
    const nomLong = buf.readUInt16LE(p + 28);
    const extraLong = buf.readUInt16LE(p + 30);
    const commLong = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const nom = buf.toString("utf8", p + 46, p + 46 + nomLong);
    if (nom.toLowerCase().endsWith(".xml") && taille > 0 && taille < 60_000_000) {
      const nl = buf.readUInt16LE(offset + 26);
      const el = buf.readUInt16LE(offset + 28);
      const debut = offset + 30 + nl + el;
      const brut = buf.subarray(debut, debut + tailleCompressee);
      out.push(methode === 8 ? inflateRawSync(brut).toString("utf8") : brut.toString("utf8"));
    }
    p += 46 + nomLong + extraLong + commLong;
  }
  if (!out.length) throw new Error("JORF : aucun fichier XML dans le zip");
  return out;
}

// ---------------------------------------------------------------------------
// 2. XML : analyse légère (balises plates du DTD LEGIFRANCE).
// ---------------------------------------------------------------------------
const balise = (xml: string, champ: string, dans?: string): string | null => {
  const base = dans ?? xml;
  const m = new RegExp(`<${champ}[^>]*>([\\s\\S]*?)</${champ}>`, "i").exec(base);
  return m ? m[1].trim() : null;
};

export const sansBalises = (x: string): string =>
  x.replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, " ").trim();

// Personnes citées dans les métadonnées nominatives (<SM><NOMS><PERSONNE…>),
// sous l'une des deux formes acceptées par la DILA :
//   <PERSONNE><NOM>DUPONT</NOM><PRENOM>Marie</PRENOM></PERSONNE>
//   <PERSONNE nom="DUPONT" prenom="Marie"/>
function personnesDuTexte(metaSm: string): { civilite: "M." | "Mme"; prenom: string; nom: string }[] {
  const out: { civilite: "M." | "Mme"; prenom: string; nom: string }[] = [];
  for (const m of metaSm.matchAll(/<PERSONNE\b([^>]*?)\/>|<PERSONNE\b([^>]*)>([\s\S]*?)<\/PERSONNE>/gi)) {
    const attrs = (m[1] ?? m[2] ?? "") + " " + (m[3] ?? "");
    const nom = /nom\s*=\s*"([^"]+)"/i.exec(attrs)?.[1] ?? sansBalises(balise(m[0], "NOM") ?? "");
    const prenom = /prenom\s*=\s*"([^"]+)"/i.exec(attrs)?.[1] ?? sansBalises(balise(m[0], "PRENOM") ?? "");
    const civ = /civilite\s*=\s*"([^"]+)"/i.exec(attrs)?.[1] ?? sansBalises(balise(m[0], "CIVILITE") ?? "");
    if (nom && prenom) out.push({ civilite: /^\s*Mme|Madame/i.test(civ) ? "Mme" : "M.", prenom: prenom.trim(), nom: nom.trim() });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. Qualification : qui est nommé, et où ?
// ---------------------------------------------------------------------------
// Fonctions de cabinet citées dans les décrets, avec leurs adjectifs usuels
// (« conseiller parlementaire », « conseillère technique presse »…). La
// correspondance la plus longue gagne : c'est elle qui devient la fonction
// enregistrée : plus de « conseiller » générique qui noie les titres réels.
const ADJECTIFS_FONCTION = "(?:\\s+(?:technique[s]?|parlementaire[s]?|social(?:e|es)?|spéciale?|politique[s]?|numérique|digitale|de\\s+presse|communication|territoriale[s]?|européen(?:ne|nes)?|agricole|juridique))*";
const FONCTION_CABINET_RX = new RegExp(
  "\\b(adjoint(?:e)?\\s+au\\s+directeur(?:\\s+d(?:e|u)\\s+cabinet)?|direct(?:eur|rice)(?:\\s+adjoint(?:e)?)?\\s+d(?:e|u)\\s+cabinet|chef(?:fe)?(?:\\s+adjoint(?:e)?)?\\s+d(?:e|u)\\s+cabinet|charg[ée]e?\\s+de\\s+mission|conseill(?:er|ère))" + ADJECTIFS_FONCTION,
  "gi");

function fonctionCabinet(autour: string): string | null {
  let meilleur: string | null = null;
  for (const m of autour.matchAll(FONCTION_CABINET_RX)) {
    const f = m[0].trim();
    if (!meilleur || f.length > meilleur.length) meilleur = f;
  }
  return meilleur;
}

// Intitulé ministériel complet (« Premier ministre », « ministre délégué
// auprès du Premier ministre, chargé des relations avec le Parlement »…) :
// jusqu'à la fin de la phrase, borné pour ne pas avaler le décret entier.
const TITRE_MINISTERIEL = "(?:(?:Premier\\s+)?ministre|secrétaire\\s+d'[ée]tat|garde\\s+des\\s+sceaux)\\b[^.;]{0,200}";

// Trois façons de désigner le cabinet de rattachement :
//   « au cabinet du Premier ministre »
//   « conseillère … du ministre délégué auprès du Premier ministre, chargé … »
//   « conseiller auprès du ministre de l'intérieur »
const CIBLES: RegExp[] = [
  new RegExp(`\\bcabinet\\s+(?:du|de\\s+la|de\\s+l')\\s*(${TITRE_MINISTERIEL})`, "iu"),
  new RegExp(`\\b(?:conseill(?:er|ère)|direct(?:eur|rice)|chef|cheffe|charg[ée]e?|adjoint(?:e)?)\\b[^.;]{0,60}?\\b(?:du|de\\s+la|de\\s+l')\\s*(${TITRE_MINISTERIEL})`, "iu"),
  new RegExp(`\\bauprès\\s+(?:du|de\\s+la|de\\s+l')\\s*(${TITRE_MINISTERIEL})`, "iu"),
];

// Nettoyage de l'intitulé capté : on tronque au premier greffon parasite :
// la fonction du nommé si elle suit l'intitulé, les compléments de lieu ou
// de durée. NB : \b ne fonctionne pas après une lettre accentuée (« chargé »
// finit par un « é », non-mot en JS), on exige donc une espace ou une fin.
const echappe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
const nettoyerTitre = (s: string, fonction: string | null): string => {
  let t = s;
  const coupe = (rx: RegExp) => { const m = rx.exec(t); if (m) t = t.slice(0, m.index); };
  if (fonction) coupe(new RegExp(`\\s+${echappe(fonction)}(?:\\s|$)`, "i"));
  coupe(/:/);
  coupe(/\s+(?:au|aux|dans|en\s+qualité|à\s+compter|pour\s+une\s+durée)\s/i);
  return t.replace(/[\s,:;]+$/, "").replace(/\s+/g, " ").trim();
};

// Ministre de rattachement nommé dans le décret : et immédiatement qualifié :
// « directeur du cabinet de Mme Marina FERRARI, ministre des sports ». Sans
// qualification on refuse : c'est en attrapant des « M. X » croisés dans un
// arrêté quelconque que des rattachements fantômes étaient créés.
const MINISTRE_NOMME = /(?:auprès|chez|cabinet)\s+d(?:e\s+la|e|u|')\s*(?:M\.|Mme|Madame|Monsieur)\s+([A-ZÉÈ][\p{L}'’-]+)\s+([A-ZÉÈ][\p{L}'’-]+(?:\s+[A-ZÉÈ][\p{L}'’-]+)?),?\s*(?=(?:(?:Premier\s+)?ministre|secrétaire\s+d'[ée]tat|garde\s+des\s+sceaux))/u;

// Titre ministériel directement après le nom d'une personne : la seule
// preuve qu'on a affaire à un membre du Gouvernement : « Mme FERRARI,
// ministre des sports », « M. LECORNU, Premier ministre », « est nommé
// secrétaire d'État à… ». Les mentions d'un ministre dans la signature ou
// l'exposé d'un arrêté préfectoral ne qualifient plus la personne.
const QUALIFIE_MINISTRE = /(?:^|[,;]\s*|\b(?:est\s+)?nomm(?:é(?:e)?)\s+(?:en\s+qualité\s+(?:de|du)\s+)?|\ben\s+qualité\s+(?:de|du)\s+)((?:(?:Premier\s+)?ministre|secrétaire\s+d'[ée]tat|garde\s+des\s+sceaux)\b[^,;]{0,150})/i;

const nomApostrophe = (prenom: string, nom: string): RegExp => {
  const e = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s]+/g, "\\s+");
  return new RegExp(`${e(nom)}\\s*[,«]?\\s*${e(prenom)}|${e(prenom)}\\s+${e(nom)}`, "i");
};

// Analyse d'un document JORF (un ou plusieurs <TEXTE>) : rend les mesures
// nominatives concernant les ministres et les cabinets ministériels.
//
// Garde-fous (2026-10-13) : une mesure n'est retenue que si le décret
// qualifie explicitement la personne : titre ministériel directement après
// son nom pour un ministre, intitulé de cabinet cité ou ministre nommé et
// qualifié pour un membre de cabinet. Les nominations préfectorales («
// directeur de cabinet du préfet de… »), de l'Élysée (« …du président de la
// République »), de la police, des assemblées ou des décorations ne sont
// plus attrapées : elles aboutissaient à de faux membres de cabinets
// ministériels (cf. corrections des cabinets Panifous / Lecornu II).
export function analyserJORF(xml: string, dateDefaut?: string): MesureJORF[] {
  const out: MesureJORF[] = [];
  const blocs = xml.match(/<TEXTE\b[\s\S]*?<\/TEXTE>/gi) ?? [xml];
  for (const bloc of blocs) {
    const titre = sansBalises(balise(bloc, "TITRE") ?? "");
    if (!/(nomination|cessation de fonctions|fin de fonctions|révocation|relatif à la composition|portant cessation)/i.test(titre)) continue;
    const nature = balise(bloc, "NATURE") ?? "Décret";
    if (!/^(décret|arrêté)$/i.test(nature)) continue;
    const dateBrute = balise(bloc, "DATE_TEXTE") ?? dateDefaut?.replace(/-/g, "") ?? "";
    const date = dateBrute ? `${dateBrute.slice(0, 4)}-${dateBrute.slice(4, 6)}-${dateBrute.slice(6, 8)}` : dateDefaut ?? "";
    const id = balise(bloc, "ID_TEXTE") ?? `${date}-${out.length}`;
    const sm = balise(bloc, "SM") ?? "";
    const contenu = sansBalises(balise(bloc, "CONTENU") ?? "");
    const texte = `${titre}. ${contenu}`;
    const type: MesureJORF["type"] = /(cessation de fonctions|fin de fonctions|révocation|cessation)/i.test(titre) ? "cessation" : "nomination";
    const personnes = personnesDuTexte(sm);
    for (const p of personnes) {
      // La phrase autour du nom : c'est elle qui dit s'il s'agit d'un ministre
      // ou d'un membre de cabinet, et auprès de qui.
      const m = nomApostrophe(p.prenom, p.nom).exec(texte);
      const autour = m ? texte.slice(Math.max(0, m.index - 260), Math.min(texte.length, m.index + 420)) : texte.slice(0, 400);
      const fonctionCab = fonctionCabinet(autour);
      const cible = CIBLES.map((rx) => rx.exec(autour)?.[1] ?? null).find(Boolean) ?? null;
      const cabinetTitre = cible ? nettoyerTitre(cible, fonctionCab) : "";
      const nomme = MINISTRE_NOMME.exec(autour);
      const ministre = nomme
        ? (nomme[1] === nomme[1].toUpperCase()
          ? { prenom: nomme[2], nom: nomme[1] }
          : { prenom: nomme[1], nom: nomme[2] })
        : null;
      const apres = m ? texte.slice(m.index + m[0].length, m.index + m[0].length + 220) : "";
      const qualifie = QUALIFIE_MINISTRE.exec(apres)?.[1]?.trim() ?? "";
      let role: MesureJORF["role"] | null = null;
      let fonction = "";
      if (fonctionCab && (cabinetTitre || ministre)) { role = "cabinet"; fonction = fonctionCab; }
      else if (qualifie) { role = "ministre"; fonction = qualifie; }
      if (!role) continue; // ni ministre ni cabinet ministériel identifiable : on ignore
      out.push({
        id_texte: id, date, nature, titre, type, role,
        civilite: p.civilite, prenom: p.prenom, nom: p.nom,
        fonction,
        portefeuille: role === "ministre" ? fonction : "",
        ministre: role === "cabinet" ? ministre : null,
        cabinet_titre: role === "cabinet" ? cabinetTitre : "",
        extrait: autour.replace(/\s+/g, " ").slice(0, 400),
      });
    }
    // Sans métadonnées nominatives (anciens numéros), recherche dans le
    // texte, avec les mêmes garde-fous.
    if (!personnes.length) {
      for (const m of texte.matchAll(/(?:M\.|Mme)\s+([A-ZÉÈ][\p{L}'’-]+)\s+([A-ZÉÈ][\p{L}'’-]+(?:\s+[A-ZÉÈ][\p{L}'’-]+){0,2})/gu)) {
        const autour = texte.slice(Math.max(0, m.index - 100), m.index + 320);
        const fonctionCab = fonctionCabinet(autour);
        const cible = CIBLES.map((rx) => rx.exec(autour)?.[1] ?? null).find(Boolean) ?? null;
        const cabinetTitre = cible ? nettoyerTitre(cible, fonctionCab) : "";
        const apres = texte.slice(m.index + m[0].length, m.index + m[0].length + 220);
        const qualifie = QUALIFIE_MINISTRE.exec(apres)?.[1]?.trim() ?? "";
        let role: MesureJORF["role"] | null = null;
        let fonction = "";
        if (fonctionCab && (cabinetTitre || MINISTRE_NOMME.test(autour))) { role = "cabinet"; fonction = fonctionCab ?? ""; }
        else if (qualifie) { role = "ministre"; fonction = qualifie; }
        if (!role) continue;
        out.push({
          id_texte: id, date, nature, titre,
          type: /(cessation|révocation|fin de fonctions)/i.test(titre) ? "cessation" : "nomination",
          role,
          civilite: m[0].startsWith("Mme") ? "Mme" : "M.",
          prenom: m[1], nom: m[2],
          fonction,
          portefeuille: role === "ministre" ? fonction : "",
          ministre: null,
          cabinet_titre: role === "cabinet" ? cabinetTitre : "",
          extrait: autour,
        });
      }
    }
  }
  // Dédoublonnage par (personne, texte).
  const vus = new Set<string>();
  return out.filter((m) => {
    const k = `${m.id_texte}|${cleNom(m.prenom, m.nom)}|${m.type}|${m.role}`;
    if (vus.has(k)) return false;
    vus.add(k);
    return true;
  });
}

// Télécharge le JORF d'un jour et rend ses mesures nominatives.
export async function releverJour(date: string): Promise<MesureJORF[]> {
  const r = await fetch(lienJORF(date), {
    headers: { "User-Agent": "DataParl (https://www.dataparl.fr)" },
    signal: AbortSignal.timeout(25_000),
  });
  if (r.status === 404) return []; // pas de publication ce jour-là
  if (!r.ok) throw new Error(`JORF ${date} : HTTP ${r.status}`);
  const brut = Buffer.from(await r.arrayBuffer());
  if (brut.length > 80_000_000) throw new Error(`JORF ${date} : zip trop volumineux`);
  return xmlDuZip(brut).flatMap((x) => analyserJORF(x, date));
}
