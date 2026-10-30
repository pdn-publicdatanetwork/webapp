"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "@/app/_components/admin/Porte";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";
import Onglets from "../Onglets";
import EditeurTexte from "./EditeurTexte";

type Resume = { id: string; slug: string; titre: string; statut: "brouillon" | "publie"; publie_le: string | null; maj_le: string };
type Envoi = { id: string; cree_le: string; n_destinataires: number; n_echecs: number; ouvertures: number; lecteurs: string[] };
type Detail = { communique: Resume & { chapo: string; corps: string }; envois: Envoi[]; clics: number; lien: string | null };
const VIDE = { titre: "", chapo: "", corps: "" };

function Editeur({ id, retour }: { id: string | null; retour: () => void }) {
  const { api } = useAdmin();
  const [courant, setCourant] = useState(id);
  const [f, setF] = useState(VIDE);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const url = "/api/admin/communication/communiques";

  async function charger(i: string) {
    const d = await api<Detail>(url, { query: { id: i } });
    setDetail(d); setF({ titre: d.communique.titre, chapo: d.communique.chapo, corps: d.communique.corps });
  }
  useEffect(() => { if (courant) charger(courant).catch((e) => setMessage({ ok: false, t: (e as Error).message })); }, [courant]); // eslint-disable-line react-hooks/exhaustive-deps

  async function faire(body: Record<string, unknown>, succes: string | ((r: Record<string, unknown>) => string), confirmation?: string) {
    if (confirmation && !confirm(confirmation)) return;
    setOccupe(true); setMessage(null);
    try {
      const r = await api<Record<string, unknown>>(url, { method: "POST", body });
      setMessage({ ok: true, t: typeof succes === "string" ? succes : succes(r) });
      if (body.action === "creer") setCourant(r.id as string);
      else if (body.action === "supprimer") return retour();
      else if (courant && body.action !== "apercu") await charger(courant);
      return r;
    } catch (e) { setMessage({ ok: false, t: (e as Error).message }); }
    finally { setOccupe(false); }
  }
  const enregistrer = () => faire(courant ? { action: "enregistrer", id: courant, ...f } : { action: "creer", ...f }, "Enregistré.");
  async function voir() { const r = await faire({ action: "apercu", ...f }, "Aperçu mis à jour."); if (r) setApercu(r.html as string); }
  const publie = detail?.communique.statut === "publie";

  return (
    <>
      <p><button className="lien" onClick={retour}>← Tous les communiqués</button></p>
      <div className="deux-colonnes">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{courant ? "Modifier le communiqué" : "Nouveau communiqué"}</h2>
          <label htmlFor="cp-t">Titre</label>
          <input id="cp-t" type="text" value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} maxLength={160} />
          <label htmlFor="cp-c">Chapô <span className="meta">(l&apos;essentiel en deux phrases)</span></label>
          <textarea id="cp-c" rows={3} value={f.chapo} onChange={(e) => setF({ ...f, chapo: e.target.value })} maxLength={600} />
          <label htmlFor="cp-x">Texte</label>
          <EditeurTexte id="cp-x" value={f.corps} onChange={(corps) => setF({ ...f, corps })} />
          {message && <p className={message.ok ? "ok" : "erreur"}>{message.t}</p>}
          <div className="actions">
            <button disabled={occupe || f.titre.trim().length < 3} onClick={enregistrer}>Enregistrer</button>
            <button className="secondaire" disabled={occupe || f.titre.trim().length < 3} onClick={voir}>Aperçu de l&apos;email</button>
          </div>
          {courant && detail && (
            <>
              <h3>Diffusion</h3>
              <p className="meta">
                {publie ? <>Publié sur <a href={`https://www.dataparl.fr/presse/communiques/${detail.communique.slug}`} target="_blank" rel="noreferrer">dataparl.fr/presse/communiques/{detail.communique.slug}</a></> : "Brouillon : invisible sur le site."}
              </p>
              <div className="actions">
                <button className="secondaire" disabled={occupe} onClick={() => faire({ action: "publier", id: courant, publie: !publie }, publie ? "Dépublié." : "Publié sur le site.")}>{publie ? "Dépublier" : "Publier sur le site"}</button>
                <button className="secondaire" disabled={occupe} onClick={() => faire({ action: "test", id: courant }, (r) => `Test envoyé à ${r.a}.`)}>M&apos;envoyer un test</button>
                <button disabled={occupe || !publie} onClick={() => faire({ action: "envoyer", id: courant }, (r) => `Envoyé à ${r.envoyes} journaliste(s)${r.echecs ? `, ${r.echecs} échec(s)` : ""}.${r.restants ? ` Il en reste ${r.restants} : clique à nouveau pour le lot suivant.` : ""}`, "Envoyer ce communiqué aux contacts actifs du carnet presse qui ne l'ont pas encore reçu ? Enregistre d'abord tes modifications.")}>{occupe ? "Envoi…" : "Envoyer au carnet presse"}</button>
                <button className="danger" disabled={occupe} onClick={() => faire({ action: "supprimer", id: courant }, "", "Supprimer ce communiqué ?")}>Supprimer</button>
              </div>
              <h3>Suivi</h3>
              {detail.envois.length === 0 ? <p className="meta">Pas encore envoyé.</p> : (
                <>
                  <p>{detail.clics} clic(s) sur « Lire le communiqué en ligne »{detail.lien && <>, lien tracé <span className="mono">{detail.lien}</span></>}</p>
                  <table className="stats">
                    <thead><tr><th>Envoi</th><th className="num">Destinataires</th><th className="num">Ouvertures</th><th className="num">Échecs</th></tr></thead>
                    <tbody>{detail.envois.map((e) => (
                      <tr key={e.id}><td>{dateHeure(e.cree_le)}</td><td className="num">{e.n_destinataires}</td>
                        <td className="num" title={e.lecteurs.join(", ")}>{e.ouvertures}</td><td className="num">{e.n_echecs}</td></tr>
                    ))}</tbody>
                  </table>
                  {detail.envois.some((e) => e.lecteurs.length > 0) && <details className="tableau"><summary>Qui a ouvert</summary><p className="meta">{[...new Set(detail.envois.flatMap((e) => e.lecteurs))].join(", ")}</p></details>}
                </>
              )}
            </>
          )}
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Aperçu</h2>
          {apercu ? <iframe title="Aperçu du communiqué" srcDoc={apercu} sandbox="" style={{ width: "100%", height: 720, border: "1px solid var(--line)", borderRadius: 8, background: "#F6F4EC" }} />
            : <p className="meta">Clique sur « Aperçu de l&apos;email » pour voir le communiqué tel qu&apos;il arrivera, à la charte DataParl&apos;.</p>}
        </div>
      </div>
    </>
  );
}

