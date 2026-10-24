"use client";
// Plateforme de dépôt de fichiers : tout ce qui est envoyé ici atterrit dans le
// bucket public Supabase « assets » et est servi par media.dataparl.fr/assets/…
import { useCallback, useEffect, useState } from "react";

type Entree = { chemin: string; taille: number | null; maj: string | null };
const MEDIA = "https://media.dataparl.fr/assets";

export default function PageAssets() {
  const [dossier, setDossier] = useState("logos");
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [message, setMessage] = useState("");
  const [occupe, setOccupe] = useState(false);

  const lister = useCallback(async (prefix: string) => {
    try {
      const r = await fetch(`/api/admin/assets?prefix=${encodeURIComponent(prefix)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "liste indisponible");
      setEntrees(j.entrees ?? []);
    } catch (e) { setMessage(e instanceof Error ? e.message : "erreur"); }
  }, []);

  useEffect(() => { lister(dossier); }, [dossier, lister]);

  async function deposer() {
    if (!fichiers.length) { setMessage("Choisis au moins un fichier."); return; }
    setOccupe(true); setMessage("");
    try {
      const form = new FormData();
      form.set("dossier", dossier);
      for (const f of fichiers) form.append("fichiers", f);
      const r = await fetch("/api/admin/assets", { method: "POST", body: form });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "dépôt impossible");
      setMessage(`${j.deposes.length} fichier(s) déposé(s) : ${j.deposes.map((d: { media: string }) => d.media).join(" · ")}`);
      setFichiers([]);
      const input = document.getElementById("depot-fichiers") as HTMLInputElement | null;
      if (input) input.value = "";
      lister(dossier);
    } catch (e) { setMessage(e instanceof Error ? e.message : "erreur"); }
    finally { setOccupe(false); }
  }

  async function supprimer(chemin: string) {
    if (!confirm(`Supprimer ${chemin} ?`)) return;
    try {
      const r = await fetch("/api/admin/assets", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chemin }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "suppression impossible");
      lister(dossier);
    } catch (e) { setMessage(e instanceof Error ? e.message : "erreur"); }
  }

  return (
    <>
      <h1>Dépôt de fichiers</h1>
      <p className="meta">Les fichiers atterrissent dans le bucket public Supabase « assets » et sont servis par <strong>media.dataparl.fr/assets/…</strong> (URL publique, sans expiration).</p>
      <div className="card" style={{ maxWidth: "none" }}>
        <label htmlFor="depot-dossier">Dossier cible</label>
        <input id="depot-dossier" value={dossier} onChange={(e) => setDossier(e.target.value)} placeholder="logos" />
        <input id="depot-fichiers" type="file" multiple onChange={(e) => setFichiers(Array.from(e.target.files ?? []))} />
        <button className="btn" onClick={deposer} disabled={occupe}>{occupe ? "Dépôt en cours…" : "Déposer"}</button>
        {message && <p className="meta" style={{ marginTop: 10 }}>{message}</p>}
      </div>
      <h2>Fichiers de « {dossier}/ »</h2>
      {entrees.length === 0 ? <p className="meta">Aucun fichier dans ce dossier.</p> : (
        <table className="feuille-grille">
          <thead><tr><th>Fichier</th><th>Taille</th><th>Modifié</th><th>URL publique</th><th></th></tr></thead>
          <tbody>
            {entrees.map((e) => (
              <tr key={e.chemin}>
                <td>{e.chemin}</td>
                <td>{e.taille ? `${Math.max(1, Math.round(e.taille / 1024))} Ko` : "—"}</td>
                <td>{e.maj?.slice(0, 10) ?? "—"}</td>
                <td><a href={`${MEDIA}/${e.chemin}`} target="_blank" rel="noreferrer">{MEDIA}/{e.chemin}</a></td>
                <td><button className="btn secondaire" onClick={() => supprimer(e.chemin)}>Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
