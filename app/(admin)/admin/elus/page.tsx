"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "@/app/_components/admin/Porte";
import { dateHeure } from "@/app/_components/admin/utils";

// Espace Élus : gérer à la main la biographie, les mandats et les fonctions
// d'un parlementaire : en complément des données synchronisées chaque nuit.

type Fiche = {
  personne_id: string; elu_id: string; slug: string; chambre: string; civilite: string;
  prenom: string; nom: string; date_naissance: string; actif: boolean; circonscription: string;
  departement: string; groupe: string; groupe_libelle: string; photo_url: string;
  url_officielle: string; premier_mandat: string; fin_mandat: string;
};
type MandatSync = { id: string; chambre: string; libelle: string; circonscription: string; debut: string; fin: string; cause_fin: string };
type Appartenance = { id: string; chambre: string; type: string; libelle: string; sigle: string; fonction: string; debut: string; fin: string };
type Bio = { id: string; personne_id: string; texte: string; source: string; actif: boolean; cree_par: string; maj_par: string; cree_le: string; maj_le: string };
type MandatManuel = { id: string; personne_id: string; chambre: string; elu_id: string; libelle: string; circonscription: string; debut: string; fin: string; cause_fin: string; source: string; actif: boolean; maj_par: string; maj_le: string };
type FonctionManuelle = { id: string; personne_id: string; chambre: string; type: string; code: string; libelle: string; sigle: string; fonction: string; debut: string; fin: string; source: string; actif: boolean; maj_par: string; maj_le: string };
type Detail = { fiche: Fiche; mandats: MandatSync[]; appartenances: Appartenance[]; bio: Bio | null; mandats_manuels: MandatManuel[]; fonctions_manuelles: FonctionManuelle[] };
type Resultat = { personne_id: string; slug: string; chambre: string; civilite: string; prenom: string; nom: string; actif: boolean; circonscription: string; groupe: string };

const TYPES_FONCTION = ["fonction", "commission", "groupe"] as const;
const nomComplet = (p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`.trim();

export default function EspaceElus() {
  const { api } = useAdmin();
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [personneId, setPersonneId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResultats([]); return; }
    const t = setTimeout(async () => {
      setEnCours(true);
      try { setResultats((await api<{ elus: Resultat[] }>("/api/admin/elus", { query: { q } })).elus); }
      catch (e) { setMessage({ ok: false, t: (e as Error).message }); }
      finally { setEnCours(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, api]);

  async function ouvrir(personne_id: string) {
    setPersonneId(personne_id);
    setDetail(null);
    setMessage(null);
    try { setDetail(await api<Detail>("/api/admin/elus", { query: { personne_id } })); }
    catch (e) { setMessage({ ok: false, t: (e as Error).message }); }
  }
  const recharger = () => personneId && ouvrir(personneId);
  const dire = (ok: boolean, t: string) => { setMessage({ ok, t }); recharger(); };

  if (!personneId) return (
    <>
      <h1>Élus</h1>
      <p className="meta">Recherche un parlementaire pour gérer sa biographie, ses mandats et ses fonctions : en complément des données officielles synchronisées chaque nuit (elles ne sont jamais modifiées).</p>
      <label htmlFor="e-rech">Rechercher un élu</label>
      <input id="e-rech" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, prénom ou circonscription…" autoFocus />
      {enCours && <p className="meta">Recherche…</p>}
      {message && !message.ok && <p className="erreur">{message.t}</p>}
      {resultats.length > 0 && (
        <div className="defile" style={{ marginTop: 16 }}><table className="stats">
          <thead><tr><th>Élu</th><th>Chambre</th><th>Circonscription</th><th>Groupe</th><th></th></tr></thead>
          <tbody>{resultats.map((r) => (
            <tr key={r.personne_id}>
              <td><strong>{nomComplet(r)}</strong>{!r.actif && <span className="meta">, ancien ne</span>}</td>
              <td className="meta">{r.chambre || "–"}</td>
              <td className="meta">{r.circonscription || "–"}</td>
              <td className="meta">{r.groupe || "–"}</td>
              <td><button className="lien" onClick={() => ouvrir(r.personne_id)}>Gérer</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );

  return (
    <>
      <p><button className="lien" onClick={() => { setPersonneId(null); setDetail(null); setResultats([]); }}>← Nouvelle recherche</button></p>
      {detail ? <FicheElu d={detail} api={api} dire={dire} recharger={recharger} /> : <p className="meta">Chargement…</p>}
      {message && <p className={message.ok ? "ok" : "erreur"}>{message.t}</p>}
    </>
  );
}

function FicheElu({ d, api, dire, recharger }: {
  d: Detail;
  api: ReturnType<typeof useAdmin>["api"];
  dire: (ok: boolean, t: string) => void;
  recharger: () => void;
}) {
  const f = d.fiche;
  return (
    <>
      <h1>{nomComplet(f)}</h1>
      <p className="meta">
        {f.chambre}, {f.circonscription || "sans circonscription"}{f.groupe ? `, groupe ${f.groupe}` : ""}, {f.actif ? <span className="ok">en cours de mandat</span> : "mandat terminé"},{" "}
        <a href={`https://www.dataparl.fr/parlementaires/${encodeURIComponent(f.slug)}/bio`} target="_blank" rel="noreferrer">voir la bio publique ↗</a>
      </p>
      <BioPanel bio={d.bio} personneId={f.personne_id} api={api} dire={dire} />
      <MandatsPanel personneId={f.personne_id} mandatsSync={d.mandats} manuels={d.mandats_manuels} api={api} dire={dire} recharger={recharger} />
      <FonctionsPanel personneId={f.personne_id} appartenances={d.appartenances} manuelles={d.fonctions_manuelles} api={api} dire={dire} recharger={recharger} />
    </>
  );
}

