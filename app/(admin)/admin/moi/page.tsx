"use client";
import { useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { dateHeure, useRessource } from "@/app/_components/admin/utils";
import { LIBELLE_ROLE } from "@/app/_components/admin/EnTete";
import { lien } from "@/app/_components/admin/liens";
import { useAdmin } from "@/app/_components/admin/Porte";
import { profilWebClip } from "@/lib/mobileconfig";
import { nomComplet, signatureHtml, signatureTexte } from "@/lib/signature";

type Profil = { nom: string; prenom: string; nom_famille: string; poste: string; email: string };

// Icône de l'écran d'accueil (180 px) dessinée à la volée : « D » sur jaune.
function iconeBase64(): string {
  const c = document.createElement("canvas");
  c.width = c.height = 180;
  const g = c.getContext("2d");
  if (!g) return "";
  g.fillStyle = "#FFD23F"; g.fillRect(0, 0, 180, 180);
  g.fillStyle = "#071A41"; g.font = "bold 120px Georgia, 'Times New Roman', serif";
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("D", 90, 98);
  return c.toDataURL("image/png").split(",")[1] ?? "";
}

type Cle = { id: string; nom: string; cree_le: string; utilisee_le: string | null };

// Clés d'accès : Touch ID (Mac), Face ID (iPhone, iPad), empreinte ou code de l'appareil.
function ClesDAcces() {
  const { api } = useAdmin();
  const { data, recharger } = useRessource<{ cles: Cle[]; disponible: boolean }>("/api/admin/passkeys");
  const [nom, setNom] = useState("");
  const [etat, setEtat] = useState<{ ok: boolean; t: string } | null>(null);
  async function ajouter() {
    setEtat(null);
    try {
      const { options } = await api<{ options: Parameters<typeof startRegistration>[0]["optionsJSON"] }>("/api/admin/passkeys", { method: "POST", body: { action: "options" } });
      const reponse = await startRegistration({ optionsJSON: options });
      await api("/api/admin/passkeys", { method: "POST", body: { action: "enregistrer", reponse, nom: nom || "Clé d'accès" } });
      setNom(""); setEtat({ ok: true, t: "Clé d'accès ajoutée : tu peux te connecter et déverrouiller avec elle." });
      await recharger();
    } catch (e) { setEtat({ ok: false, t: (e as Error).name === "NotAllowedError" ? "Demande annulée." : (e as Error).message || "Cet appareil ne propose pas de clé d'accès." }); }
  }
  async function retirer(c: Cle) {
    if (!confirm(`Retirer « ${c.nom} » ?`)) return;
    await api(`/api/admin/passkeys?id=${c.id}`, { method: "DELETE" }); recharger();
  }
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Touch ID, Face ID</h2>
      <p>Une clé d&apos;accès permet de te connecter et de déverrouiller l&apos;admin et la messagerie avec l&apos;empreinte ou le visage, sans mot de passe ni code. Le mot de passe reste valable.</p>
      {data?.cles.length ? (
        <table className="stats"><tbody>{data.cles.map((c) => (
          <tr key={c.id}><td><strong>{c.nom}</strong><br /><span className="meta">ajoutée le {dateHeure(c.cree_le)}{c.utilisee_le ? ` · utilisée le ${dateHeure(c.utilisee_le)}` : ""}</span></td>
            <td><button className="lien" onClick={() => retirer(c)}>Retirer</button></td></tr>
        ))}</tbody></table>
      ) : <p className="meta">Aucune clé d&apos;accès pour l&apos;instant.</p>}
      {data && !data.disponible ? <p className="meta">À enregistrer depuis admin.dataparl.fr ou webmail.dataparl.fr.</p> : <>
        <label htmlFor="cle-nom">Nom de l&apos;appareil</label>
        <input id="cle-nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="MacBook de la team" maxLength={60} />
        {etat && <p className={etat.ok ? "ok" : "erreur"}>{etat.t}</p>}
        <button className="secondaire" onClick={ajouter}>Ajouter cet appareil</button>
      </>}
    </div>
  );
}

