"use client";
import { useEffect, useRef, useState } from "react";
import { SUJETS } from "@/lib/contact";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import "./contact.css";

// Formulaire de contact conversationnel : une question par écran, navigation
// clavier complète (Entrée pour valider, A à H pour les choix, Échap pour
// revenir), logique conditionnelle selon le sujet. Le contrat avec /api/contact
// ne change pas : prenom, nom, email, sujet, message (composé ici), site.

type Valeurs = { prenom: string; nom: string; sujet: string; cible: string; droit: string; detail: string; email: string };
type Resultat = { valeur: string; libelle: string; detail?: string; href: string; groupe: string };

const DROITS = ["Accès à mes données", "Rectification de mes données", "Suppression de mes données", "Exercer un autre droit"];

const AIDES: Record<string, string> = {
  question: "Une question sur le site, les données, le fonctionnement",
  erreur: "Une fiche à corriger, avec sa source si possible",
  bug: "Quelque chose ne fonctionne pas",
  phishing: "Un e-mail ou message suspect qui se fait passer pour DataParl'",
  rgpd: "Vos droits sur vos données personnelles",
  api: "Accéder aux données, licence, réutilisation",
  presse: "Interview, donnée, partenariat : priorité aux médias",
  legal: "Toute demande à caractère juridique",
};

const CIBLE: Partial<Record<string, { libelle: string; aide: string }>> = {
  erreur: { libelle: "Quelle fiche est concernée ?", aide: "Tapez un nom : les fiches du site apparaissent. Sinon, collez le lien de la fiche." },
  bug: { libelle: "Quelle page est concernée ?", aide: "Le lien de la page, ou son nom." },
  presse: { libelle: "Quel média, quelle structure ?", aide: "Votre média ou le nom de votre projet." },
};

const DETAIL: Record<string, { libelle: string; aide: string }> = {
  question: { libelle: "Votre message", aide: "Dites-nous tout, on vous répond par email." },
  erreur: { libelle: "Décrivez l'erreur constatée", aide: "Ce qui est inexact, la bonne valeur si vous la connaissez, et sa source." },
  bug: { libelle: "Décrivez le problème", aide: "Ce qui se passe, ce que vous attendiez, le navigateur si utile." },
  phishing: { libelle: "Décrivez ce que vous avez reçu", aide: "Le lien, l'e-mail ou le message suspect : tout détail aide à réagir vite." },
  api: { libelle: "Quel usage envisagez-vous ?", aide: "Votre projet, les données souhaitées, le volume : on vous dit ce qui est possible." },
  rgpd: { libelle: "Précisez votre demande", aide: "Le compte ou les données concernés. Votre identité sera vérifiée dans notre réponse." },
  presse: { libelle: "Votre demande, en quelques lignes", aide: "Interview, donnée, partenariat : dites-nous tout." },
  legal: { libelle: "Votre demande", aide: "Détaillez la demande, on vous répond par email." },
};

