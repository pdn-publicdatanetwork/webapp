"use client";
import { useEffect, useState, type ReactNode } from "react";
import { PRIORITES, type Priorite } from "@/lib/enquete";

// Questionnaire « Ton avis sur DataParl' » (forms.dataparl.fr/avis), interface
// DataForm' : une question par écran, progression, chevrons, raccourcis
// clavier (1-5 pour les notes, numéro pour les priorités, Entrée). Le jeton
// à usage unique protège l'envoi : pas de captcha ni honeypot. Le moteur
// restera le même pour d'autres enquêtes.

const ETAPES = [0, 1, 2, 3, 4, 5];

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const IcoGauche = () => svg(<polyline points="15 18 9 12 15 6" />);
const IcoDroite = () => svg(<polyline points="9 18 15 12 9 6" />);

function Notes({ choix, surChoix }: { choix: number | null; surChoix: (n: number) => void }) {
  return (
    <>
      <div className="df-notes" role="group" aria-label="Note de 1 à 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} type="button" aria-label={`${n} sur 5`}
            className={"df-note-btn" + (choix !== null && n <= choix ? " pleine" : "") + (choix === n ? " choisie" : "")}
            onClick={() => surChoix(n)}
          >★</button>
        ))}
      </div>
      <p className="df-note">Au clavier : 1 à 5, puis Entrée.</p>
    </>
  );
}

function Pied() {
  return (
    <footer className="df-footer">
      <a href="https://www.dataparl.fr/informations-legales">Informations légales</a>
      <a href="https://status.dataparl.fr">Statut des services</a>
      <span className="df-copyright">© 2026 DataParl&apos; : le Parlement, pièce par pièce.</span>
    </footer>
  );
}

function Decouvre() {
  return (
    <div className="df-decouvre">
      <a href="https://www.dataparl.fr">Data<span className="df-hl-jaune">Parl&apos;</span></a>
      <a href="https://jobs.dataparl.fr">Data<span className="df-hl-violet">Parl&apos;</span> Jobs</a>
      <a href="https://api.dataparl.fr">Data<span className="df-hl-vert">Parl&apos;</span> API</a>
    </div>
  );
}