export default function MonEspace() {
  const { nom, email, role, api } = useAdmin();
  const [profil, setProfil] = useState<Profil>({ nom, prenom: "", nom_famille: "", poste: "", email });
  const [brouillon, setBrouillon] = useState<Profil | null>(null);
  const [etatProfil, setEtatProfil] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => {
    api("/api/admin/moi").then((d) => { const p = (d as { profil: Profil }).profil; setProfil(p); setBrouillon(p); }).catch(() => setBrouillon(profil));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const vu = brouillon ?? profil;
  const poste = vu.poste.trim() || LIBELLE_ROLE[role];
  const sig = { prenom: vu.prenom, nom: vu.nom_famille, poste, email: profil.email };
  const [mdp, setMdp] = useState("");
  const [conf, setConf] = useState("");
  const [etat, setEtat] = useState<{ ok: boolean; t: string } | null>(null);
  const [copie, setCopie] = useState(false);
  const html = signatureHtml(sig);

  async function enregistrerProfil(e: React.FormEvent) {
    e.preventDefault();
    if (!brouillon) return;
    try {
      const d = await api("/api/admin/moi", { method: "PATCH", body: { ...brouillon, email: role === "admin" ? brouillon.email : undefined } }) as { profil: Profil };
      setProfil({ ...brouillon, ...d.profil });
      setBrouillon({ ...brouillon, ...d.profil });
      setEtatProfil({ ok: true, t: d.profil.email !== profil.email ? `Profil enregistré. Ta nouvelle adresse de connexion : ${d.profil.email}.` : "Profil enregistré." });
    } catch (err) { setEtatProfil({ ok: false, t: (err as Error).message }); }
  }

  async function changer(e: React.FormEvent) {
    e.preventDefault();
    if (mdp.length < 8) return setEtat({ ok: false, t: "Au moins 8 caractères." });
    if (mdp !== conf) return setEtat({ ok: false, t: "Les deux saisies ne correspondent pas." });
    try {
      await api("/api/admin/moi", { method: "POST", body: { mot_de_passe: mdp } });
      setMdp(""); setConf("");
      setEtat({ ok: true, t: "Mot de passe mis à jour." });
    } catch (err) { setEtat({ ok: false, t: (err as Error).message }); }
  }

  function telechargerProfil() {
    const xml = profilWebClip({ email: profil.email, url: "https://webmail.dataparl.fr/", iconeBase64: iconeBase64(), uuid: () => crypto.randomUUID().toUpperCase() });
    const url = URL.createObjectURL(new Blob([xml], { type: "application/x-apple-aspen-config" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `messagerie-${profil.email.split("@")[0]}-dataparl.mobileconfig`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copierSignature() {
    // Copie en HTML (collage direct dans Gmail / Outlook) et en texte brut.
    try {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([signatureTexte(sig)], { type: "text/plain" }),
      })]);
    } catch { await navigator.clipboard?.writeText(html); }
    setCopie(true);
    setTimeout(() => setCopie(false), 2500);
  }

  return (
    <>
      <h1>Mon espace</h1>
      <div className="deux-colonnes">
        <div style={{ display: "grid", gap: 20 }}>
          <div className="profil-carte">
            <span className="avatar">{(profil.nom || nom).charAt(0).toUpperCase()}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{profil.nom || nom}</div>
              <div className="meta">{nomComplet({ prenom: profil.prenom, nom: profil.nom_famille }) || "Prénom et nom à compléter"} · {profil.email}</div>
              <span className={`badge-role ${role}`} style={{ marginTop: 6 }}>{LIBELLE_ROLE[role]}</span>
            </div>
          </div>

          {brouillon && (
            <form className="card" onSubmit={enregistrerProfil}>
              <h2 style={{ marginTop: 0 }}>Mon profil</h2>
              <div className="grille-2">
                <div><label htmlFor="p-prenom">Prénom</label>
                  <input type="text" id="p-prenom" value={brouillon.prenom} onChange={(e) => setBrouillon({ ...brouillon, prenom: e.target.value })} autoComplete="given-name" /></div>
                <div><label htmlFor="p-nom">Nom</label>
                  <input type="text" id="p-nom" value={brouillon.nom_famille} onChange={(e) => setBrouillon({ ...brouillon, nom_famille: e.target.value })} autoComplete="family-name" /></div>
              </div>
              <label htmlFor="p-affiche">Nom affiché</label>
              <input type="text" id="p-affiche" value={brouillon.nom} onChange={(e) => setBrouillon({ ...brouillon, nom: e.target.value })} placeholder="ex. Camille de DataParl'" />
              <p className="meta" style={{ marginTop: 4 }}>Nom d&apos;expéditeur de tes emails et nom dans l&apos;espace admin.</p>
              <label htmlFor="p-poste">Poste</label>
              <input type="text" id="p-poste" value={brouillon.poste} onChange={(e) => setBrouillon({ ...brouillon, poste: e.target.value })} placeholder={LIBELLE_ROLE[role]} />
              {role === "admin" && (
                <>
                  <label htmlFor="p-email">Adresse email</label>
                  <input id="p-email" type="email" value={brouillon.email} onChange={(e) => setBrouillon({ ...brouillon, email: e.target.value })} placeholder="x@dataparl.fr ou x@sous-domaine.dataparl.fr" />
                  <p className="meta" style={{ marginTop: 4 }}>C&apos;est aussi ton identifiant de connexion. Un sous-domaine doit être configuré chez Resend pour recevoir.</p>
                </>
              )}
              {etatProfil && <p className={etatProfil.ok ? "ok" : "erreur"}>{etatProfil.t}</p>}
              <button>Enregistrer</button>
            </form>
          )}

          <form className="card" onSubmit={changer}>
            <h2 style={{ marginTop: 0 }}>Mot de passe</h2>
            <label htmlFor="m-mdp">Nouveau mot de passe</label>
            <input id="m-mdp" type="password" autoComplete="new-password" value={mdp} onChange={(e) => setMdp(e.target.value)} placeholder="8 caractères minimum" />
            <label htmlFor="m-conf">Confirmation</label>
            <input id="m-conf" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} />
            {etat && <p className={etat.ok ? "ok" : "erreur"}>{etat.t}</p>}
            <button disabled={!mdp}>Changer</button>
          </form>

          <ClesDAcces />

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Sur mon téléphone</h2>
            <p>Le profil de configuration ajoute la messagerie DataParl&apos; sur l&apos;écran d&apos;accueil de ton iPhone, iPad ou Mac, comme une app.</p>
            <button className="secondaire" onClick={telechargerProfil}>Télécharger le profil (.mobileconfig)</button>
            <p className="meta">Sur iPhone : ouvre le fichier, puis Réglages, Profil téléchargé, Installer. Sur Android : <a href={lien("webmail")}>ouvre la messagerie</a> puis « Ajouter à l&apos;écran d&apos;accueil ».</p>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Ma signature email</h2>
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: 16 }} dangerouslySetInnerHTML={{ __html: html }} />
          <button onClick={copierSignature}>{copie ? "Signature copiée" : "Copier la signature"}</button>
          <p className="meta">À coller dans Gmail (Paramètres, Signature) ou Outlook : la mise en forme est conservée.</p>
          <details className="tableau">
            <summary>Voir le code HTML</summary>
            <pre>{html}</pre>
          </details>
        </div>
      </div>
    </>
  );
}
