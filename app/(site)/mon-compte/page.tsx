"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { authBrowser, sessionActuelle } from "@/lib/supabaseBrowser";

type Compte = {
  email: string;
  cree_le: string;
  prenom: string;
  nom: string;
  fournisseurs: string[];
  equipe: boolean;
  alertes: { actives: boolean; frequence: "quotidienne" | "hebdomadaire"; chambres: string[]; types: string[] };
};

const CHAMBRES = [
  { v: "assemblee", l: "Assemblée nationale" },
  { v: "senat", l: "Sénat" },
  { v: "europarl", l: "Parlement européen" },
];

// Icônes de section, trait fin, discrètes.
function Icone({ nom }: { nom: string }) {
  const p = {
    width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7,
    strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
  } as React.SVGProps<SVGSVGElement>;
  if (nom === "personne") return (<svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></svg>);
  if (nom === "cadenas") return (<svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>);
  if (nom === "bouclier") return (<svg {...p}><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" /></svg>);
  if (nom === "cloche") return (<svg {...p}><path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2H4.5z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>);
  if (nom === "document") return (<svg {...p}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>);
  return (<svg {...p}><path d="M9 8l-4 4 4 4" /><path d="M15 8l4 4-4 4" /><path d="M13 6l-2 12" /></svg>);
}

// Mon compte : le centre du compte, à la manière du compte Google — grand
// avatar et salutation, puis une liste aérée de rubriques avec icône et
// chevron. Les rubriques en préparation (Achats) ne sont proposées qu'à
// l'équipe.
export default function MonCompte() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [compte, setCompte] = useState<Compte | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const appel = useCallback(
    // Le jeton est relu à chaque appel : la session en mémoire peut être
    // expirée (onglet en arrière-plan) — sessionActuelle() la rafraîchit.
    async (url: string, init: RequestInit = {}) => {
      const s = await sessionActuelle();
      return fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${s?.access_token}` } });
    },
    [],
  );

  useEffect(() => {
    // Retour d'une association Google/GitHub refusée par DataParl' Auth.
    const params = new URLSearchParams(window.location.search + "&" + window.location.hash.slice(1));
    const erreur = params.get("error_description");
    if (erreur) {
      setMessage({
        ok: false,
        texte: /already linked|already exists/i.test(erreur)
          ? "Ce compte est déjà relié à un autre compte DataParl'. Supprime d'abord l'autre compte (ou écris-nous via le formulaire de contact) pour pouvoir l'associer ici."
          : "L'association n'a pas abouti, réessaie.",
      });
      window.history.replaceState(null, "", "/mon-compte");
    }
    sessionActuelle().then(setSession);
  }, []);

  useEffect(() => {
    if (!session) return;
    appel("/api/compte").then(async (r) => {
      if (r.ok) setCompte(await r.json());
      else setMessage({ ok: false, texte: "Impossible de charger ton compte." });
    });
  }, [session, appel]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card">
        <h1>Mon compte</h1>
        <p>Connecte-toi pour gérer ton compte, tes alertes et tes données.</p>
        <a className="btn" href="/connexion?suite=/mon-compte">Se connecter</a>
      </div>
    );
  }
  if (!compte) return <p className="meta">{message?.texte ?? "Chargement…"}</p>;

  async function deconnexion() {
    await authBrowser().auth.signOut();
    window.location.replace("/");
  }

  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const initiale = (compte.prenom || compte.email)[0].toUpperCase();
  const nomComplet = [compte.prenom, compte.nom].filter(Boolean).join(" ");
  const resumeAlertes = compte.alertes.actives
    ? compte.alertes.chambres.map((c) => CHAMBRES.find((x) => x.v === c)?.l ?? c).join(" · ")
    : "Aucune alerte pour l'instant";

  const rubriques = [
    { titre: "Informations personnelles", resume: nomComplet || "Prénom et nom du compte", href: "/mon-compte/informations", icone: "personne" },
    { titre: "Sécurité et connexion", resume: "Mot de passe, validation en deux étapes, clés d'accès, activité", href: "/mon-compte/securite", icone: "cadenas" },
    { titre: "Données et confidentialité", resume: "Newsletter, suivi, export et suppression", href: "/mon-compte/preferences", icone: "bouclier" },
    { titre: "Mes alertes", resume: resumeAlertes, href: "/mon-compte/alertes", icone: "cloche" },
    { titre: "Ma fiche collaborateur", resume: "Le profil CV publié sur dataparl.fr", href: "/mon-compte/ma-fiche", icone: "document" },
    { titre: "Mon espace API", resume: "Ta clé API, sa consommation et la documentation", href: "https://api.dataparl.fr/mon-espace-api", icone: "code", externe: true },
    ...(compte.equipe ? [{ titre: "Achats et abonnements", resume: "Bientôt : des packs sans publicité", href: "/mon-compte/achats", icone: "document" }] : []),
  ];

  return (
    <div className="etroit">
      <style>{`
        .compte-item { display: flex; align-items: center; gap: 16px; min-height: 72px; padding: 12px 14px; margin: 0 -14px; text-decoration: none; border-radius: 10px; transition: background 0.15s ease; }
        .compte-item + .compte-item { border-top: 1px solid rgba(15, 23, 42, 0.06); }
        .compte-item:hover, .compte-item:focus-visible { background: rgba(15, 23, 42, 0.05); }
      `}</style>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

      <section style={{ textAlign: "left", padding: "4px 0 24px" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#0F172A", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 600 }}>
          {initiale}
        </div>
        <p style={{ margin: "16px 0 0", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", color: "#1A1A1A" }}>
          {compte.prenom ? `Bonjour ${compte.prenom}` : "Mon compte"}
        </p>
        <p className="meta" style={{ margin: "6px 0 0", fontSize: 14 }}>
          {compte.email} — compte créé le {fmt.format(new Date(compte.cree_le))}
        </p>
      </section>

      <div style={{ borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}>
        {rubriques.map((r) => (
          <a key={r.titre} className="compte-item" href={r.href} {...("externe" in r && r.externe ? { target: "_blank", rel: "noreferrer" } : {})}>
            <span style={{ color: "#5C5C5C", display: "flex" }}><Icone nom={r.icone} /></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>{r.titre}</span>
              <span style={{ display: "block", fontSize: 14, color: "#5C5C5C", marginTop: 2 }}>{r.resume}</span>
            </span>
            <span aria-hidden="true" style={{ color: "#9A9A9A", fontSize: 20, lineHeight: 1 }}>{"externe" in r && r.externe ? "↗" : "›"}</span>
          </a>
        ))}
      </div>

      <p style={{ marginTop: 24, fontSize: 14 }}><button className="lien" onClick={deconnexion}>Se déconnecter</button></p>
    </div>
  );
}