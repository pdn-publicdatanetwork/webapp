"use client";
import { useAdmin } from "@/app/_components/admin/Porte";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";

type Moniteur = { id: number; friendly_name: string; url: string; status: number; custom_uptime_ratio: string; average_response_time: number };
type ProjetSentry = { nom: string; url: string; evenements_24h: number };
type Sante = {
  base_data: { ok: boolean; detail?: string };
  base_auth: { ok: boolean; detail?: string };
  uptimerobot: { configure: boolean; erreur?: string; moniteurs: Moniteur[] };
  sentry: { configure: boolean; erreur?: string; projets: ProjetSentry[] };
  date: string;
};

const ETAT_UR: Record<number, string> = { 0: "en pause", 1: "jamais vérifié", 2: "up", 8: "semble down", 9: "down" };

function Pastille({ ok, label }: { ok: boolean; label: string }) {
  return <span className={ok ? "ok" : "erreur"}>{ok ? "✓" : "✗"} {label}</span>;
}

export default function Sante() {
  useAdmin();
  const { data: s, err } = useRessource<Sante>("/api/admin/sante");
  if (err) return <p className="erreur">{err}</p>;
  if (!s) return <p className="meta">Chargement…</p>;

  const toutOk =
    s.base_data.ok && s.base_auth.ok &&
    s.uptimerobot.moniteurs.every((m) => m.status === 2 || m.status === 0) &&
    !s.uptimerobot.erreur && !s.sentry.erreur;

  return (
    <>
      <h1>Santé DataParl&rsquo;</h1>
      <p className="chiffres">
        <div><strong className={toutOk ? "ok" : "erreur"}>{toutOk ? "Tout va bien" : "Attention"}</strong></div>
      </p>

      <h2>Infrastructures</h2>
      <ul>
        <li><Pastille ok={s.base_data.ok} label="Base de données (dataparl)" />{s.base_data.detail ? <span className="meta"> : {s.base_data.detail}</span> : null}</li>
        <li><Pastille ok={s.base_auth.ok} label="Base d&rsquo;authentification" />{s.base_auth.detail ? <span className="meta"> : {s.base_auth.detail}</span> : null}</li>
      </ul>

      <h2>Moniteurs UptimeRobot</h2>
      {s.uptimerobot.configure ? (
        <p className="meta">Non configuré : ajouter la variable d&rsquo;environnement UPTIMEROBOT_API_KEY (clé en lecture seule) dans Vercel.</p>
      ) : s.uptimerobot.erreur ? (
        <p className="erreur">UptimeRobot indisponible : {s.uptimerobot.erreur}</p>
      ) : s.uptimerobot.moniteurs.length === 0 ? (
        <p className="meta">Aucun moniteur.</p>
      ) : (
        <table className="stats">
          <thead><tr><th>Moniteur</th><th>État</th><th className="num">Latence (30 j)</th><th className="num">Uptime 1 j</th><th className="num">7 j</th><th className="num">30 j</th></tr></thead>
          <tbody>
            {s.uptimerobot.moniteurs.map((m) => {
              const [j1, j7, j30] = (m.custom_uptime_ratio ?? "").split("-");
              return (
                <tr key={m.id}>
                  <td>{m.friendly_name}<br /><span className="meta">{m.url}</span></td>
                  <td className={m.status === 2 ? "ok" : m.status === 0 ? "meta" : "erreur"}>{ETAT_UR[m.status] ?? "?"}</td>
                  <td className="num">{m.average_response_time ? `${m.average_response_time} ms` : ":"}</td>
                  <td className="num">{j1 ?? ":"} %</td>
                  <td className="num">{j7 ?? ":"} %</td>
                  <td className="num">{j30 ?? ":"} %</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>Erreurs Sentry (24 dernières heures)</h2>
      {s.sentry.configure ? (
        <p className="meta">Non configuré : ajouter la variable d&rsquo;environnement SENTRY_AUTH_TOKEN dans Vercel (Sentry → Settings → Auth Tokens, portée lecture).</p>
      ) : s.sentry.erreur ? (
        <p className="erreur">Sentry indisponible : {s.sentry.erreur}</p>
      ) : (
        <table className="stats">
          <thead><tr><th>Projet</th><th className="num">Événements 24 h</th></tr></thead>
          <tbody>
            {s.sentry.projets.map((p) => (
              <tr key={p.nom}>
                <td><a href={p.url}>{p.nom}</a></td>
                <td className={p.evenements_24h > 0 ? "erreur num" : "ok num"}>{p.evenements_24h}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="meta">Mis à jour le {dateHeure(s.date)}.</p>
    </>
  );
}