function BioPanel({ bio, personneId, api, dire }: { bio: Bio | null; personneId: string; api: ReturnType<typeof useAdmin>["api"]; dire: (ok: boolean, t: string) => void }) {
  const [texte, setTexte] = useState(bio?.texte ?? "");
  const [source, setSource] = useState(bio?.source ?? "");
  const [actif, setActif] = useState(bio?.actif ?? false);
  const [occupe, setOccupe] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setOccupe(true);
    try {
      await api("/api/admin/elus/bio", { method: "PUT", body: { personne_id: personneId, texte, source, actif } });
      dire(true, actif ? "Biographie enregistrée et activée : visible sur le site." : "Biographie enregistrée (désactivée : invisible sur le site).");
    } catch (e) { dire(false, (e as Error).message); }
    finally { setOccupe(false); }
  }
  async function basculer() {
    try { await api("/api/admin/elus/bio", { method: "PATCH", body: { personne_id: personneId, actif: !actif } }); setActif(!actif); dire(true, !actif ? "Biographie activée." : "Biographie désactivée."); }
    catch (e) { dire(false, (e as Error).message); }
  }
  async function supprimer() {
    if (!confirm("Supprimer la biographie manuelle ? Les données synchronisées ne sont pas touchées.")) return;
    try { await api(`/api/admin/elus/bio?personne_id=${encodeURIComponent(personneId)}`, { method: "DELETE" }); dire(true, "Biographie supprimée."); setTexte(""); setSource(""); setActif(false); }
    catch (e) { dire(false, (e as Error).message); }
  }

  return (
    <form className="card" style={{ maxWidth: 860 }} onSubmit={enregistrer}>
      <h2 style={{ marginTop: 0 }}>Biographie {bio ? <span className={actif ? "ok" : "meta"}>{actif ? ", active sur le site" : ", désactivée"}</span> : <span className="meta">, aucune bio manuelle</span>}</h2>
      <label htmlFor="b-texte">Texte de la biographie</label>
      <textarea id="b-texte" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ex. : Née en 1978 à Bordeaux, … élue sénatrice de la Gironde en 2026, elle siège à la commission des Lois…" style={{ minHeight: 220 }} />
      <div className="grille-2">
        <div>
          <label htmlFor="b-source">Source <span className="meta">(affichée sous la bio)</span></label>
          <input id="b-source" type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Rédaction DataParl' / entretien / Wikipédia adaptée…" />
        </div>
        <div>
          <label htmlFor="b-actif">Affichage</label>
          <select id="b-actif" value={actif ? "1" : "0"} onChange={(e) => setActif(e.target.value === "1")}>
            <option value="1">Active : affichée sur dataparl.fr</option>
            <option value="0">Désactivée : brouillon invisible</option>
          </select>
        </div>
      </div>
      {bio && <p className="meta">Dernière modification : {dateHeure(bio.maj_le)} par {bio.maj_par || "?"}</p>}
      <div className="actions" style={{ flexWrap: "nowrap" }}>
        <button disabled={occupe || !texte.trim()}>{bio ? "Enregistrer" : "Créer la biographie"}</button>
        {bio && <>, <button type="button" className="lien" onClick={basculer}>{actif ? "Désactiver" : "Activer"}</button></>}
        {bio && <>, <button type="button" className="lien" onClick={supprimer}>Supprimer</button></>}
      </div>
    </form>
  );
}

