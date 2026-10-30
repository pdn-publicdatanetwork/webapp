// Génère sql/2026-10-03_bios_nouveaux_senateurs.sql : bios des nouveaux
// sénateurs 2026 au format de la charte éditoriale, remplies uniquement
// avec les données du référentiel (mandats, groupes, commissions) : aucun
// élément inventé. Les sections sans donnée disponible sont explicitement
// marquées « à compléter » pour l'équipe.
import fs from "fs";

const elus = JSON.parse(fs.readFileSync("/tmp/nouveaux.json", "utf8"));
const mandats = JSON.parse(fs.readFileSync("/tmp/mandats.json", "utf8"));
const appart = JSON.parse(fs.readFileSync("/tmp/appart.json", "utf8"));
const biosDeja = new Set(JSON.parse(fs.readFileSync("/tmp/bios_exist.json", "utf8")).map((b) => b.personne_id));

const moisAnnee = (iso) => {
  if (!iso) return "";
  const [a, m] = iso.split("-");
  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  return `${MOIS[Number(m) - 1]} ${a}`;
};
const CHAMBRE_LONG = { assemblee: "l'Assemblée nationale", senat: "le Sénat", europarl: "le Parlement européen" };
const e = (s) => (s || "").replace(/'/g, "''");
const GROUPES_COURTS = new Set(["NI"]);
const sigleGroupe = (a) => a.sigle && !GROUPES_COURTS.has(a.sigle) ? a.sigle : a.libelle;

function bioPour(elu) {
  const f = elu.civilite === "Mme";
  const mes = mandats.filter((m) => m.personne_id === elu.personne_id);
  const mesAvant = mes.filter((m) => m.chambre !== "senat");
  const apps = appart.filter((a) => a.personne_id === elu.personne_id);
  const groupesHistoriques = apps.filter((a) => a.type === "groupe" && a.fin && !/n'appartenant|non.inscrit/i.test(a.libelle || "") && a.sigle !== "NI");
  const commissions = apps.filter((a) => a.type !== "groupe");
  const eluE = f ? "Élue" : "Élu";
  const aGroupe = elu.groupe && elu.groupe !== "Aucun";
  // Article du département : « de la Gironde », « du Finistère »,
  // « de l'Ain », « des Bouches-du-Rhône ». Les rares masculins en -e
  // (Finistère, Rhône, Territoire de Belfort) sont listés à part.
  const MASCULINS_EN_E = new Set(["Finistère", "Rhône", "Territoire de Belfort"]);
  const article = (d) =>
    /^Bouches|^Iles|^Français|^Alpes/.test(d) ? "des"
    : /^[AEIOUÉÈÊH]/.test(d) ? "de l'"
    : d.endsWith("e") && !MASCULINS_EN_E.has(d) ? "de la"
    : "du";
  // « de la Gironde », « de l'Ain » (pas d'espace après l'apostrophe)…
  const duDepartement = `${article(elu.departement)}${article(elu.departement).endsWith("'") ? "" : " "}${elu.departement}`;
  const titreSenateur = f ? "Sénatrice" : "Sénateur";

  const lignes = [];
  lignes.push(`**${(elu.nom || "").toUpperCase()} ${elu.prenom.toUpperCase()}**`);
  lignes.push(`${titreSenateur} ${duDepartement}`);
  if (aGroupe) lignes.push(`Groupe ${elu.groupe_libelle || elu.groupe} au Sénat`);

  lignes.push("");
  lignes.push("I. Éléments biographiques");
  lignes.push("");
  if (elu.date_naissance) {
    const [a, m, j] = elu.date_naissance.split("-");
    lignes.push(`Naissance : ${j}/${m}/${a}.`);
  } else {
    lignes.push("Naissance : à compléter.");
  }
  lignes.push("");
  lignes.push("Fonctions");
  lignes.push("");
  lignes.push(`Depuis octobre 2026 : **${titreSenateur} ${duDepartement}**${aGroupe ? ` (groupe ${elu.groupe})` : ""} ;`);
  for (const m of mesAvant.slice().reverse()) {
    lignes.push(`${m.debut ? m.debut.slice(0, 4) : ":"}${m.fin ? ` – ${m.fin.slice(0, 4)}` : ""} : **${m.libelle}**${m.circonscription ? ` (${m.circonscription})` : ""} ;`);
  }
  lignes.push("");
  lignes.push("Formation : à compléter.");
  lignes.push("");
  lignes.push("II. Éléments de parcours et réseaux");
  lignes.push("");
  if (mesAvant.length) {
    const chambres = [...new Set(mesAvant.map((m) => m.chambre))];
    lignes.push(`${elu.prenom} **${elu.nom.toUpperCase()}** arrive au Sénat lors du renouvellement partiel du 27 septembre 2026, après un parcours à ${chambres.map((c) => CHambreLong(c)).join(" et ")}. ${eluE} le 27 septembre 2026 par les grands électeurs ${duDepartement}, ${f ? "elle" : "il"} rejoint ${aGroupe ? `le groupe ${elu.groupe}` : "les rangs du Sénat"} pour un mandat de six ans.`);
    if (groupesHistoriques.length) {
      const g = [...new Set(groupesHistoriques.map(sigleGroupe))];
      lignes.push(`${f ? "Elle" : "Il"} a siégé au sein ${g.length > 1 ? "des groupes " : "du groupe "}${g.join(", ")}.`);
    }
  } else {
    lignes.push(`${elu.prenom} **${elu.nom.toUpperCase()}** fait son entrée au Palais du Luxembourg lors du renouvellement partiel du 27 septembre 2026 : ${f ? "elle" : "il"} est élu${f ? "e" : ""} le 27 septembre par les grands électeurs ${duDepartement}${aGroupe ? ` et rejoint le groupe ${elu.groupe}` : ""}, pour un mandat de six ans.`);
    lignes.push("Ses mandats et responsabilités locales antérieurs seront documentés ici au fil des publications officielles.");
  }
  lignes.push("");
  lignes.push("Présence en ligne et canaux institutionnels");
  lignes.push("");
  lignes.push(elu.url_officielle ? `Page Sénat : ${elu.url_officielle}` : "Page Sénat : en cours de mise en ligne");

  lignes.push("");
  lignes.push("III. Ses sujets");
  lignes.push("");
  if (commissions.length) {
    const vues = new Map();
    for (const c of commissions) {
      const nom = c.sigle && c.sigle.length <= 40 && c.sigle !== c.libelle ? c.sigle : c.libelle;
      if (!vues.has(nom)) vues.set(nom, { chambres: new Set(), fonction: c.fonction });
      if (c.chambre) vues.get(nom).chambres.add(CHAMBRE_LONG[c.chambre] || c.chambre);
      if (c.fonction && c.fonction.toLowerCase() !== "membre") vues.get(nom).fonction = c.fonction;
    }
    lignes.push(`Avant son élection au Sénat, ${f ? "elle a travaillé au sein de" : "il a travaillé au sein de"} ${[...vues.entries()].map(([nom, v]) => `**${nom}** (${[...v.chambres].join(", ")}${v.fonction && v.fonction.toLowerCase() !== "membre" ? ` : ${v.fonction.toLowerCase()}` : ""})`).join(", ")}. Ses travaux au Sénat seront détaillés dès la publication des commissions.`);
  } else {
    lignes.push("Ses positions et travaux parlementaires au Sénat seront documentés ici dès la publication des commissions et des travaux législatifs.");
  }
  return lignes.join("\n");
}

function CHambreLong(c) { return CHAMBRE_LONG[c] || c; }

const out = [];
let n = 0;
for (const elu of elus) {
  if (biosDeja.has(elu.personne_id)) continue; // Diaz déjà rédigée
  out.push(`-- ${elu.prenom} ${elu.nom} (${elu.departement}) : /parlementaires/${elu.slug}/bio
insert into bios (personne_id, texte, source, actif, cree_par) values ('${e(elu.personne_id)}', $bio$
${bioPour(elu)}
$bio$, 'Fiche générée depuis le référentiel (à enrichir par la rédaction)', true, 'quentin')
on conflict (personne_id) do update set texte = excluded.texte, maj_le = now();`);
  n++;
}

const entete = `-- ============================================================================
-- DataParl : Bios des nouveaux sénateurs 2026 (première version)
-- À exécuter dans le SQL Editor de la base \`dataparl\` (yuhqajaznizwmenmyzms).
--
-- ${n} nouveaux sénateurs (jamais sénateurs auparavant), scrutin du 27
-- septembre 2026. Bios au format de la charte éditoriale, remplies
-- UNIQUEMENT avec les données du référentiel : mandats, groupes et
-- commissions. Les éléments non disponibles (formation, parcours local,
-- sujets) sont marqués « à compléter » pour la rédaction, qui peut les
-- enrichir depuis l'admin (admin.dataparl.fr/elus). La bio rédigée
-- d'Edwidge Diaz n'est pas écrasée (clause on conflict en update texte :
-- si tu préfères ne JAMAIS toucher à une bio existante, retire les
-- lignes de ce fichier pour les personne_id déjà présents dans bios).
-- ============================================================================
-- ⚠️ NOTE : la clause on conflict ... do update set texte = excluded.texte
-- ÉCRASE le texte existant. Pour ne pas écraser, remplace par :
--   on conflict (personne_id) do nothing;

`;
fs.writeFileSync("/home/user/work/webmain/sql/2026-10-03_bios_nouveaux_senateurs.sql", entete + out.join("\n\n") + "\n");
console.log(`${n} bios générées`);
