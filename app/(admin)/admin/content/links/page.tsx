"use client";
import { useState } from "react";
import { useAdmin } from "@/app/_components/admin/Porte";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";
import { LIENS_BASE } from "@/lib/env";

type Compte = { cle: string; n: number };
type Lien = { code: string; destination: string; titre: string; actif: boolean; cree_le: string; clics: number; sources: Compte[]; dernier: string | null };
type Detail = {
  lien: Lien; total: number; robots: number; reseaux: number; plafonne?: boolean; sources: Compte[]; pays: Compte[]; appareils: Compte[]; jours: Compte[];
  derniers: { le: string; ip: string | null; pays: string | null; source: string; appareil: string | null }[];
};
const adresseCourte = (code: string) => `${LIENS_BASE}/${code}`;

function Repartition({ titre, lignes, total }: { titre: string; lignes: Compte[]; total: number }) {
  return (
    <div>
      <h3>{titre}</h3>
      {lignes.length === 0 ? <p className="meta">Aucune ouverture.</p> : (
        <table className="stats"><tbody>{lignes.slice(0, 12).map((l) => (
          <tr key={l.cle}><td>{l.cle}</td><td className="num">{l.n}</td><td style={{ width: "40%" }}><div className="barre"><span style={{ width: `${(l.n / Math.max(1, total)) * 100}%`, background: "var(--bleu)" }} /></div></td></tr>
        ))}</tbody></table>
      )}
    </div>
  );
}

function DetailLien({ code, retour }: { code: string; retour: () => void }) {
  const { data, err } = useRessource<Detail>("/api/admin/content/links", { code });
  if (err) return <p className="erreur">{err}</p>;
  if (!data) return <p className="meta">Chargement…</p>;
  return (
    <>
      <p><button className="lien" onClick={retour}>← Tous les liens</button></p>
      <h2 style={{ marginTop: 0 }}>{data.lien.titre || data.lien.code}</h2>
      <p className="meta"><span className="mono">{adresseCourte(code)}</span> → <a href={data.lien.destination} target="_blank" rel="noreferrer">{data.lien.destination}</a></p>
      <div className="chiffres">
        <div><strong>{data.total}</strong><span>ouvertures</span></div>
        <div><strong>{data.reseaux}</strong><span>réseaux distincts (IP tronquées)</span></div>
        <div><strong>{data.robots}</strong><span>passages de robots (aperçus), non comptés</span></div>
      </div>
      {data.plafonne && <p className="meta">Statistiques calculées sur les 1 000 passages les plus récents.</p>}
      <div className="deux-colonnes">
        <Repartition titre="Par provenance" lignes={data.sources} total={data.total} />
        <Repartition titre="Par pays" lignes={data.pays} total={data.total} />
      </div>
      <Repartition titre="Par jour (30 derniers jours actifs)" lignes={data.jours} total={Math.max(1, ...data.jours.map((j) => j.n))} />
      <h3>Dernières ouvertures</h3>
      <div className="defile"><table className="stats">
        <thead><tr><th>Date</th><th>Provenance</th><th>Pays</th><th>Appareil</th><th>Adresse IP (tronquée)</th></tr></thead>
        <tbody>{data.derniers.map((c, i) => <tr key={i}><td>{dateHeure(c.le)}</td><td>{c.source}</td><td>{c.pays ?? "–"}</td><td>{c.appareil ?? "–"}</td><td className="mono">{c.ip ?? "–"}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}

export default function Liens() {
  const { api } = useAdmin();
  const { data, err, recharger } = useRessource<{ liens: Lien[] }>("/api/admin/content/links");
  const [f, setF] = useState({ destination: "", titre: "", code: "" });
  const [message, setMessage] = useState<{ ok: boolean; t: string } | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api<{ code: string }>("/api/admin/content/links", { method: "POST", body: { ...f, code: f.code || undefined } });
      setMessage({ ok: true, t: `Lien créé : ${adresseCourte(r.code)}` });
      setF({ destination: "", titre: "", code: "" });
      await recharger();
    } catch (e) { setMessage({ ok: false, t: (e as Error).message }); }
  }
  async function basculer(l: Lien) { await api("/api/admin/content/links", { method: "PATCH", body: { code: l.code, actif: !l.actif } }); recharger(); }
  async function supprimer(l: Lien) {
    if (!confirm(`Supprimer ${l.code} et ses statistiques ?`)) return;
    await api(`/api/admin/content/links?code=${l.code}`, { method: "DELETE" }); recharger();
  }
  function copier(code: string) { navigator.clipboard?.writeText(adresseCourte(code)).then(() => { setCopie(code); setTimeout(() => setCopie(null), 2000); }); }

  if (ouvert) return <><h1>Liens tracés</h1><DetailLien code={ouvert} retour={() => setOuvert(null)} /></>;
  return (
    <>
      <h1>Liens tracés</h1>
      <p className="meta">Des liens courts ({LIENS_BASE.replace("https://", "")}/code), avec le nombre d&apos;ouvertures et leur provenance (X, LinkedIn, Bluesky, Instagram, email…). Ajoute <span className="mono">?utm_source=linkedin</span> à un lien pour forcer la provenance.</p>
      <form className="card" style={{ maxWidth: 720 }} onSubmit={creer}>
        <h2 style={{ marginTop: 0 }}>Nouveau lien</h2>
        <label htmlFor="l-dest">Destination</label>
        <input id="l-dest" type="text" required value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} placeholder="https://www.dataparl.fr/vigiparl" />
        <div className="grille-2">
          <div><label htmlFor="l-titre">Nom (pour s&apos;y retrouver)</label><input id="l-titre" type="text" value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} placeholder="Post LinkedIn VigiParl'" /></div>
          <div><label htmlFor="l-code">Code <span className="meta">(vide = généré)</span></label><input id="l-code" type="text" className="mono" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="vigi-octobre" /></div>
        </div>
        {message && <p className={message.ok ? "ok" : "erreur"}>{message.t}</p>}
        <button>Créer le lien</button>
      </form>
      {err && <p className="erreur">{err}</p>}
      {data && (
        <div className="defile" style={{ marginTop: 24 }}><table className="stats">
          <thead><tr><th>Lien</th><th>Destination</th><th className="num">Ouvertures</th><th>Provenances</th><th>Créé</th><th></th></tr></thead>
          <tbody>
            {data.liens.map((l) => (
              <tr key={l.code}>
                <td><strong>{l.titre || l.code}</strong><br /><button className="lien mono" onClick={() => copier(l.code)}>{copie === l.code ? "copié" : adresseCourte(l.code).replace("https://", "")}</button>{!l.actif && <span className="meta">, inactif</span>}</td>
                <td className="meta" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{l.destination}</td>
                <td className="num">{l.clics}</td>
                <td className="meta">{l.sources.map((s) => `${s.cle} ${s.n}`).join(", ") || "–"}</td>
                <td className="meta">{dateHeure(l.cree_le)}</td>
                <td className="actions" style={{ flexWrap: "nowrap" }}>
                  <button className="lien" onClick={() => setOuvert(l.code)}>Statistiques</button>, <button className="lien" onClick={() => basculer(l)}>{l.actif ? "Désactiver" : "Activer"}</button>, <button className="lien" onClick={() => supprimer(l)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {data.liens.length === 0 && <tr><td colSpan={6} className="meta">Aucun lien pour l&apos;instant.</td></tr>}
          </tbody>
        </table></div>
      )}
    </>
  );
}
