"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session, UserIdentity } from "@supabase/supabase-js";
import { authBrowser, sessionActuelle } from "@/lib/supabaseBrowser";
import StyleCompte from "../style-compte";

const NOMS: Record<string, string> = { email: "Code par email", google: "Google", github: "GitHub", twitter: "X", slack_oidc: "Slack" };
const PROC: Array<"google" | "github" | "twitter"> = ["google", "github", "twitter"];

// Sécurité et connexion : méthodes de connexion, mot de passe, validation
// en deux étapes (TOTP), clés d'accès (à venir) et mon activité.
type Facteur = { id: string; nom: string };

export default function Securite() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [fournisseurs, setFournisseurs] = useState<string[]>([]);
  const [identites, setIdentites] = useState<UserIdentity[]>([]);
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [facteurs, setFacteurs] = useState<Facteur[]>([]);
  const [facteurId, setFacteurId] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const appel = useCallback(async (url: string, init: RequestInit = {}) => {
    return fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}), Authorization: `Bearer ${(await sessionActuelle())?.access_token}` } });
  }, []);

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

  useEffect(() => {
    sessionActuelle().then(setSession);
  }, []);

  useEffect(() => {
    if (!session) return;
    appel("/api/compte").then(async (r) => {
      if (r.ok) {
        const c = (await r.json()) as { fournisseurs: string[] };
        setFournisseurs(c.fournisseurs);
      }
    });
    chargerFacteurs();
    chargerIdentites();
  }, [session, appel]);

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
    setMessage({ ok: true, texte: "Validation en deux étapes désactivée." });
  }

  async function associer(provider: "google" | "github" | "twitter") {
    const { error } = await authBrowser().auth.linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/mon-compte` },
    });
    if (error) {
      const m = error.message ?? "";
      setMessage({
        ok: false,
        texte: /already|exists|linked|conflict/i.test(m)
          ? "Ce compte est déjà relié à un autre compte DataParl'. Supprime d'abord l'autre compte (ou écris-nous via le formulaire de contact) pour pouvoir l'associer ici."
          : /provider|unsupported|not enabled|disabled/i.test(m)
            ? "Ce moyen de connexion n'est pas encore activé sur DataParl' — l'équipe travaille dessus."
            : `L'association n'a pas abouti : ${m}. Réessaie.`,
      });
    }
  }

  async function retirer(identite: UserIdentity) {
    if (!window.confirm(`Retirer ${NOMS[identite.provider] ?? identite.provider} de tes méthodes de connexion ?`)) return;
    const { error } = await authBrowser().auth.unlinkIdentity(identite);
    if (error) return setMessage({ ok: false, texte: "Retrait impossible : garde au moins une méthode de connexion." });
    await chargerIdentites();
    setMessage({ ok: true, texte: "Méthode retirée." });
  }

  return (
    <div className="etroit">
      <StyleCompte />
      <h1>Sécurité et <span className="surligne">connexion</span></h1>
      <p className="meta fil-compte"><a className="lien" href="/mon-compte">Compte</a> / Sécurité et connexion</p>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

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
        <p>Bientôt disponibles : Touch ID, Face ID, l'empreinte de ton téléphone ou une clé de sécurité physique.</p>
      </section>

      <section className="section-compte">
        <h2>Mon activité</h2>
        <p>Appareils et adresses IP récemment utilisés sur ton compte.</p>
        <a className="btn secondaire" href="/mon-compte/activite">Voir mon activité</a>
      </section>
    </div>
  );
}