// Parcours selon la connexion et le sujet choisi.
function chemin(connecte: boolean, sujet?: string): string[] {
  const e = ["intro"];
  if (!connecte) e.push("compte");
  e.push("identite", "sujet");
  if (sujet === "erreur" || sujet === "bug" || sujet === "presse") e.push("cible");
  if (sujet === "rgpd") e.push("droit");
  if (sujet) e.push("detail");
  e.push("email", "recap");
  return e;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function FormulaireContact({ sujetInitial }: { sujetInitial?: string }) {
  const [pile, setPile] = useState<string[]>(["intro"]);
  const [connecte, setConnecte] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [err, setErr] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [messageFin, setMessageFin] = useState("");
  const [v, setV] = useState<Valeurs>({ prenom: "", nom: "", sujet: "", cible: "", droit: "", detail: "", email: "" });
  const [reqFiche, setReqFiche] = useState("");
  const [suggestions, setSuggestions] = useState<Resultat[]>([]);
  const [sugIdx, setSugIdx] = useState(-1);
  const champInput = useRef<HTMLInputElement | null>(null);
  const champZone = useRef<HTMLTextAreaElement | null>(null);
  const ecran = pile[pile.length - 1];

  // Session : préremplit prénom, nom et e-mail si l'utilisateur est connecté.
  useEffect(() => {
    sessionActuelle()
      .then((s) => {
        const u = s?.user;
        if (!u?.email) return;
        const m = (u.user_metadata ?? {}) as Record<string, string>;
        setV((x) => ({ ...x, prenom: x.prenom || m.prenom || "", nom: x.nom || m.nom || "", email: x.email || u.email || "" }));
        setConnecte(true);
      })
      .catch(() => undefined);
  }, []);

  // Autocomplétion des fiches (sujet « erreur de donnée » uniquement).
  useEffect(() => {
    if (ecran !== "cible" || v.sujet !== "erreur" || reqFiche.trim().length < 2) { setSuggestions([]); setSugIdx(-1); return; }
    const t = setTimeout(() => {
      fetch("/api/contact/suggestions?q=" + encodeURIComponent(reqFiche.trim()))
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { setSuggestions(Array.isArray(d?.resultats) ? d.resultats : []); setSugIdx(-1); })
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [ecran, v.sujet, reqFiche]);

  useEffect(() => {
    if (ecran === "detail") setTimeout(() => champZone.current?.focus(), 60);
    else if (["cible", "email"].includes(ecran)) setTimeout(() => champInput.current?.focus(), 60);
  }, [ecran]);

  const avancer = () => setPile((p) => [...p, chemin(connecte, v.sujet || undefined)[chemin(connecte, v.sujet || undefined).indexOf(ecran) + 1]]);
  const reculer = () => setPile((p) => (p.length > 1 ? p.slice(0, -1) : p));

  function choisirSujet(sujet: string) {
    setErr("");
    setV((x) => ({ ...x, sujet }));
    const c = chemin(connecte, sujet);
    setPile((p) => [...p, c[c.indexOf("sujet") + 1]]);
  }

  function validerIdentite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!v.prenom.trim() || !v.nom.trim()) { setErr("Indiquez votre prénom et votre nom."); return; }
    setErr(""); avancer();
  }

  function validerCible(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!v.cible.trim()) { setErr("Ce champ est nécessaire pour continuer."); return; }
    setErr(""); avancer();
  }

  function validerDetail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (v.detail.trim().length < 5) { setErr("Quelques mots suffisent : dites-nous au moins une phrase."); return; }
    setErr(""); avancer();
  }

  function validerEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!EMAIL.test(v.email.trim())) { setErr("Cette adresse ne semble pas valide."); return; }
    setErr(""); avancer();
  }

  function messageComplet(): string {
    const d = v.detail.trim();
    if (v.sujet === "erreur") return "Fiche concernée : " + v.cible.trim() + "\n\n" + d;
    if (v.sujet === "bug") return "Page concernée : " + v.cible.trim() + "\n\n" + d;
    if (v.sujet === "presse") return "Média ou structure : " + v.cible.trim() + "\n\n" + d;
    if (v.sujet === "rgpd") return "Droit exercé : " + v.droit + "\n\n" + d;
    return d;
  }

  async function envoyer() {
    setErr(""); setEnvoi(true);
    const r = await fetch("/api/contact", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom: v.prenom.trim(), nom: v.nom.trim(), email: v.email.trim(), sujet: v.sujet, message: messageComplet(), site: "" }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setEnvoi(false);
    if (r?.ok) { setEnvoye(true); setMessageFin(d.message ?? "Merci, votre message est bien arrivé."); }
    else setErr(d.error ?? "Envoi impossible, réessayez plus tard.");
  }

  // Navigation clavier : lettres pour les choix, Échap pour revenir.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (envoi || envoye) return;
      if ((ecran === "sujet" || ecran === "droit") && /^[a-hA-H]$/.test(e.key)) {
        const liste = ecran === "sujet" ? SUJETS.map((s) => s.v) : DROITS;
        const i = e.key.toLowerCase().charCodeAt(0) - 97;
        if (i < liste.length) {
          if (ecran === "sujet") choisirSujet(liste[i]);
          else { setV((x) => ({ ...x, droit: liste[i] })); setPile((p) => [...p, "detail"]); }
        }
      }
      if (e.key === "Escape" && pile.length > 1) reculer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const etapes = chemin(connecte, v.sujet || undefined);
  const pct = envoye ? 100 : Math.round((etapes.indexOf(ecran) / (etapes.length - 1)) * 100);

  if (envoye) return (
    <div className="ct-ecran">
      <p className="ct-ok-titre"><span className="ct-coche" aria-hidden="true">✓</span></p>
      <h2 className="ct-question">Merci, c'est bien reçu.</h2>
      <p>{messageFin}</p>
      <p className="meta">L'équipe DataParl', Le Parlement, pièce par pièce.</p>
    </div>
  );

  return (
    <div>
      <div className="ct-progression" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du formulaire">
        <span style={{ width: pct + "%" }} />
      </div>

      {ecran === "intro" && (
        <div className="ct-ecran" key="intro">
          <h2 className="ct-question">Une question, une <span className="surligne">correction</span>, une idée ?</h2>
          <p className="meta">Quelques questions, une réponse par email. Comptez deux minutes.</p>
          {connecte && <p className="meta">Connecté en tant que {v.prenom || v.email} : votre e-mail sera déjà rempli.</p>}
          <form onSubmit={(e) => { e.preventDefault(); setPile((p) => [...p, chemin(connecte)[1]]); }}>
            <button type="submit">{connecte ? "Commencer" : "Commencer sans compte"}</button>
          </form>
        </div>
      )}

      {ecran === "compte" && (
        <div className="ct-ecran" key="compte">
          <h2 className="ct-question">Vous avez déjà un compte DataParl' ?</h2>
          <p className="meta">Se connecter préremplit vos informations et évite l'étape de vérification. Vous pouvez aussi continuer sans compte.</p>
          <div className="ct-actions" style={{ marginTop: 14 }}>
            <a className="btn" href="/connexion?suite=/contact">Se connecter avec mon compte</a>
            <button className="lien" onClick={avancer}>Continuer sans compte</button>
          </div>
        </div>
      )}

      {ecran === "identite" && (
        <form className="ct-ecran" key="identite" onSubmit={validerIdentite}>
          <p className="ct-etape">{etapes.indexOf(ecran) + 1} / {etapes.length}</p>
          <h2 className="ct-question">Comment vous appeler ?</h2>
          <div className="grille-filtres">
            <div>
              <label htmlFor="ct-prenom">Prénom</label>
              <input id="ct-prenom" value={v.prenom} onChange={(e) => setV((x) => ({ ...x, prenom: e.target.value }))} maxLength={80} autoComplete="given-name" />
            </div>
            <div>
              <label htmlFor="ct-nom">Nom</label>
              <input id="ct-nom" value={v.nom} onChange={(e) => setV((x) => ({ ...x, nom: e.target.value }))} maxLength={80} autoComplete="family-name" />
            </div>
          </div>
          {err && <p className="erreur">{err}</p>}
          <button type="submit">Continuer</button>
        </form>
      )}

      {ecran === "sujet" && (
        <div className="ct-ecran" key="sujet">
          <p className="ct-etape">{etapes.indexOf(ecran) + 1} / {etapes.length}</p>
          <h2 className="ct-question">Pourquoi êtes-vous là ?</h2>
          <ul className="ct-choix">
            {SUJETS.map((s, i) => (
              <li key={s.v}>
                <button type="button" onClick={() => choisirSujet(s.v)} aria-label={s.l}>
                  <span className="ct-lettre" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                  <span className="ct-corps"><strong>{s.l}</strong><span>{AIDES[s.v]}</span></span>
                </button>
              </li>
            ))}
          </ul>
          <p className="meta" style={{ marginTop: 10 }}>Les touches A à H sélectionnent directement.</p>
        </div>
      )}

      {ecran === "cible" && (
        <form className="ct-ecran" key="cible" onSubmit={validerCible}>
          <p className="ct-etape">{etapes.indexOf(ecran) + 1} / {etapes.length}</p>
          <h2 className="ct-question">{CIBLE[v.sujet]?.libelle}</h2>
          {v.sujet === "erreur" ? (
            <div className="autocompletion">
              <input
                ref={champInput}
                value={reqFiche}
                onChange={(e) => { setReqFiche(e.target.value); setV((x) => ({ ...x, cible: e.target.value })); setErr(""); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setSugIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setSugIdx((i) => Math.max(i - 1, -1)); }
                  if (e.key === "Enter" && sugIdx >= 0 && suggestions[sugIdx]) {
                    e.preventDefault();
                    const s = suggestions[sugIdx];
                    setV((x) => ({ ...x, cible: s.libelle + " (" + s.href + ")" }));
                    setReqFiche(s.libelle);
                    setSuggestions([]); setSugIdx(-1);
                  }
                }}
                placeholder="Nom de l'élu(e) ou du collaborateur, ou lien de la fiche"
                aria-label="Recherche de fiche"
              />
              {suggestions.length > 0 && (
                <ul className="suggestions">
                  {suggestions.map((s, i) => (
                    <li key={s.valeur} aria-selected={i === sugIdx} onMouseEnter={() => setSugIdx(i)}
                      onClick={() => { setV((x) => ({ ...x, cible: s.libelle + " (" + s.href + ")" })); setReqFiche(s.libelle); setSuggestions([]); setSugIdx(-1); }}>
                      <span className="suggestion-libelle">{s.libelle}</span>
                      <span className="suggestion-detail">{s.detail ?? s.groupe}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="meta">{CIBLE[v.sujet]?.aide}</p>
            </div>
          ) : (
            <>
              <input ref={champInput} value={v.cible} onChange={(e) => { setV((x) => ({ ...x, cible: e.target.value })); setErr(""); }} placeholder={CIBLE[v.sujet]?.aide} aria-label="Réponse" />
              <p className="meta">{CIBLE[v.sujet]?.aide}</p>
            </>
          )}
          {err && <p className="erreur">{err}</p>}
          <button type="submit">Continuer</button>
        </form>
      )}

      {ecran === "droit" && (
        <div className="ct-ecran" key="droit">
          <p className="ct-etape">{etapes.indexOf(ecran) + 1} / {etapes.length}</p>
          <h2 className="ct-question">Quel droit souhaitez-vous exercer ?</h2>
          <ul className="ct-choix">
            {DROITS.map((d, i) => (
              <li key={d}>
                <button type="button" onClick={() => { setV((x) => ({ ...x, droit: d })); setPile((p) => [...p, "detail"]); }}>
                  <span className="ct-lettre" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                  <span className="ct-corps"><strong>{d}</strong></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ecran === "detail" && (
        <form className="ct-ecran" key="detail" onSubmit={validerDetail}>
          <p className="ct-etape">{etapes.indexOf(ecran) + 1} / {etapes.length}</p>
          <h2 className="ct-question">{DETAIL[v.sujet]?.libelle}</h2>
          <textarea ref={champZone} value={v.detail} onChange={(e) => { setV((x) => ({ ...x, detail: e.target.value })); setErr(""); }} maxLength={5000} aria-label={DETAIL[v.sujet]?.libelle} />
          <p className="meta">{DETAIL[v.sujet]?.aide}</p>
          {err && <p className="erreur">{err}</p>}
          <button type="submit">Continuer</button>
        </form>
      )}

      {ecran === "email" && (
        <form className="ct-ecran" key="email" onSubmit={validerEmail}>
          <p className="ct-etape">{etapes.indexOf(ecran) + 1} / {etapes.length}</p>
          <h2 className="ct-question">Sur quel e-mail vous répondre ?</h2>
          <input ref={champInput} type="email" value={v.email} onChange={(e) => { setV((x) => ({ ...x, email: e.target.value })); setErr(""); }} maxLength={254} autoComplete="email" />
          {connecte && <p className="meta">Adresse de votre compte : vous pouvez la modifier pour cette fois.</p>}
          {err && <p className="erreur">{err}</p>}
          <button type="submit">Continuer</button>
        </form>
      )}

      {ecran === "recap" && (
        <div className="ct-ecran" key="recap">
          <p className="ct-etape">{etapes.indexOf(ecran) + 1} / {etapes.length}</p>
          <h2 className="ct-question">Vérifiez avant d'envoyer</h2>
          <table className="ct-recap">
            <tbody>
              <tr><th scope="row">Prénom, nom</th><td>{v.prenom} {v.nom}</td></tr>
              <tr><th scope="row">Sujet</th><td>{SUJETS.find((s) => s.v === v.sujet)?.l}</td></tr>
              {v.cible && <tr><th scope="row">Concerne</th><td>{v.cible}</td></tr>}
              {v.droit && <tr><th scope="row">Droit</th><td>{v.droit}</td></tr>}
              <tr><th scope="row">Message</th><td>{v.detail}</td></tr>
              <tr><th scope="row">E-mail de réponse</th><td>{v.email}</td></tr>
            </tbody>
          </table>
          <p className="meta">Votre message et votre adresse servent uniquement à vous répondre. Voir la{" "}
            <a href="/informations-legales/confidentialite">politique de données personnelles</a>.</p>
          {err && <p className="erreur">{err}</p>}
          <div className="ct-actions" style={{ marginTop: 16 }}>
            <button type="button" onClick={envoyer} disabled={envoi}>{envoi ? "Envoi…" : "Envoyer"}</button>
            <button type="button" className="lien ct-retour" onClick={reculer}>Corriger une réponse</button>
          </div>
        </div>
      )}

      {pile.length > 1 && (
        <button type="button" className="lien ct-retour" onClick={reculer}>← Précédent</button>
      )}
    </div>
  );
}
