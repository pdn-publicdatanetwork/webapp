"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";

type Cle = { id: string; nom: string; prefixe: string; quota_jour: number; created_at: string; last_used_at: string | null; revoked_at: string | null };
type Usage = { key_id: string; jour: string; requetes: number };
type JournalApi = { id: number; key_id: string; journalise_le: string; endpoint: string; methode: string | null; parametres: string | null; ip: string | null; user_agent: string | null; statut: number | null; duree_ms: number | null; erreur: string | null };
type Vue = { id: number; chemin: string; le: string };
type Evenement = { evenement: string; email: string; created_at_compte: string; supprime_le: string | null; journalise_le: string };
type Telechargement = { feuille: string; lignes: number; cree_le: string; ip: string | null };
type Data = {
  compte: { id: string; email: string | null; nom: string | null; cree_le: string; derniere_connexion: string | null; fournisseurs: string[] };
  cles: Cle[]; usage: Usage[]; journal: JournalApi[]; vues: Vue[]; evenements: Evenement[]; telechargements: Telechargement[];
  stats: { requetes_api_total: number; pages_vues: number; telechargements: number };
};

export default function Utilisateur() {
  const params = useParams() as { id?: string };
  const { data, err } = useRessource<Data>("/api/admin/user", { id: params?.id });

  return (
    <>
      <h1>{data?.compte.nom || data?.compte.email || "Compte"}</h1>
      <p className="meta"><Link href="/admin/users">← Tous les comptes</Link></p>
      {err && <p className="erreur">{err}</p>}
      {data && <>
        <p className="meta">
          {data.compte.email} · créé le {dateHeure(data.compte.cree_le)} · dernière connexion {dateHeure(data.compte.derniere_connexion)} · {data.compte.fournisseurs.join(", ") || "–"}
        </p>
        <p className="meta">
          {data.stats.requetes_api_total} requête(s) API cumulée(s) · {data.stats.pages_vues} page(s) vues (500 max affichées) · {data.stats.telechargements} export(s) Sheets
        </p>

        <h2>Clés API</h2>
        <div className="defile"><table className="stats">
          <thead><tr><th>Nom</th><th>Préfixe</th><th>Quota/jour</th><th>Créée</th><th>Dernier usage</th><th>État</th><th>Requêtes (40 derniers jours)</th></tr></thead>
          <tbody>{data.cles.map((c) => (
            <tr key={c.id}>
              <td>{c.nom}</td>
              <td className="meta">{c.prefixe}…</td>
              <td className="meta">{c.quota_jour}</td>
              <td className="meta">{dateHeure(c.created_at)}</td>
              <td className="meta">{dateHeure(c.last_used_at)}</td>
              <td>{c.revoked_at ? <span className="meta">révoquée</span> : <span className="ok">active</span>}</td>
              <td className="meta">{data.usage.filter((u) => u.key_id === c.id).reduce((n, u) => n + u.requetes, 0)}</td>
            </tr>))}
          </tbody>
        </table></div>

        <h2>Requêtes API</h2>
        {data.journal.length === 0
          ? <p className="meta">Aucune requête journalisée (la traçabilité détaillée est active depuis le 22/10/2026 ; les requêtes antérieures ne sont que comptées).</p>
          : <div className="defile"><table className="stats">
              <thead><tr><th>Quand</th><th>Endpoint</th><th>Paramètres</th><th>Statut</th><th>Durée</th><th>IP</th><th>User-agent</th></tr></thead>
              <tbody>{data.journal.map((j) => (
                <tr key={j.id}>
                  <td className="meta">{dateHeure(j.journalise_le)}</td>
                  <td className="meta">{j.endpoint}</td>
                  <td className="meta">{j.parametres ? <code>{j.parametres}</code> : "–"}</td>
                  <td className="meta">{j.statut ?? "–"}{j.erreur ? " (" + j.erreur + ")" : ""}</td>
                  <td className="meta">{j.duree_ms != null ? String(j.duree_ms) + " ms" : "–"}</td>
                  <td className="meta">{j.ip ?? "–"}</td>
                  <td className="meta">{j.user_agent ?? "–"}</td>
                </tr>))}
              </tbody>
            </table></div>}

        <h2>Pages vues sur le site</h2>
        <div className="defile"><table className="stats">
          <thead><tr><th>Quand</th><th>Page</th></tr></thead>
          <tbody>{data.vues.map((v) => (
            <tr key={v.id}>
              <td className="meta">{dateHeure(v.le)}</td>
              <td><Link href={v.chemin}>{v.chemin}</Link></td>
            </tr>))}
          </tbody>
        </table></div>

        <h2>Téléchargements Sheets</h2>
        {data.telechargements.length === 0
          ? <p className="meta">Aucun export CSV.</p>
          : <div className="defile"><table className="stats">
              <thead><tr><th>Quand</th><th>Feuille</th><th>Lignes</th><th>IP</th></tr></thead>
              <tbody>{data.telechargements.map((t, i) => (
                <tr key={i}>
                  <td className="meta">{dateHeure(t.cree_le)}</td>
                  <td>{t.feuille}</td>
                  <td className="meta">{t.lignes}</td>
                  <td className="meta">{t.ip ?? "–"}</td>
                </tr>))}
              </tbody>
            </table></div>}

        <h2>Événements du compte</h2>
        <div className="defile"><table className="stats">
          <thead><tr><th>Quand</th><th>Événement</th></tr></thead>
          <tbody>{data.evenements.map((e, i) => (
            <tr key={i}>
              <td className="meta">{dateHeure(e.journalise_le)}</td>
              <td className="meta">{e.evenement}</td>
            </tr>))}
          </tbody>
        </table></div>
      </>}
    </>
  );
}