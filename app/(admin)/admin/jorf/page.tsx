"use client";
import { useCallback, useState } from "react";
import { useAdmin } from "@/app/_components/admin/Porte";

type Statut = { scan: { jours: number; premiere: string | null; derniere: string | null }; prochain: string | null; restants: number };
type Jour = { date: string; nb: number; ministres: number; cabinets: number; erreurs: string[] };
type Lot = { jours: Jour[]; prochain: string | null; restants: number };
type Ligne = { date: string; texte: string; err?: boolean };

// Balayage du Journal officiel : chaque appel de l'API traite un lot de jours
// (borné par le temps d'exécution du serveur) et rend la suite ; la page
// rappelle tant qu'il reste des jours : un seul clic pour tout 2017→aujourd'hui.
export default function PageJORF() {
  const { api } = useAdmin();
  const [statut, setStatut] = useState<Statut | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [enCours, setEnCours] = useState(false);

  const rafraichir = useCallback(async () => {
    try { setStatut(await api<Statut>("/api/admin/jorf")); }
    catch { /* affiché par les lignes */ }
  }, [api]);
  if (statut === null && !enCours) rafraichir();

  const balayer = useCallback(async (force = false) => {
    setEnCours(true);
    setLignes([]);
    const log = (date: string, texte: string, err?: boolean) => setLignes((l) => [...l.slice(-400), { date, texte, err }]);
    try {
      let prochain: string | null = statut?.prochain ?? "2017-01-01";
      let relance = 0;
      while (prochain && relance < 500) {
        relance++;
        const lot: Lot = await api<Lot>("/api/admin/jorf", { method: "POST", body: { debut: prochain, force } });
        for (const j of lot.jours) {
          const errs = j.erreurs.length ? ` : ${j.erreurs[0]}` : "";
          log(j.date, j.nb === 0 && !j.erreurs.length ? "aucune mesure nominative" : `${j.nb} mesure(s) : ${j.ministres} ministre(s), ${j.cabinets} cabinet(s)${errs}`, !!j.erreurs.length);
        }
        prochain = lot.prochain ?? null;
        setStatut((s) => s ? { ...s, prochain, restants: lot.restants } : s);
        if (lot.prochain === null) break;
      }
      log("-", relance > 1 ? `Balayage terminé (${relance} lots)` : "Terminé");
    } catch (e) { log("-", (e as Error).message, true); }
    setEnCours(false);
    rafraichir();
  }, [api, statut, rafraichir]);

  return (
    <>
      <h1>JORF : gouvernement et cabinets</h1>
      <p className="lead">
        Le Journal officiel est balayé chaque matin (tâche planifiée) : nominations et cessations de fonctions
        des ministres et des membres de leurs cabinets alimentent les fiches. Cette page rattrape
        l&apos;historique depuis 2017 : un clic suffit, le balayage reprend là où il s&apos;était arrêté.
        Le même pipeline existe en bot autonome (GitHub Actions, chaque matin à 6h30) :
        <a href="https://github.com/dataparl/jorf-bot" target="_blank" rel="noreferrer">github.com/dataparl/jorf-bot</a> :
        il écrit dans les mêmes tables, sans doublons.
      </p>
      {statut && (
        <p className="meta">
          Jours déjà balayés : {statut.scan.jours}{statut.scan.premiere ? ` (de ${statut.scan.premiere} à ${statut.scan.derniere})` : ""}
          {statut.prochain ? `, prochaine étape : ${statut.prochain} (${statut.restants} jours restants)` : ", historique complet"}
        </p>
      )}
      <p>
        <button className="btn" disabled={enCours || !statut?.prochain} onClick={() => balayer(false)}>
          {enCours ? "Balayage en cours…" : statut?.prochain ? `Balayer depuis ${statut.prochain}` : "À jour"}
        </button>{" "}
        <button className="btn secondaire" disabled={enCours} onClick={() => balayer(true)}>Rebalayer (forcer)</button>
      </p>
      {lignes.length > 0 && (
        <div className="defile" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          <table className="stats">
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i} className={l.err ? "erreur" : undefined}>
                  <td className="meta">{l.date}</td><td>{l.texte}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