export default function Communiques() {
  const { data, err, recharger } = useRessource<{ communiques: Resume[] }>("/api/admin/communication/communiques");
  const { api } = useAdmin();
  const [sync, setSync] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  async function depuisNotion() {
    setOccupe(true); setSync(null);
    try {
      const r = await api<{ publies: number; misAJour: number; retires: number; erreurs: string[] }>("/api/admin/communication/communiques", { method: "POST", body: { action: "sync-notion" } });
      setSync(r.publies + " publié(s), " + r.misAJour + " mis à jour, " + r.retires + " retiré(s)" + (r.erreurs.length ? " : " + r.erreurs[0] : ""));
      recharger();
    } catch (e) { setSync((e as Error).message); }
    finally { setOccupe(false); }
  }
  const [edition, setEdition] = useState<string | null | undefined>(undefined); // undefined : liste ; null : nouveau
  if (edition !== undefined) return <><h1>Communiqués de presse</h1><Onglets /><Editeur id={edition} retour={() => { setEdition(undefined); recharger(); }} /></>;
  return (
    <>
      <h1>Communiqués de presse</h1>
      <Onglets />
      <p className="actions">
        <button onClick={() => setEdition(null)}>Nouveau communiqué</button>
        <button className="secondaire" disabled={occupe} onClick={depuisNotion}>{occupe ? "Synchronisation…" : "Synchroniser depuis Notion"}</button>
      </p>
      {sync && <p className="meta">{sync}</p>}
      {err && <p className="erreur">{err}</p>}
      {data && (
        <div className="defile"><table className="stats">
          <thead><tr><th>Titre</th><th>État</th><th>Modifié</th><th></th></tr></thead>
          <tbody>
            {data.communiques.map((c) => (
              <tr key={c.id}><td><strong>{c.titre}</strong></td><td>{c.statut === "publie" ? <span className="ok">Publié</span> : <span className="meta">Brouillon</span>}</td>
                <td className="meta">{dateHeure(c.maj_le)}</td><td><button className="lien" onClick={() => setEdition(c.id)}>Ouvrir</button></td></tr>
            ))}
            {data.communiques.length === 0 && <tr><td colSpan={4} className="meta">Aucun communiqué pour l&apos;instant.</td></tr>}
          </tbody>
        </table></div>
      )}
    </>
  );
}
