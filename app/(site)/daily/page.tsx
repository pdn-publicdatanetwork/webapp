import type { Metadata } from "next";
import { dateTitre, derniersJours, joursPublies, PREMIER_JOUR, type Jour } from "@/lib/daily";

export const metadata: Metadata = {
  title: "Les mouvements jour par jour",
  description: "Chaque jour de publication, les arrivées, départs et transferts de collaborateurs parlementaires à l'Assemblée nationale, au Sénat et au Parlement européen.",
  alternates: { canonical: "/daily" },
};

type Props = { searchParams: Promise<{ mois?: string }> };
const MOIS = /^(\d{4})-(\d{2})$/;
const JOURS_SEMAINE = ["L", "M", "M", "J", "V", "S", "D"];

function moisPrecedents(fin: string, n: number): string[] {
  const [a, m] = fin.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

function Mois({ mois, jours }: { mois: string; jours: Map<string, Jour> }) {
  const [a, m] = mois.split("-").map(Number);
  const premier = new Date(Date.UTC(a, m - 1, 1));
  const nb = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const decal = (premier.getUTCDay() + 6) % 7;
  const cases: (number | null)[] = [...Array(decal).fill(null), ...Array.from({ length: nb }, (_, i) => i + 1)];
  while (cases.length % 7) cases.push(null);
  const semaines = Array.from({ length: cases.length / 7 }, (_, i) => cases.slice(i * 7, i * 7 + 7));
  return (
    <div className="mois">
      <h3>{premier.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}</h3>
      <table>
        <thead><tr>{JOURS_SEMAINE.map((j, i) => <th key={i} scope="col">{j}</th>)}</tr></thead>
        <tbody>{semaines.map((s, i) => (
          <tr key={i}>{s.map((j, k) => {
            if (!j) return <td key={k} />;
            const d = `${mois}-${String(j).padStart(2, "0")}`;
            const jour = jours.get(d);
            return <td key={k}>{jour ? <a href={`/daily/${d}`} title={`${jour.n} mouvement${jour.n > 1 ? "s" : ""}`}>{j}</a> : <span>{j}</span>}</td>;
          })}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const resume = (j: Jour) => ["assemblee", "senat", "europarl"].filter((c) => j.parChambre[c])
  .map((c) => `${j.parChambre[c].n} ${c === "assemblee" ? "AN" : c === "senat" ? "Sénat" : "PE"}`).join(", ");

export default async function DailyIndex({ searchParams }: Props) {
  const { mois: demande } = await searchParams;
  let recents: Jour[] = [];
  let indisponible = false;
  try { recents = await derniersJours(7); } catch { indisponible = true; }
  const courant = new Date().toISOString().slice(0, 7);
  const reference = demande && MOIS.test(demande) && demande >= "2015-01" && demande <= courant ? demande : (recents[0]?.date ?? courant).slice(0, 7);
  const affiches = moisPrecedents(reference, 3); // du plus récent au plus ancien
  const debut = `${affiches[2]}-01`;
  const [ra, rm] = reference.split("-").map(Number);
  const fin = new Date(Date.UTC(ra, rm, 0)).toISOString().slice(0, 10);
  const jours = new Map((await joursPublies(debut, fin).catch(() => [])).map((j) => [j.date, j]));
  const precedent = moisPrecedents(reference, 4)[3];
  const suivantBrut = new Date(Date.UTC(ra, rm - 1 + 3, 1)).toISOString().slice(0, 7);
  const suivant = suivantBrut > courant ? courant : suivantBrut;

  return (
    <>
      <h1>Les mouvements <span className="surligne">jour par jour</span></h1>
      <p className="lead">
        Chaque jour où les listes officielles changent, une page : qui arrive, qui part, qui change d&apos;équipe, à
        l&apos;Assemblée nationale, au Sénat et au Parlement européen.
      </p>
      {indisponible && <p className="erreur">Les données sont momentanément indisponibles.</p>}

      <h2>Recevoir le Daily</h2>
      <p>
        Le récapitulatif de chaque matin, directement chez vous. S&apos;il n&apos;y a aucun mouvement, aucun message.
      </p>
      <ul className="jours">
        <li>
          <a href="https://t.me/dataparl_daily" target="_blank" rel="noopener noreferrer">
            <strong>Telegram : @dataparl_daily</strong>
            <span>Le canal officiel : publication automatique chaque matin vers 7h45.</span>
          </a>
        </li>
        <li>
          <a href="https://whatsapp.com/channel/0029VbEDOKCCXC3R26cJIf1P" target="_blank" rel="noopener noreferrer">
            <strong>WhatsApp : canal DataParl&apos; Daily</strong>
            <span>Le même récapitulatif, publié dans notre canal WhatsApp.</span>
          </a>
        </li>
      </ul>

      <h2>Les 7 derniers jours publiés</h2>
      <ul className="jours">
        {recents.map((j) => (
          <li key={j.date}><a href={`/daily/${j.date}`}><strong>{dateTitre(j.date)}</strong><span>{j.n.toLocaleString("fr-FR")} mouvement{j.n > 1 ? "s" : ""}, {resume(j)}</span></a></li>
        ))}
      </ul>

      <h2>Calendrier</h2>
      <p className="meta">Les jours surlignés ont au moins un mouvement publié. Archives depuis 2015.</p>
      <div className="selecteur-mois">
        {precedent >= "2015-01" && <a href={`/daily?mois=${precedent}`}>← Mois précédents</a>}
        {demande && reference < courant && <a href={`/daily?mois=${suivant}`}>Mois suivants →</a>}
      </div>
      <div className="calendrier">
        {[...affiches].reverse().map((m) => <Mois key={m} mois={m} jours={jours} />)}
      </div>
    </>
  );
}
