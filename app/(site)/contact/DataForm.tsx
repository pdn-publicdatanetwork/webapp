"use client";
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import Turnstile, { reinitialiserTurnstile } from "./Turnstile";

// DataForm' : formulaire de contact unifié de l'écosystème DataParl' (www,
// jobs, api). Parcours en étapes inspiré de Typeform : une question par écran,
// logique conditionnelle, e-mail demandé en fin de parcours sans compte
// (foot-in-the-door), raccourcis clavier (chiffres + Entrée), honeypot
// anti-spam, Turnstile à l'envoi. Design validé en canvas (dataform-contact).

// ── Icônes (Lucide, traits) ───────────────────────────────────────────────

const svg = (children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const IcoAide = () => svg(<><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2.5-3 4" /><line x1="12" y1="17" x2="12.01" y2="17" /></>);
const IcoBase = () => svg(<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" /></>);
const IcoBug = () => svg(<><path d="M8 2l1.9 2" /><path d="M16 2l-1.9 2" /><rect x="8" y="6" width="8" height="14" rx="4" /><path d="M8 12H3" /><path d="M21 12h-5" /><path d="M8.5 8.5L3.5 6" /><path d="M15.5 8.5l5-2.5" /><path d="M9 17l-4 3" /><path d="M15 17l4 3" /></>);
const IcoServiette = () => svg(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>);
const IcoBouclier = () => svg(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>);
const IcoCadenas = () => svg(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>);
const IcoCode = () => svg(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>);
const IcoJournal = () => svg(<><rect x="2" y="3" width="16" height="18" rx="2" /><path d="M22 7h-4v13h4a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" /><path d="M6 8h8" /><path d="M6 12h8" /><path d="M6 16h5" /></>);
const IcoBalance = () => svg(<><path d="M12 3v18" /><path d="M5 7l7-4 7 4" /><path d="M8 21h8" /><path d="M5 7L2 13a3.2 3.2 0 0 0 6.4 0L5 7z" /><path d="M19 7l-3 6a3.2 3.2 0 0 0 6.4 0L19 7z" /></>);
const IcoGauche = () => svg(<polyline points="15 18 9 12 15 6" />);
const IcoDroite = () => svg(<polyline points="9 18 15 12 9 6" />);

// ── Sites (Lab exclu pour l'instant) ───────────────────────────────────────

const SITES = [
  { id: "dataparl", label: "DataParl'", jaune: true, violet: false, suffixe: "" },
  { id: "jobs", label: "DataParl' Jobs", jaune: false, violet: true, suffixe: " Jobs" },
  { id: "api", label: "DataParl' API", jaune: false, violet: false, suffixe: " API" },
] as const;
type SiteId = (typeof SITES)[number]["id"];

function Marque({ site, petit }: { site: SiteId; petit?: boolean }) {
  const s = SITES.find((x) => x.id === site);
  const cls = s?.jaune ? "df-hl-jaune" : s?.violet ? "df-hl-violet" : "df-hl-vert";
  return (
    <span className="df-wordmark" style={petit ? { fontSize: "1rem" } : undefined}>
      Data<span className={cls}>Parl&apos;</span>
      {s?.suffixe ? " " + s.suffixe.replace(" ", "\u00a0") : ""}
    </span>
  );
}

// ── Motifs : communs + propres à un site, liste adaptée à la sélection ─────

type Raison = { id: string; titre: string; desc: string; Icone: () => JSX.Element };

const RAISONS_COMMUN: Raison[] = [
  { id: "A", titre: "Question générale", desc: "Une question sur le site, les données, le fonctionnement", Icone: IcoAide },
  { id: "C", titre: "Signaler un bug", desc: "Quelque chose ne fonctionne pas", Icone: IcoBug },
  { id: "D", titre: "Signaler un phishing", desc: "Un e-mail ou message suspect se faisant passer pour DataParl'", Icone: IcoBouclier },
  { id: "E", titre: "Demande RGPD (suppression, droits)", desc: "Vos droits sur vos données personnelles", Icone: IcoCadenas },
  { id: "G", titre: "Demande presse", desc: "Interview, donnée, partenariat : priorité aux médias", Icone: IcoJournal },
  { id: "H", titre: "Demande légale", desc: "Toute demande à caractère juridique", Icone: IcoBalance },
];
const RAISONS_SITE: Record<SiteId, Raison[]> = {
  dataparl: [{ id: "B", titre: "Signaler une erreur de donnée", desc: "Une fiche à corriger, avec sa source si possible", Icone: IcoBase }],
  jobs: [{ id: "J", titre: "Signaler une offre d'emploi", desc: "Une annonce à corriger ou à retirer", Icone: IcoServiette }],
  api: [{ id: "F", titre: "API DataParl'", desc: "Clé, licence, réutilisation des données", Icone: IcoCode }],
};

// Correspondance motif du parcours -> sujet de l'API / contact_messages.
const SUJET_API: Record<string, string> = {
  A: "question", B: "erreur", C: "bug", D: "phishing", E: "rgpd", F: "api", G: "presse", H: "legal", J: "offre",
};
const MOTIF_DEPUIS_SUJET: Record<string, string> = {
  question: "A", erreur: "B", bug: "C", phishing: "D", rgpd: "E", api: "F", presse: "G", legal: "H", offre: "J",
};

// Ordre canonique des écrans : référence de navigation quand l'étape active
// vient d'être retirée de la liste des étapes actives (voir la note plus bas).
const ORDRE_ETAPES = [0, 1, 9, 2, 4, 5, 6, 7, 3, 8];

// Presse : puces de médias courants + saisie libre.
const MEDIAS = [
  "Le Monde", "Le Figaro", "AFP", "Reuters", "Franceinfo", "Libération", "BFM TV",
  "France Télévisions", "Médiapart", "Ouest-France", "Sud Ouest", "20 Minutes",
  "Les Échos", "Le Parisien", "Radio France", "Contexte",
];

// Provenance : seuls les hôtes DataParl' sont acceptés pour le retour (aucune
// redirection ouverte possible).
const PROV_HOST: Record<string, SiteId> = {
  "dataparl.fr": "dataparl",
  "www.dataparl.fr": "dataparl",
  "jobs.dataparl.fr": "jobs",
  "api.dataparl.fr": "api",
};
function retourSur(p?: string | null): string {
  try {
    if (p) {
      const u = new URL(p);
      if (u.protocol === "https:" && (u.hostname === "dataparl.fr" || u.hostname.endsWith(".dataparl.fr"))) return u.toString();
    }
  } catch {}
  return "https://www.dataparl.fr";
}

// ── Composant ─────────────────────────────────────────────────────────────

export default function DataForm({
  sujetInitial,
  provenanceInitiale,
  messageInitial,
}: {
  sujetInitial?: string;
  provenanceInitiale?: string;
  messageInitial?: string;
}) {
  const [etape, setEtape] = useState(0);
  const [compte, setCompte] = useState<"oui" | "non" | null>(null);
  const [verification, setVerification] = useState(false);
  const [sessionTrouvee, setSessionTrouvee] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [sites, setSites] = useState<SiteId[]>([]);
  const [motif, setMotif] = useState<string | null>(null);
  const [precision, setPrecision] = useState("");
  const [lien, setLien] = useState("");
  const [details, setDetails] = useState("");
  const [hp, setHp] = useState("");
  const [jeton, setJeton] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState("");
  const [retour, setRetour] = useState("https://www.dataparl.fr");
  const [origineConnue, setOrigineConnue] = useState(false);
  const redirection = useRef<number | null>(null);

  // Provenance (paramètre puis referer), pré-sélection du site d'origine,
  // motif pré-sélectionné et détail pré-rempli par les liens existants.
  useEffect(() => {
    const p = provenanceInitiale || (typeof document !== "undefined" ? document.referrer : "") || "";
    setRetour(retourSur(p));
    try {
      if (p) {
        const sid = PROV_HOST[new URL(p).hostname];
        if (sid) {
          setSites([sid]);
          setOrigineConnue(true);
        }
      }
    } catch {}
    const m = sujetInitial ? MOTIF_DEPUIS_SUJET[sujetInitial] : undefined;
    if (m) setMotif(m);
    if (messageInitial) setDetails(messageInitial.slice(0, 5000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nettoyage de la redirection automatique si l'utilisateur quitte avant.
  useEffect(() => () => { if (redirection.current) window.clearTimeout(redirection.current); }, []);

  const raisonsActives = useMemo(() => {
    const propres: Raison[] = [];
    sites.forEach((sid) => RAISONS_SITE[sid].forEach((r) => { if (!propres.some((x) => x.id === r.id)) propres.push(r); }));
    return propres.concat(RAISONS_COMMUN);
  }, [sites]);

  const identiteComplete = prenom.trim().length > 0 && nom.trim().length > 0;

  // Étapes actives : la logique conditionnelle raccourcit le parcours.
  const etapes = useMemo(() => {
    const base = [0, 1];
    if (compte === "oui") {
      base.push(9);
      if (!identiteComplete) base.push(2); // session sans prénom/nom connus
    } else {
      base.push(2);
    }
    base.push(4, 5);
    if (motif && motif !== "A") base.push(6);
    base.push(7);
    if (compte !== "oui") base.push(3); // e-mail en fin de parcours sans compte
    base.push(8);
    return base;
  }, [compte, motif, identiteComplete]);

  // L'étape active peut avoir disparu de la liste au fil de la saisie (ex :
  // l'étape 2 « Comment vous appeler ? » est retirée dès que prénom ET nom
  // sont remplis, la liste se recalcule sans elle et etapes.indexOf(etape)
  // renvoie -1, ce qui rendait suivant() inactif : le parcours se bloquait,
  // bouton précédent et barre de progression figés). On navigue donc par
  // position dans l'ordre canonique, indépendamment de la liste.
  const position = ORDRE_ETAPES.indexOf(etape);
  const suiteActives = ORDRE_ETAPES.slice(position + 1).filter((e) => etapes.includes(e));
  const etapesAvecCourante = etapes.includes(etape) ? etapes.length : etapes.length + 1;
  const index = etapes.includes(etape)
    ? etapes.indexOf(etape)
    : etapes.filter((e) => ORDRE_ETAPES.indexOf(e) < position).length;
  const progression = Math.max(0, ((index + 1) / etapesAvecCourante) * 100);
  const derniere = suiteActives.length === 0;

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const peutContinuer = () => {
    switch (etape) {
      case 1: return compte !== null;
      case 2: return identiteComplete;
      case 3: return emailValide;
      case 4: return sites.length > 0;
      case 5: return motif !== null;
      case 6: return precision.trim().length > 0;
      case 7: return details.trim().length >= 5;
      case 8: return !envoi;
      case 9: return !verification && sessionTrouvee;
      default: return true;
    }
  };

  const suivant = () => {
    if (suiteActives.length) setEtape(suiteActives[0]);
  };
  const precedent = () => {
    const avant = ORDRE_ETAPES.slice(0, position).filter((e) => etapes.includes(e));
    if (avant.length) setEtape(avant[avant.length - 1]);
  };

  const continuerSansCompte = () => {
    setCompte("non");
    setSessionTrouvee(false);
    setPrenom("");
    setNom("");
    setEmail("");
    setEtape(2);
  };

  const choisirCompte = async (avecCompte: boolean) => {
    if (!avecCompte) {
      continuerSansCompte();
      return;
    }
    setCompte("oui");
    setVerification(true);
    setSessionTrouvee(false);
    setEtape(9);
    try {
      const s = await sessionActuelle();
      if (s?.user) {
        const md = (s.user.user_metadata ?? {}) as Record<string, unknown>;
        const complet = typeof md.full_name === "string" ? md.full_name : "";
        let p = typeof md.prenom === "string" && md.prenom ? md.prenom : complet.split(" ")[0] || "";
        let n = typeof md.nom === "string" && md.nom ? md.nom : complet.split(" ").slice(1).join(" ");
        let mel = s.user.email ?? "";
        setSessionTrouvee(true);
        // Session Firebase synthétique : le cookie .dataparl.fr ne porte pas
        // toujours le prénom/nom (comptes importés, connexion Google). On
        // demande alors l'identité authentique au serveur (métadonnées du
        // compte, même source que mon-compte), pour ne pas redemander un nom
        // déjà connu.
        if (!p || !n) {
          try {
            const res = await fetch("/api/compte", { headers: { authorization: "Bearer " + s.access_token } });
            if (res.ok) {
              const c = (await res.json()) as { prenom?: string; nom?: string; email?: string };
              p = p || (c.prenom ?? "");
              n = n || (c.nom ?? "");
              mel = mel || (c.email ?? "");
            }
          } catch {}
        }
        setPrenom(p);
        setNom(n);
        setEmail(mel);
      }
    } catch {
      setSessionTrouvee(false);
    } finally {
      setVerification(false);
    }
  };

  const basculerSite = (id: SiteId) => {
    const nouvelles = sites.includes(id) ? sites.filter((x) => x !== id) : [...sites, id];
    setSites(nouvelles);
    // Si le motif choisi est propre à un site désélectionné, on le retire.
    if (motif && !RAISONS_COMMUN.some((r) => r.id === motif)) {
      const dispo = nouvelles.flatMap((sid) => RAISONS_SITE[sid].map((r) => r.id));
      if (!dispo.includes(motif)) {
        setMotif(null);
        setPrecision("");
      }
    }
  };

  const envoyer = async () => {
    if (!peutContinuer() || envoi) return;
    setEnvoi(true);
    setErreurEnvoi("");
    const sitesTxt = sites.map((sid) => SITES.find((x) => x.id === sid)?.label ?? sid).join(", ");
    const lignes: string[] = ["Sites : " + sitesTxt];
    if (precision.trim()) lignes.push("Précision : " + precision.trim());
    if (lien.trim()) lignes.push("Lien : " + lien.trim());
    const message = (lignes.join("\n") + "\n\n" + details).slice(0, 5000);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prenom: prenom.trim(),
          nom: nom.trim(),
          email: email.trim(),
          sujet: SUJET_API[motif ?? "A"],
          message,
          site: hp,
          turnstile: jeton ?? "",
        }),
      });
      if (res.ok) {
        setEnvoye(true);
        // Retour automatique vers la page d'origine (provenance vérifiée).
        redirection.current = window.setTimeout(() => { window.location.href = retour; }, 6000);
        return;
      }
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErreurEnvoi(j.error ?? "Envoi impossible, réessayez.");
    } catch {
      setErreurEnvoi("Envoi impossible, réessayez.");
    }
    reinitialiserTurnstile();
    setEnvoi(false);
  };

  // Raccourcis clavier : chiffre = choisir l'option n, Entrée = continuer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (envoye) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.key === "Enter") {
        if (!peutContinuer()) return;
        if (derniere) void envoyer();
        else suivant();
        return;
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) {
        const btns = document.querySelectorAll<HTMLButtonElement>(".df-zone .df-option");
        if (btns[n - 1]) btns[n - 1].click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Écrans ─────────────────────────────────────────────────────────────

  const champ = (valeur: string, maj: (s: string) => void, idChamp: string, type: string, placeholder: string, max?: number) => (
    <input
      id={idChamp}
      className="df-field"
      type={type}
      placeholder={placeholder}
      value={valeur}
      maxLength={max}
      autoComplete={type === "email" ? "email" : "off"}
      onChange={(e) => maj(e.target.value)}
    />
  );

  const etapeDemande = () => {
    const r = motif;
    let titre = "";
    if (r === "B") titre = "Quelle fiche est concernée ?";
    else if (r === "C") titre = "Signalez le bug";
    else if (r === "D") titre = "Signalez le phishing";
    else if (r === "E") titre = "Quel droit voulez-vous exercer ?";
    else if (r === "F") titre = "Quel est votre sujet API ?";
    else if (r === "G") titre = "Quel média ou structure représentez-vous ?";
    else if (r === "H") titre = "De quelle nature est votre demande ?";
    else titre = "Quelle offre est concernée ?";

    let corps: React.ReactNode = null;
    if (r === "B") {
      corps = (<>
        <div>
          <label className="df-lbl" htmlFor="df-precision">Nom de l&apos;élu ou de la structure</label>
          {champ(precision, setPrecision, "df-precision", "text", "Ex : fiche député, nom...", 200)}
        </div>
        <div>
          <label className="df-lbl" htmlFor="df-lien">Lien de la page concernée (URL)</label>
          {champ(lien, setLien, "df-lien", "url", "https://dataparl.fr/...", 2000)}
        </div>
      </>);
    } else if (r === "C" || r === "D" || r === "J") {
      corps = (<>
        <div>
          <label className="df-lbl" htmlFor="df-lien">{r === "J" ? "Lien de l'offre" : "Lien ou URL de la page concernée"}</label>
          {champ(lien, setLien, "df-lien", "url", "https://dataparl.fr/...", 2000)}
        </div>
        <div>
          <label className="df-lbl" htmlFor="df-precision">Décrivez brièvement le problème</label>
          {champ(precision, setPrecision, "df-precision", "text", r === "J" ? "Ex : annonce périmée, coordonnées erronées..." : "Ex : erreur 500, bouton inactif, faux e-mail reçu...", 300)}
        </div>
        <p className="df-note">Astuce : une capture d&apos;écran peut être jointe par e-mail en réponse à l&apos;accusé de réception.</p>
      </>);
    } else if (r === "E") {
      corps = (
        <div>
          <label className="df-lbl" htmlFor="df-precision">Précisez le droit RGPD souhaité</label>
          <select id="df-precision" className="df-field" value={precision} onChange={(e) => setPrecision(e.target.value)}>
            <option value="">Sélectionner un droit...</option>
            <option value="Accès">Droit d&apos;accès</option>
            <option value="Rectification">Droit de rectification</option>
            <option value="Suppression">Droit à l&apos;effacement / suppression</option>
            <option value="Autre">Autre demande RGPD</option>
          </select>
        </div>
      );
    } else if (r === "F") {
      corps = (
        <div>
          <label className="df-lbl" htmlFor="df-precision">Sujet API</label>
          <select id="df-precision" className="df-field" value={precision} onChange={(e) => setPrecision(e.target.value)}>
            <option value="">Sélectionner...</option>
            <option value="Créer ou renouveler une clé API">Créer ou renouveler une clé API</option>
            <option value="Licence et réutilisation">Licence et réutilisation</option>
            <option value="Quotas et limites">Quotas et limites</option>
            <option value="Documentation">Documentation</option>
            <option value="Autre sujet API">Autre sujet API</option>
          </select>
        </div>
      );
    } else if (r === "G") {
      corps = (<>
        <div>
          <span className="df-lbl">Média ou structure</span>
          <div className="df-chips" role="group" aria-label="Médias courants">
            {MEDIAS.map((m) => (
              <button key={m} type="button" className={"df-chip" + (precision === m ? " selected" : "")} onClick={() => setPrecision(m)}>{m}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="df-lbl" htmlFor="df-precision">Autre : saisissez librement</label>
          {champ(MEDIAS.includes(precision) ? "" : precision, (s) => setPrecision(s), "df-precision", "text", "Ex : un média local, un freelance...", 200)}
        </div>
      </>);
    } else {
      // H : demande légale, pré-choix de nature.
      corps = (
        <div>
          <label className="df-lbl" htmlFor="df-precision">Nature de la demande</label>
          <select id="df-precision" className="df-field" value={precision} onChange={(e) => setPrecision(e.target.value)}>
            <option value="">Sélectionner...</option>
            <option value="Retrait ou correction d'un contenu">Retrait ou correction d&apos;un contenu</option>
            <option value="Données personnelles (RGPD)">Données personnelles (RGPD)</option>
            <option value="Atteinte à la réputation, diffamation">Atteinte à la réputation, diffamation</option>
            <option value="Droit à l'image">Droit à l&apos;image</option>
            <option value="Propriété intellectuelle">Propriété intellectuelle</option>
            <option value="Mise en demeure ou procédure">Mise en demeure ou procédure</option>
            <option value="Autre demande juridique">Autre demande juridique</option>
          </select>
        </div>
      );
    }

    return (
      <div className="df-stack">
        <h2 className="df-h2">{titre}</h2>
        {corps}
      </div>
    );
  };

  const ecran = () => {
    if (etape === 0) {
      return (
        <div className="df-center df-stack" style={{ maxWidth: "36rem", margin: "0 auto" }}>
          <h1 className="df-h1">Une question, une correction, une idée ?</h1>
          <p className="df-sub" style={{ margin: "0 0 1.5rem" }}>2 minutes maximum.</p>
          <div><button type="button" className="df-btn" onClick={suivant}>Commencer</button></div>
        </div>
      );
    }
    if (etape === 1) {
      return (
        <div className="df-stack">
          <h2 className="df-h2">Vous avez déjà un compte DataParl&apos; ?</h2>
          <div className="df-grid2">
            <button type="button" className={"df-option" + (compte === "oui" ? " selected" : "")} onClick={() => choisirCompte(true)}>
              <span className="df-ico-tile">Σ</span>
              <span className="df-titre">Oui, j&apos;ai un compte</span>
            </button>
            <button type="button" className={"df-option" + (compte === "non" ? " selected" : "")} onClick={() => choisirCompte(false)}>
              <span className="df-ico-tile" style={{ background: "var(--df-line)" }}>→</span>
              <span className="df-titre">Continuer sans compte</span>
            </button>
          </div>
          <p className="df-note">Au clavier : 1 ou 2, puis Entrée.</p>
        </div>
      );
    }
    if (etape === 9) {
      if (verification) {
        return (
          <div className="df-stack df-center">
            <div className="df-spinner" />
            <p className="df-lead">Vérification de votre session auth.dataparl.fr...</p>
          </div>
        );
      }
      if (!sessionTrouvee) {
        return (
          <div className="df-stack">
            <h2 className="df-h2">Aucune session active trouvée</h2>
            <p className="df-lead">Connectez-vous sur auth.dataparl.fr pour que vos informations soient remplies automatiquement.</p>
            <div className="df-nav-group">
              <a className="df-btn" href="/connexion">Se connecter</a>
              <button type="button" className="df-lien" onClick={continuerSansCompte}>Continuer sans compte</button>
            </div>
          </div>
        );
      }
      return (
        <div className="df-stack">
          <h2 className="df-h2">C&apos;est bien vous ?</h2>
          <div className="df-compte-carte">
            <span className="df-compte-avatar">{(prenom || "?").charAt(0)}</span>
            <span>
              <b>{prenom} {nom}</b>
              <br />
              <span style={{ color: "var(--df-muted)" }}>{email}</span>
            </span>
          </div>
          <div><button type="button" className="df-btn" onClick={suivant}>C&apos;est bien moi</button></div>
          <p className="df-note"><button type="button" className="df-lien" onClick={continuerSansCompte}>Continuer sans compte</button></p>
        </div>
      );
    }
    if (etape === 2) {
      return (
        <div className="df-stack">
          <h2 className="df-h2">Comment vous appeler ?</h2>
          <div className="df-grid2">
            <div>
              <label className="df-lbl" htmlFor="df-prenom">Prénom</label>
              {champ(prenom, setPrenom, "df-prenom", "text", "camille", 80)}
            </div>
            <div>
              <label className="df-lbl" htmlFor="df-nom">Nom</label>
              {champ(nom, setNom, "df-nom", "text", "durand", 80)}
            </div>
          </div>
        </div>
      );
    }
    if (etape === 3) {
      return (
        <div className="df-stack">
          <h2 className="df-h2">Sur quel e-mail vous répondre ?</h2>
          {champ(email, setEmail, "df-email", "email", "nom@exemple.fr", 254)}
          <p className="df-note">Un seul usage : vous répondre. Pas de newsletter, pas de spam.</p>
          {email.length > 0 && !emailValide && <p className="df-erreur">Adresse invalide.</p>}
        </div>
      );
    }
    if (etape === 4) {
      const salut = prenom ? prenom + ", pour quel(s) site(s) ?" : "Pour quel(s) site(s) ?";
      return (
        <div className="df-stack">
          <h2 className="df-h2">{salut}</h2>
          <p className="df-sub">Vous pouvez en sélectionner plusieurs.</p>
          {origineConnue && sites.length === 1 && (
            <p className="df-note" style={{ margin: "-0.75rem 0 1rem" }}>Site d&apos;origine déjà sélectionné, vous pouvez en ajouter d&apos;autres.</p>
          )}
          <div className="df-grid2">
            {SITES.map((s) => (
              <button key={s.id} type="button" className={"df-option df-option-site" + (sites.includes(s.id) ? " selected" : "")} onClick={() => basculerSite(s.id)}>
                <Marque site={s.id} />
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (etape === 5) {
      return (
        <div>
          <h2 className="df-h2">Pourquoi êtes-vous là ?</h2>
          <div className="df-scroll">
            {raisonsActives.map((r) => (
              <button key={r.id} type="button" className={"df-option" + (motif === r.id ? " selected" : "")} onClick={() => setMotif(r.id)}>
                <span className="df-ico-tile"><r.Icone /></span>
                <span>
                  <span className="df-titre">{r.titre}</span>
                  <br />
                  <span className="df-desc">{r.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (etape === 6) return etapeDemande();
    if (etape === 7) {
      return (
        <div className="df-stack">
          <h2 className="df-h2">Détaillez votre demande</h2>
          <textarea
            className="df-field"
            rows={4}
            maxLength={5000}
            placeholder="Minimum 5 caractères..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
      );
    }
    // étape 8 : récapitulatif + Turnstile.
    const sitesTxt = sites.map((sid) => SITES.find((x) => x.id === sid)?.label ?? sid).join(", ");
    const raisonTxt = raisonsActives.find((r) => r.id === motif)?.titre ?? "";
    return (
      <div className="df-stack">
        <h2 className="df-h2">Vérifiez avant d&apos;envoyer</h2>
        <div className="df-recap">
          <div><b>Prénom, NOM :</b> {prenom} {nom}</div>
          <div><b>Mail :</b> {email}</div>
          <div><b>Sites :</b> {sitesTxt}</div>
          <div><b>Motif :</b> {raisonTxt}</div>
          {precision && <div><b>Précision :</b> {precision}</div>}
          {lien && <div><b>Lien :</b> {lien}</div>}
          <div><b>Détails :</b> {details}</div>
        </div>
        <Turnstile jetonRecu={setJeton} />
        {motif === "E" && <p className="df-note">Une réponse est due dans le cadre du RGPD, sous un mois.</p>}
        {erreurEnvoi && <p className="df-erreur" role="alert">{erreurEnvoi}</p>}
      </div>
    );
  };

  // ── Rendu ───────────────────────────────────────────────────────────────

  if (envoye) {
    return (
      <div className="df-zone">
        <h1 className="df-h1-cache">Contact</h1>
        <header className="df-entete">
          <a className="df-logo" href="https://www.dataparl.fr">Data<span className="df-surligne">Parl&apos;</span></a>
        </header>
        <main className="df-main">
          <div className="df-center df-stack" style={{ maxWidth: "32rem", margin: "0 auto" }}>
            <div className="df-succes-check">✓</div>
            <h2 className="df-h2" style={{ fontSize: "1.6rem" }}>Message bien transmis !</h2>
            <p className="df-lead">Votre demande a bien été prise en compte par l&apos;équipe DataParl&apos;.</p>
            <div className="df-decouvre">
              <a href="https://www.dataparl.fr">Data<span className="df-hl-jaune">Parl&apos;</span></a>
              <a href="https://jobs.dataparl.fr">Data<span className="df-hl-violet">Parl&apos;</span> Jobs</a>
              <a href="https://api.dataparl.fr">Data<span className="df-hl-vert">Parl&apos;</span> API</a>
            </div>
            <div><a className="df-btn" href={retour}>Revenir où vous étiez</a></div>
            <p className="df-note">Retour automatique vers votre page dans quelques secondes.</p>
          </div>
        </main>
        <footer className="df-footer">
          <a href="https://www.dataparl.fr/informations-legales">Informations légales</a>
          <a href="https://status.dataparl.fr">Statut des services</a>
          <span className="df-copyright">© 2026 DataParl&apos; : le Parlement, pièce par pièce.</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="df-zone">
      <h1 className="df-h1-cache">Contact</h1>
      {/* Honeypot anti-spam : jamais visible, le serveur rejette s'il est rempli. */}
      <input type="text" name="site" className="df-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={(e) => setHp(e.target.value)} />
      <header className="df-entete">
        <a className="df-logo" href="https://www.dataparl.fr">Data<span className="df-surligne">Parl&apos;</span></a>
        <div className="df-progress"><div className="df-progress-fill" style={{ width: progression + "%" }} /></div>
      </header>
      <main className="df-main">{ecran()}</main>
      <footer className="df-nav">
        <div>
          {index > 0 && (
            <button type="button" className="df-btn-nav ghost" onClick={precedent} title="Précédent" aria-label="Étape précédente"><IcoGauche /></button>
          )}
        </div>
        <div className="df-nav-group">
          {derniere ? (
            <button type="button" className="df-btn-envoyer" onClick={() => void envoyer()} disabled={!peutContinuer()}>
              {envoi ? "Envoi..." : "Envoyer ma demande"}
            </button>
          ) : (
            <button type="button" className="df-btn-nav solid" onClick={suivant} disabled={!peutContinuer()} title="Suivant" aria-label="Étape suivante"><IcoDroite /></button>
          )}
        </div>
      </footer>
      <footer className="df-footer">
        <a href="https://www.dataparl.fr/informations-legales">Informations légales</a>
        <a href="https://status.dataparl.fr">Statut des services</a>
        <span className="df-copyright">© 2026 DataParl&apos; : le Parlement, pièce par pièce.</span>
      </footer>
    </div>
  );
}