export default function FormulaireEnquete({ jeton }: { jeton: string }) {
  const [etape, setEtape] = useState(0);
  const [experience, setExperience] = useState<number | null>(null);
  const [contenu, setContenu] = useState<number | null>(null);
  const [global, setGlobal] = useState<number | null>(null);
  const [priorites, setPriorites] = useState<Priorite[]>([]);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [merci, setMerci] = useState(false);
  const [deja, setDeja] = useState(false);
  const [message, setMessage] = useState("");

  const index = ETAPES.indexOf(etape);
  const dernier = etape === ETAPES[ETAPES.length - 1];

  const peutContinuer =
    etape === 1 ? experience !== null :
    etape === 2 ? contenu !== null :
    etape === 3 ? global !== null :
    etape === 4 ? priorites.length > 0 : true;

  function suivant() {
    if (index < 0 || index + 1 >= ETAPES.length) return;
    setEtape(ETAPES[index + 1]);
  }
  function precedent() {
    if (index > 0) setEtape(ETAPES[index - 1]);
  }

  async function envoyer() {
    if (!peutContinuer || envoi) return;
    setEnvoi(true);
    setMessage("");
    const r = await fetch("/api/enquete/repondre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ j: jeton, note_experience: experience, note_contenu: contenu, note_global: global, priorites, commentaire }),
    });
    setEnvoi(false);
    if (r.ok) { setMerci(true); return; }
    const d = await r.json().catch(() => ({}));
    if (d.error === "déjà répondu") { setDeja(true); return; }
    setMessage(d.error === "invitation inconnue ou expirée" ? "Ce lien n'est plus valable." : "Envoi impossible, réessayez dans un instant.");
  }

  // Retour automatique vers www 6 s après l'écran merci.
  useEffect(() => {
    if (!merci) return;
    const t = window.setTimeout(() => { window.location.assign("https://www.dataparl.fr"); }, 6000);
    return () => window.clearTimeout(t);
  }, [merci]);

  // Raccourcis clavier : chiffres (note ou priorité) et Entrée (continuer,
  // envoyer). Réabonné à chaque rendu pour lire l'état courant.
  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (envoi || merci || deja) return;
      const cible = e.target as HTMLElement | null;
      if (cible && (cible.tagName === "TEXTAREA" || cible.tagName === "INPUT")) return;
      if (e.key === "Enter") {
        if (!peutContinuer) return;
        if (dernier) void envoyer(); else suivant();
        return;
      }
      const n = parseInt(e.key, 10);
      if (!n || n < 1 || n > 9) return;
      if (etape >= 1 && etape <= 3 && n <= 5) {
        if (etape === 1) setExperience(n);
        else if (etape === 2) setContenu(n);
        else setGlobal(n);
      } else if (etape === 4 && n <= PRIORITES.length) {
        const p = PRIORITES[n - 1];
        setPriorites((avant) => (avant.includes(p) ? avant.filter((x) => x !== p) : [...avant, p]));
      }
    }
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  });

  if (merci || deja) {
    return (
      <div className="df-zone df-zone-avis">
        <header className="df-entete"><span className="df-logo">Data<span className="df-surligne">Parl&apos;</span></span></header>
        <main className="df-main">
          <div className="df-center df-stack" style={{ maxWidth: "32rem", margin: "0 auto" }}>
            <div className="df-succes-check">✓</div>
            <h1 className="df-h1" style={{ fontSize: "1.6rem" }}>Merci, c&apos;est <span className="df-surligne">noté</span> !</h1>
            <p className="df-lead">{deja ? "Ce questionnaire a déjà été rempli, votre réponse est enregistrée." : "Votre réponse est enregistrée. Elle sert à régler les priorités : expérience du site, profondeur des données, lisibilité."}</p>
            <Decouvre />
          </div>
        </main>
        <Pied />
      </div>
    );
  }

  if (envoi) {
    return (
      <div className="df-zone df-zone-avis">
        <header className="df-entete"><span className="df-logo">Data<span className="df-surligne">Parl&apos;</span></span></header>
        <main className="df-main">
          <div className="df-center">
            <div className="df-spinner" />
            <p className="df-lead" style={{ marginTop: "1.5rem" }}>Enregistrement…</p>
          </div>
        </main>
        <Pied />
      </div>
    );
  }

  const progression = Math.max(0, ((index + 1) / ETAPES.length) * 100);

  return (
    <div className="df-zone df-zone-avis">
      <header className="df-entete">
        <span className="df-logo">Data<span className="df-surligne">Parl&apos;</span></span>
        <div className="df-progress"><div className="df-progress-fill" style={{ width: `${progression}%` }} /></div>
      </header>
      <main className="df-main">
        {etape === 0 && (
          <div className="df-center df-stack" style={{ maxWidth: "36rem", margin: "0 auto" }}>
            <h1 className="df-h1">30 secondes pour <span className="df-surligne">tout changer</span></h1>
            <div><button type="button" className="df-btn" onClick={suivant}>Commencer</button></div>
          </div>
        )}
        {etape === 1 && (
          <div>
            <h2 className="df-h2" style={{ marginBottom: "0.5rem" }}>Comment se passe l&apos;expérience du site ?</h2>
            <p className="df-sub">Navigation, vitesse, clarté.</p>
            <Notes choix={experience} surChoix={setExperience} />
          </div>
        )}
        {etape === 2 && (
          <div>
            <h2 className="df-h2" style={{ marginBottom: "0.5rem" }}>Comment trouvez-vous le contenu publié ?</h2>
            <p className="df-sub">Fiches, données, méthodes, sources.</p>
            <Notes choix={contenu} surChoix={setContenu} />
          </div>
        )}
        {etape === 3 && (
          <div>
            <h2 className="df-h2" style={{ marginBottom: "0.5rem" }}>Votre note globale pour DataParl&apos; ?</h2>
            <p className="df-sub">Celle qui résume tout.</p>
            <Notes choix={global} surChoix={setGlobal} />
          </div>
        )}
        {etape === 4 && (
          <div>
            <h2 className="df-h2" style={{ marginBottom: "0.5rem" }}>Qu&apos;est-ce qu&apos;on améliore en priorité ?</h2>
            <p className="df-sub">Vous pouvez en choisir plusieurs.</p>
            <div className="df-chips" role="group" aria-label="Priorités d&apos;amélioration">
              {PRIORITES.map((p) => (
                <button
                  key={p} type="button"
                  className={"df-chip" + (priorites.includes(p) ? " selected" : "")}
                  onClick={() => setPriorites((avant) => (avant.includes(p) ? avant.filter((x) => x !== p) : [...avant, p]))}
                >{p}</button>
              ))}
            </div>
            <p className="df-note">Au clavier : le numéro de la puce pour la sélectionner.</p>
          </div>
        )}
        {etape === 5 && (
          <div>
            <h2 className="df-h2" style={{ marginBottom: "0.5rem" }}>
              Un commentaire ? <span style={{ color: "var(--df-muted)", fontWeight: 400 }}>(facultatif)</span>
            </h2>
            <p className="df-sub">Ce qui vous manque, ce que vous changeriez, ce que vous voudriez voir ensuite…</p>
            <textarea
              className="df-field" rows={4} maxLength={2000}
              placeholder="Écrivez librement…"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
            <p className="df-note">
              Besoin d&apos;écrire plus précisément, ou d&apos;une vraie réponse ?{" "}
              <a className="df-lien" href="https://forms.dataparl.fr/contact">Écrivez-nous via le formulaire de contact</a>.
            </p>
          </div>
        )}
        {message && <p className="df-erreur" style={{ marginTop: "1rem" }}>{message}</p>}
      </main>
      <footer className="df-nav">
        <div>
          {index > 0 && (
            <button type="button" className="df-btn-nav ghost" onClick={precedent} title="Précédent" aria-label="Étape précédente"><IcoGauche /></button>
          )}
        </div>
        <div className="df-nav-group">
          {dernier ? (
            <button type="button" className="df-btn-envoyer" onClick={() => void envoyer()} disabled={!peutContinuer || envoi}>Envoyer mes réponses</button>
          ) : (
            <button type="button" className="df-btn-nav solid" onClick={suivant} disabled={!peutContinuer} title="Suivant" aria-label="Étape suivante"><IcoDroite /></button>
          )}
        </div>
      </footer>
      <Pied />
    </div>
  );
}