type PanelProps = { api: ReturnType<typeof useAdmin>["api"]; dire: (ok: boolean, t: string) => void; recharger: () => void; personneId: string };

function MandatsPanel({ personneId, mandatsSync, manuels, api, dire, recharger }: PanelProps & { mandatsSync: MandatSync[]; manuels: MandatManuel[] }) {
  const vide = { chambre: "", libelle: "", circonscription: "", debut: "", fin: "", cause_fin: "", source: "" };
  const [f, setF] = useState(vide);
  const [edition, setEdition] = useState<string | null>(null);
  const edite = manuels.find((m) => m.id === edition);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    try {
      const corps = { ...f, personne_id: personneId, ...(f.chambre ? {} : { chambre: "" }) };
      if (edite) await api("/api/admin/elus/mandat", { method: "PUT", body: { ...corps, id: edite.id } });
      else await api("/api/admin/elus/mandat", { method: "POST", body: corps });
      dire(true, edite ? "Mandat modifié." : "Mandat créé.");
      setF(vide); setEdition(null);
    } catch (e) { dire(false, (e as Error).message); }
  }
  async function basculer(m: MandatManuel) {
    try { await api("/api/admin/elus/mandat", { method: "PUT", body: { id: m.id, actif: !m.actif } }); dire(true, m.actif ? "Mandat masqué." : "Mandat affiché."); }
    catch (e) { dire(false, (e as Error).message); }
  }
  async function supprimer(m: MandatManuel) {
    if (!confirm(`Supprimer le mandat « ${m.libelle} » ?`)) return;
    try { await api(`/api/admin/elus/mandat?id=${encodeURIComponent(m.id)}`, { method: "DELETE" }); dire(true, "Mandat supprimé."); }
    catch (e) { dire(false, (e as Error).message); }
  }
  function modifier(m: MandatManuel) {
    setEdition(m.id);
    setF({ chambre: m.chambre ?? "", libelle: m.libelle, circonscription: m.circonscription ?? "", debut: m.debut ?? "", fin: m.fin ?? "", cause_fin: m.cause_fin ?? "", source: m.source ?? "" });
  }

  return (
    <section className="card" style={{ maxWidth: 860 }}>
      <h2 style={{ marginTop: 0 }}>Mandats</h2>
      <h3>Synchronisés (lecture seule)</h3>
      {mandatsSync.length === 0 ? <p className="meta">Aucun mandat synchronisé.</p> : (
        <div className="defile"><table className="stats">
          <thead><tr><th>Mandat</th><th>Circonscription</th><th>Début</th><th>Fin</th><th>Cause</th></tr></thead>
          <tbody>{mandatsSync.map((m) => (
            <tr key={m.id}>
              <td>{m.libelle} <span className="meta">{m.chambre}</span></td>
              <td className="meta">{m.circonscription || "–"}</td>
              <td className="meta">{m.debut || ":"}</td>
              <td className="meta">{m.fin || "en cours"}</td>
              <td className="meta">{m.cause_fin || "–"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      <h3>Manuels {manuels.length > 0 && <span className="meta">({manuels.length})</span>}</h3>
      {manuels.length > 0 && (
        <div className="defile"><table className="stats">
          <thead><tr><th>Mandat</th><th>Début</th><th>Fin</th><th>État</th><th></th></tr></thead>
          <tbody>{manuels.map((m) => (
            <tr key={m.id}>
              <td><strong>{m.libelle}</strong>{m.circonscription ? <span className="meta">, {m.circonscription}</span> : ""}{m.chambre && <span className="meta">, {m.chambre}</span>}</td>
              <td className="meta">{m.debut || ":"}</td>
              <td className="meta">{m.fin || "en cours"}</td>
              <td>{m.actif ? <span className="ok">affiché</span> : <span className="meta">masqué</span>}</td>
              <td className="actions" style={{ flexWrap: "nowrap" }}>
                <button className="lien" onClick={() => modifier(m)}>Modifier</button>, <button className="lien" onClick={() => basculer(m)}>{m.actif ? "Masquer" : "Afficher"}</button>, <button className="lien" onClick={() => supprimer(m)}>Supprimer</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      <form onSubmit={soumettre}>
        <h3>{edite ? `Modifier « ${edite.libelle} »` : "Ajouter un mandat"}</h3>
        <div className="grille-2">
          <div>
            <label htmlFor="m-lib">Libellé</label>
            <input id="m-lib" type="text" required value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} placeholder="Sénateur, Maire de Bordeaux, Ministre…" />
          </div>
          <div>
            <label htmlFor="m-ch">Chambre / collectivité</label>
            <input id="m-ch" type="text" value={f.chambre} onChange={(e) => setF({ ...f, chambre: e.target.value })} placeholder="senat, local, gouvernement… (libre)" />
          </div>
          <div>
            <label htmlFor="m-cir">Circonscription / collectivité</label>
            <input id="m-cir" type="text" value={f.circonscription} onChange={(e) => setF({ ...f, circonscription: e.target.value })} placeholder="Gironde, Ville de Paris…" />
          </div>
          <div>
            <label htmlFor="m-src">Source</label>
            <input id="m-src" type="text" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Site du Sénat, presse locale…" />
          </div>
          <div>
            <label htmlFor="m-deb">Début <span className="meta">(vide = inconnue)</span></label>
            <input id="m-deb" type="date" value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} />
          </div>
          <div>
            <label htmlFor="m-fin">Fin <span className="meta">(vide = en cours)</span></label>
            <input id="m-fin" type="date" value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} />
          </div>
          <div>
            <label htmlFor="m-cause">Cause de fin</label>
            <input id="m-cause" type="text" value={f.cause_fin} onChange={(e) => setF({ ...f, cause_fin: e.target.value })} placeholder="Fin de mandat, démission…" />
          </div>
        </div>
        <div className="actions" style={{ flexWrap: "nowrap" }}>
          <button>{edite ? "Enregistrer le mandat" : "Créer le mandat"}</button>
          {edite && <>, <button type="button" className="lien" onClick={() => { setEdition(null); setF(vide); }}>Annuler</button></>}
        </div>
      </form>
    </section>
  );
}

function FonctionsPanel({ personneId, appartenances, manuelles, api, dire, recharger }: PanelProps & { appartenances: Appartenance[]; manuelles: FonctionManuelle[] }) {
  const vide = { type: "fonction", chambre: "", libelle: "", sigle: "", fonction: "", debut: "", fin: "", source: "" };
  const [f, setF] = useState(vide);
  const [edition, setEdition] = useState<string | null>(null);
  const edite = manuelles.find((m) => m.id === edition);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    try {
      const corps = { ...f, personne_id: personneId };
      if (edite) await api("/api/admin/elus/fonction", { method: "PUT", body: { ...corps, id: edite.id } });
      else await api("/api/admin/elus/fonction", { method: "POST", body: corps });
      dire(true, edite ? "Fonction modifiée." : "Fonction créée.");
      setF(vide); setEdition(null);
    } catch (e) { dire(false, (e as Error).message); }
  }
  async function basculer(m: FonctionManuelle) {
    try { await api("/api/admin/elus/fonction", { method: "PUT", body: { id: m.id, actif: !m.actif } }); dire(true, m.actif ? "Fonction masquée." : "Fonction affichée."); }
    catch (e) { dire(false, (e as Error).message); }
  }
  async function supprimer(m: FonctionManuelle) {
    if (!confirm(`Supprimer « ${m.libelle} » ?`)) return;
    try { await api(`/api/admin/elus/fonction?id=${encodeURIComponent(m.id)}`, { method: "DELETE" }); dire(true, "Fonction supprimée."); }
    catch (e) { dire(false, (e as Error).message); }
  }
  function modifier(m: FonctionManuelle) {
    setEdition(m.id);
    setF({ type: m.type, chambre: m.chambre ?? "", libelle: m.libelle, sigle: m.sigle ?? "", fonction: m.fonction ?? "", debut: m.debut ?? "", fin: m.fin ?? "", source: m.source ?? "" });
  }

  return (
    <section className="card" style={{ maxWidth: 860 }}>
      <h2 style={{ marginTop: 0 }}>Fonctions et commissions</h2>
      <h3>Synchronisées (lecture seule) : {appartenances.length}</h3>
      {appartenances.length === 0 ? <p className="meta">Aucune appartenance synchronisée.</p> : (
        <div className="defile"><table className="stats">
          <thead><tr><th>Fonction</th><th>Type</th><th>Rôle</th><th>Période</th></tr></thead>
          <tbody>{appartenances.slice(0, 30).map((a) => (
            <tr key={a.id}>
              <td>{a.libelle}{a.sigle && <span className="meta"> ({a.sigle})</span>}</td>
              <td className="meta">{a.type}</td>
              <td className="meta">{a.fonction || "–"}</td>
              <td className="meta">{a.debut || "?"} → {a.fin || "en cours"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      <h3>Manuelles {manuelles.length > 0 && <span className="meta">({manuelles.length})</span>}</h3>
      {manuelles.length > 0 && (
        <div className="defile"><table className="stats">
          <thead><tr><th>Fonction</th><th>Rôle</th><th>Période</th><th>État</th><th></th></tr></thead>
          <tbody>{manuelles.map((m) => (
            <tr key={m.id}>
              <td><strong>{m.libelle}</strong>{m.sigle && <span className="meta"> ({m.sigle})</span>}<span className="meta">, {m.type}</span></td>
              <td className="meta">{m.fonction || "–"}</td>
              <td className="meta">{m.debut || "?"} → {m.fin || "en cours"}</td>
              <td>{m.actif ? <span className="ok">affichée</span> : <span className="meta">masquée</span>}</td>
              <td className="actions" style={{ flexWrap: "nowrap" }}>
                <button className="lien" onClick={() => modifier(m)}>Modifier</button>, <button className="lien" onClick={() => basculer(m)}>{m.actif ? "Masquer" : "Afficher"}</button>, <button className="lien" onClick={() => supprimer(m)}>Supprimer</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      <form onSubmit={soumettre}>
        <h3>{edite ? `Modifier « ${edite.libelle} »` : "Ajouter une fonction"}</h3>
        <div className="grille-2">
          <div>
            <label htmlFor="f-type">Type</label>
            <select id="f-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              {TYPES_FONCTION.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-lib">Libellé</label>
            <input id="f-lib" type="text" required value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} placeholder="Commission des Lois, Conseil municipal de Lyon…" />
          </div>
          <div>
            <label htmlFor="f-role">Rôle</label>
            <input id="f-role" type="text" value={f.fonction} onChange={(e) => setF({ ...f, fonction: e.target.value })} placeholder="Président, rapporteur, membre…" />
          </div>
          <div>
            <label htmlFor="f-sigle">Sigle</label>
            <input id="f-sigle" type="text" value={f.sigle} onChange={(e) => setF({ ...f, sigle: e.target.value })} placeholder="LOI, LR…" />
          </div>
          <div>
            <label htmlFor="f-deb">Début <span className="meta">(vide = inconnue)</span></label>
            <input id="f-deb" type="date" value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} />
          </div>
          <div>
            <label htmlFor="f-fin">Fin <span className="meta">(vide = en cours)</span></label>
            <input id="f-fin" type="date" value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} />
          </div>
          <div>
            <label htmlFor="f-ch">Chambre <span className="meta">(facultatif)</span></label>
            <input id="f-ch" type="text" value={f.chambre} onChange={(e) => setF({ ...f, chambre: e.target.value })} placeholder="senat…" />
          </div>
          <div>
            <label htmlFor="f-src">Source</label>
            <input id="f-src" type="text" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Site officiel…" />
          </div>
        </div>
        <div className="actions" style={{ flexWrap: "nowrap" }}>
          <button>{edite ? "Enregistrer la fonction" : "Créer la fonction"}</button>
          {edite && <>, <button type="button" className="lien" onClick={() => { setEdition(null); setF(vide); }}>Annuler</button></>}
        </div>
      </form>
    </section>
  );
}
