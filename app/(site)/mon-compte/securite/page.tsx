"use client";
import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import type { Session, UserIdentity } from "@supabase/supabase-js";
import { authBrowser, sessionActuelle } from "@/lib/supabaseBrowser";
import StyleCompte from "../style-compte";

const NOMS: Record<string, string> = { email: "Code par email", google: "Google", google2: "Google (2ᵉ compte)", github: "GitHub", twitter: "X", slack_oidc: "Slack" };
const PROC: Array<"google" | "google2" | "github" | "twitter"> = ["google", "google2", "github", "twitter"];

// Sécurité et connexion : méthodes de connexion, adresses email, mot de passe,
// validation en deux étapes (TOTP), clés d'accès (à venir) et mon activité.
// Chaque action réussie ici signale l'événement à /api/compte/securite/evenement :
// le serveur relit l'état réel du compte puis envoie l'e-mail de notification.
type Facteur = { id: string; nom: string };
type Secondaire = { id: string; email: string; confirme_le: string | null; envoi_le: string | null };

export default function Securite() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [fournisseurs, setFournisseurs] = useState<string[]>([]);
  const [identites, setIdentites] = useState<UserIdentity[]>([]);
  const [emailPrincipal, setEmailPrincipal] = useState("");
  const [nouvelEmail, setNouvelEmail] = useState("");
  const [secondaires, setSecondaires] = useState<Secondaire[]>([]);
  const [nouvelleSecondaire, setNouvelleSecondaire] = useState("");
  const [codeSecondaire, setCodeSecondaire] = useState("");
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [facteurs, setFacteurs] = useState<Facteur[]>([]);
  const [facteurId, setFacteurId] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [cles, setCles] = useState<{ id: string; nom: string; cree_le: string; utilisee_le: string | null }[]>([]);
  const [disponible, setDisponible] = useState(true);
  const [nomCle, setNomCle] = useState("");

  const appel = useCallback(async (url: string, init: RequestInit = {}) => {
    return fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}), Authorization: `Bearer ${(await sessionActuelle())?.access_token}` } });
  }, []);

  // Signalement silencieux d'un événement de sécurité : la route serveur
  // vérifie l'état réel du compte avant d'envoyer quoi que ce soit.
  const signaler = useCallback((corps: Record<string, unknown>) => {
    appel("/api/compte/securite/evenement", { method: "POST", body: JSON.stringify(corps) }).catch(() => {});
  }, [appel]);

  async function chargerFacteurs() {
    const { data, error } = await authBrowser().auth.mfa.listFactors();
    if (error) return;
    setFacteurs(
      (data?.all ?? [])
        .filter((f) => f.status === "verified")
        .map((f) => ({ id: f.id, nom: f.friendly_name ?? "Application d'authentification" })),
    );
  }

  async function chargerIdentites() {
    const { data } = await authBrowser().auth.getUserIdentities();
    setIdentites(data?.identities ?? []);
  }

  async function chargerSecondaires() {
    const r = await appel("/api/compte/emails-secondaires");
    if (!r.ok) return;
    const b = (await r.json()) as { adresses: Secondaire[] };
    setSecondaires(b.adresses ?? []);
  }

  useEffect(() => {
    sessionActuelle().then(setSession);
  }, []);

  useEffect(() => {
    if (!session) return;
    appel("/api/compte").then(async (r) => {
      if (r.ok) {
        const c = (await r.json()) as { fournisseurs: string[]; email: string };
        setFournisseurs(c.fournisseurs);
        setEmailPrincipal(c.email ?? "");
      }
    });
    chargerFacteurs();
    chargerIdentites();
    chargerSecondaires();
    appel("/api/compte/passkeys").then(async (r) => {
      if (!r.ok) return;
      const b = (await r.json()) as { cles: typeof cles; disponible: boolean };
      setCles(b.cles ?? []);
      setDisponible(b.disponible !== false);
    });
  }, [session, appel]);

  // Retour d'association d'une méthode (redirect OAuth avec ?lie=fournisseur) :
  // la méthode vient d'être ajoutée, le serveur le vérifie avant d'informer.
  useEffect(() => {
    if (!session) return;
    const lie = new URLSearchParams(window.location.search).get("lie") ?? "";
    if (!["google", "google2", "github", "twitter"].includes(lie)) return;
    signaler({ type: "methode", fournisseur: lie, ajoute: true });
    chargerIdentites();
    window.history.replaceState(null, "", "/mon-compte/securite");
  }, [session, signaler]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card">
        <h1>Sécurité et connexion</h1>
        <p>Connecte-toi pour gérer la sécurité de ton compte.</p>
        <a className="btn" href="/connexion?suite=/mon-compte/securite">Se connecter</a>
      </div>
    );
  }

  async function enregistrerMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    if (mdp.length < 8) return setMessage({ ok: false, texte: "Le mot de passe doit contenir au moins 8 caractères." });
    if (mdp !== mdp2) return setMessage({ ok: false, texte: "Les deux mots de passe ne sont pas identiques." });
    setEnCours(true);
    setMessage(null);
    const r = await appel("/api/compte/mot-de-passe", { method: "PUT", body: JSON.stringify({ motDePasse: mdp }) });
    setEnCours(false);
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      return setMessage({ ok: false, texte: (b as { error?: string }).error ?? "Enregistrement impossible, réessaie." });
    }
    setMdp("");
    setMdp2("");
    setMessage({ ok: true, texte: "Mot de passe enregistré. Tu peux maintenant te connecter avec ton adresse et ce mot de passe, en plus du code email." });
  }

  async function changerEmailPrincipal(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setMessage(null);
    const r = await appel("/api/compte/email-principal", { method: "PUT", body: JSON.stringify({ email: nouvelEmail }) });
    setEnCours(false);
    const b = (await r.json().catch(() => ({}))) as { error?: string; confirmation?: string };
    if (!r.ok) return setMessage({ ok: false, texte: b.error ?? "Changement impossible, réessaie." });
    setNouvelEmail("");
    if (b.confirmation === "nouvelle-adresse") {
      setMessage({ ok: true, texte: "Demande enregistrée. Un e-mail de confirmation t'attend à la nouvelle adresse : suis son lien pour activer le changement." });
    } else {
      setEmailPrincipal(nouvelEmail);
      setMessage({ ok: true, texte: "Adresse principale changée. Tes alertes et ta newsletter suivent." });
    }
  }

  async function ajouterSecondaire() {
    if (!nouvelleSecondaire.trim()) return;
    setEnCours(true);
    setMessage(null);
    const r = await appel("/api/compte/emails-secondaires", { method: "POST", body: JSON.stringify({ email: nouvelleSecondaire }) });
    setEnCours(false);
    const b = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) return setMessage({ ok: false, texte: b.error ?? "Ajout impossible, réessaie." });
    setNouvelleSecondaire("");
    await chargerSecondaires();
    setMessage({ ok: true, texte: "Un code à 6 chiffres vient d'être envoyé à cette adresse. Saisis-le à côté de l'adresse pour la confirmer." });
  }

  async function confirmerSecondaire(id: string) {
    if (!/^[0-9]{6}$/.test(codeSecondaire)) return setMessage({ ok: false, texte: "Saisis le code à 6 chiffres reçu par e-mail." });
    setEnCours(true);
    setMessage(null);
    const r = await appel("/api/compte/emails-secondaires", { method: "PUT", body: JSON.stringify({ id, code: codeSecondaire }) });
    setEnCours(false);
    const b = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) return setMessage({ ok: false, texte: b.error ?? "Confirmation impossible, réessaie." });
    setCodeSecondaire("");
    await chargerSecondaires();
    setMessage({ ok: true, texte: "Adresse confirmée." });
  }

  async function retirerSecondaire(id: string, email: string) {
    if (!window.confirm(`Retirer l'adresse ${email} ?`)) return;
    setEnCours(true);
    await appel("/api/compte/emails-secondaires?id=" + encodeURIComponent(id), { method: "DELETE" });
    setEnCours(false);
    await chargerSecondaires();
  }

  async function demarrer2fa() {
    setEnCours(true);
    setMessage(null);
    const { data, error } = await authBrowser().auth.mfa.enroll({ factorType: "totp", friendlyName: "DataParl'" });
    setEnCours(false);
    if (error || !data) return setMessage({ ok: false, texte: "Impossible de démarrer l'activation, réessaie." });
    const d = data as unknown as { id: string; totp: { qr_code: string; secret: string } };
    setFacteurId(d.id);
    setQr(d.totp.qr_code);
    setSecret(d.totp.secret);
  }

  async function valider2fa(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const sb = authBrowser();
    const { data: ch, error: ech } = await sb.auth.mfa.challenge({ factorId: facteurId });
    let echec = ech;
    let reussi = false;
    if (!echec && ch) {
      const { error: ev } = await sb.auth.mfa.verify({ factorId: facteurId, challengeId: ch.id, code: code.trim() });
      if (!ev) reussi = true;
      else echec = ev;
    }
    setEnCours(false);
    if (reussi) {
      setQr(null);
      setSecret("");
      setCode("");
      setFacteurId("");
      await chargerFacteurs();
      signaler({ type: "2fa" });
      setMessage({ ok: true, texte: "Validation en deux étapes activée." });
    } else {
      setMessage({ ok: false, texte: "Code incorrect ou expiré, réessaie." });
    }
  }

  async function desactiver2fa() {
    if (!window.confirm("Désactiver la validation en deux étapes ?")) return;
    setEnCours(true);
    for (const f of facteurs) await authBrowser().auth.mfa.unenroll({ factorId: f.id });
    setEnCours(false);
    setFacteurs([]);
    signaler({ type: "2fa" });
    setMessage({ ok: true, texte: "Validation en deux étapes désactivée." });
  }

  async function ajouterCle() {
    if (!window.PublicKeyCredential) return setMessage({ ok: false, texte: "Ton navigateur ne gère pas les clés d'accès." });
    setEnCours(true);
    setMessage(null);
    try {
      const o = await appel("/api/compte/passkeys", { method: "POST", body: JSON.stringify({ action: "options" }) });
      if (!o.ok) throw new Error();
      const { options } = (await o.json()) as { options: Parameters<typeof startRegistration>[0]["optionsJSON"] };
      const reponse = await startRegistration({ optionsJSON: options });
      const r = await appel("/api/compte/passkeys", {
        method: "POST",
        body: JSON.stringify({ action: "enregistrer", nom: nomCle.trim() || "Clé d'accès", reponse }),
      });
      if (!r.ok) throw new Error();
      const rl = await appel("/api/compte/passkeys");
      if (rl.ok) setCles(((await rl.json()) as { cles: typeof cles }).cles ?? []);
      setNomCle("");
      setMessage({ ok: true, texte: "Clé d'accès enregistrée : tu peux maintenant te connecter avec elle." });
    } catch {
      setMessage({ ok: false, texte: "La clé d'accès n'a pas pu être enregistrée. Réessaie." });
    }
    setEnCours(false);
  }

  async function retirerCle(id: string, nom: string) {
    if (!window.confirm(`Retirer la clé d'accès ${nom} ?`)) return;
    setEnCours(true);
    await appel("/api/compte/passkeys?id=" + encodeURIComponent(id), { method: "DELETE" });
    setCles((c) => c.filter((x) => x.id !== id));
    setEnCours(false);
  }

  async function associer(provider: "google" | "google2" | "github" | "twitter") {
    const { error } = await authBrowser().auth.linkIdentity({
      provider,
      // Retour sur cette page avec ?lie= : le signalement part au retour,
      // quand la méthode est réellement reliée côté serveur.
      options: { redirectTo: `${window.location.origin}/mon-compte/securite?lie=${provider}` },
    });
    if (error) {
      const m = error.message ?? "";
      setMessage({
        ok: false,
        texte: /already|exists|linked|conflict/i.test(m)
          ? "Ce compte est déjà relié à un autre compte DataParl'. Supprime d'abord l'autre compte (ou écris-nous via le formulaire de contact) pour pouvoir l'associer ici."
          : /provider|unsupported|not enabled|disabled/i.test(m)
            ? "Ce moyen de connexion n'est pas encore activé sur DataParl', l'équipe travaille dessus."
            : `L'association n'a pas abouti : ${m}. Réessaie.`,
      });
    }
  }

  async function retirer(identite: UserIdentity) {
    if (!window.confirm(`Retirer ${NOMS[identite.provider] ?? identite.provider} de tes méthodes de connexion ?`)) return;
    const { error } = await authBrowser().auth.unlinkIdentity(identite);
    if (error) return setMessage({ ok: false, texte: "Retrait impossible : garde au moins une méthode de connexion." });
    await chargerIdentites();
    if (["google", "google2", "github", "twitter"].includes(identite.provider)) {
      signaler({ type: "methode", fournisseur: identite.provider, ajoute: false });
    }
    setMessage({ ok: true, texte: "Méthode retirée." });
  }

  return (
    <div className="etroit">
      <StyleCompte />
      <h1>Sécurité et <span className="surligne">connexion</span></h1>
      <p className="meta fil-compte"><a className="lien" href="/mon-compte">Compte</a> / Sécurité et connexion</p>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

      <section className="section-compte">
        <h2>Adresse email</h2>
        <p style={{ margin: "12px 0 4px" }}>{emailPrincipal} <span className="meta">(adresse principale : connexion et e-mails du compte)</span></p>
        <form onSubmit={changerEmailPrincipal}>
          <div className="grille-2" style={{ textAlign: "left" }}>
            <div><label htmlFor="s-email">Nouvelle adresse principale</label>
              <input id="s-email" type="email" required maxLength={320} value={nouvelEmail} onChange={(e) => setNouvelEmail(e.target.value)} autoComplete="email" placeholder="prenom.nom@exemple.fr" /></div>
          </div>
          <p><button className="btn secondaire" type="submit" disabled={enCours}>Changer mon adresse principale</button></p>
        </form>
        <p className="meta">Selon la configuration, un e-mail de confirmation t'attendra à la nouvelle adresse. Tes alertes et ta newsletter suivent le changement.</p>
      </section>

      <section className="section-compte">
        <h2>Adresses secondaires</h2>
        <p>Des adresses supplémentaires associées à ton compte, confirmées par un code envoyé sur place. Elles ne permettent pas de se connecter : seule l'adresse principale le fait.</p>
        {secondaires.length > 0 && (
          <ul style={{ paddingLeft: 18, margin: "8px 0" }}>
            {secondaires.map((s) => (
              <li key={s.id} style={{ margin: "8px 0", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span>{s.email} <span className="meta">({s.confirme_le ? "confirmée" : "code envoyé, à confirmer"})</span></span>
                {s.confirme_le ? (
                  <button className="lien" onClick={() => retirerSecondaire(s.id, s.email)} disabled={enCours}>Retirer</button>
                ) : (
                  <>
                    <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="Code" value={codeSecondaire} onChange={(e) => setCodeSecondaire(e.target.value)} style={{ maxWidth: 110 }} />
                    <button className="secondaire" style={{ marginTop: 0, padding: "6px 12px", fontSize: "0.9rem" }} onClick={() => confirmerSecondaire(s.id)} disabled={enCours}>Confirmer</button>
                    <button className="lien" onClick={() => retirerSecondaire(s.id, s.email)} disabled={enCours}>Annuler</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <input type="email" placeholder="autre.adresse@exemple.fr" maxLength={320} value={nouvelleSecondaire} onChange={(e) => setNouvelleSecondaire(e.target.value)} style={{ maxWidth: 260 }} />
          <button className="btn secondaire" onClick={ajouterSecondaire} disabled={enCours}>Ajouter</button>
        </div>
        <p className="meta">Jusqu'à 5 adresses secondaires. Un code à 6 chiffres, valable 15 minutes, est envoyé à l'adresse pour la confirmer.</p>
      </section>

      <section className="section-compte">
        <h2>Méthodes de connexion</h2>
        {fournisseurs.includes("email") && (
          <p style={{ margin: "12px 0 4px" }}>Code par email <span className="meta">(connecté)</span></p>
        )}
        {PROC.map((p) => {
          const identite = identites.find((i) => i.provider === p);
          return (
            <p key={p} style={{ margin: "12px 0", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span>{NOMS[p]} <span className="meta">({identite ? "connecté" : "non associé"})</span></span>
              {identite ? (
                <button className="lien" onClick={() => retirer(identite)} disabled={enCours}>Retirer</button>
              ) : (
                <button className="secondaire" style={{ marginTop: 0, padding: "6px 12px", fontSize: "0.9rem" }} onClick={() => associer(p)} disabled={enCours}>Associer</button>
              )}
            </p>
          );
        })}
        <p className="meta">Garde toujours au moins une méthode de connexion active.</p>
      </section>

      <section className="section-compte">
        <h2>Mot de passe</h2>
        <form onSubmit={enregistrerMotDePasse}>
          <div className="grille-2" style={{ textAlign: "left" }}>
            <div><label htmlFor="s-mdp">Nouveau mot de passe</label>
              <input id="s-mdp" type="password" required minLength={8} maxLength={128} value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="new-password" /></div>
            <div><label htmlFor="s-mdp2">Confirme le mot de passe</label>
              <input id="s-mdp2" type="password" required minLength={8} maxLength={128} value={mdp2} onChange={(e) => setMdp2(e.target.value)} autoComplete="new-password" /></div>
          </div>
          <p><button className="btn" type="submit" disabled={enCours}>Définir ou changer mon mot de passe</button></p>
        </form>
        <p className="meta">Une fois défini, tu pourras aussi te connecter avec ton email et ce mot de passe. Les autres méthodes (Google, GitHub, X) restent disponibles.</p>
      </section>

      <section className="section-compte">
        <h2>Validation en deux étapes</h2>
        {facteurs.length > 0 ? (
          <>
            <p>Activée : une application d'authentification génère un code à 6 chiffres.</p>
            <button className="danger" onClick={desactiver2fa} disabled={enCours}>Désactiver</button>
          </>
        ) : qr ? (
          <form onSubmit={valider2fa}>
            <p>Scanne ce QR code avec ton application d'authentification (Google Authenticator, 1Password, Aegis…), puis saisis le code à 6 chiffres.</p>
            <p>{qr && <img src={qr} alt="QR code de validation en deux étapes" width={180} height={180} />}</p>
            <p className="meta">Code secret si tu ne peux pas scanner : <code>{secret}</code></p>
            <label htmlFor="s-code">Code à 6 chiffres</label>
            <input id="s-code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" />
            <p><button className="btn" type="submit" disabled={enCours}>Valider et activer</button></p>
          </form>
        ) : (
          <>
            <p>Une application d'authentification (Google Authenticator, 1Password, Aegis…) génère un code à 6 chiffres qui change toutes les minutes.</p>
            <button className="btn secondaire" onClick={demarrer2fa} disabled={enCours}>Activer la validation en deux étapes</button>
          </>
        )}
      </section>

      <section className="section-compte">
        <h2>Clés d'accès et clés de sécurité</h2>
        {disponible ? (
          <>
            <p>Touch ID, Face ID, l'empreinte de ton téléphone ou une clé de sécurité physique : connecte-toi sans mot de passe. La vérification de l'utilisateur est toujours exigée, une clé vaut donc deux facteurs.</p>
            {cles.length > 0 && (
              <ul style={{ paddingLeft: 18, margin: "8px 0" }}>
                {cles.map((c) => (
                  <li key={c.id} style={{ margin: "8px 0", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <span>{c.nom}</span>
                    <button className="lien" onClick={() => retirerCle(c.id, c.nom)} disabled={enCours}>Retirer</button>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <input type="text" placeholder="Nom (ex. : MacBook)" maxLength={60} value={nomCle} onChange={(e) => setNomCle(e.target.value)} style={{ maxWidth: 220 }} />
              <button className="btn secondaire" onClick={ajouterCle} disabled={enCours}>Ajouter une clé d'accès</button>
            </div>
          </>
        ) : (
          <p className="meta">Les clés d'accès s'enregistrent depuis www.dataparl.fr.</p>
        )}
      </section>

      <section className="section-compte">
        <h2>Mon activité</h2>
        <p>Appareils et adresses IP récemment utilisés sur ton compte.</p>
        <a className="btn secondaire" href="/mon-compte/activite">Voir mon activité</a>
      </section>
    </div>
  );
}
