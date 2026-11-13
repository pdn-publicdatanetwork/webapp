"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { sessionActuelle } from "@/lib/supabaseBrowser";

type Compte = {
  email: string;
  cree_le: string;
  prenom: string;
  nom: string;
  equipe: boolean;
  alertes: { actives: boolean; frequence: "quotidienne" | "hebdomadaire"; chambres: string[]; types: string[] };
};
type Cle = { quota_jour: number; requetes_aujourdhui: number; last_used_at: string | null };

const CHAMBRES = [
  { v: "assemblee", l: "Assemblée nationale" },
  { v: "senat", l: "Sénat" },
  { v: "europarl", l: "Parlement européen" },
];

// Icônes de section, trait fin, discrètes (mêmes glyphes que Mon compte).
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
  if (nom === "enveloppe") return (<svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>);
  if (nom === "mallette") return (<svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></svg>);
  return (<svg {...p}><path d="M9 8l-4 4 4 4" /><path d="M15 8l4 4-4 4" /><path d="M13 6l-2 12" /></svg>);
}

// La capsule my.dataparl.fr : trois cartes de synthèse (profil, clé API,
// emploi) au-dessus de la navigation du compte. Les cartes affichent des
// données réelles (/api/compte, /api/cles) ; l'emploi est une rubrique
// « bientôt », le temps que les fonctions Jobs exposent leurs données.
export default function CapsuleClient() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [compte, setCompte] = useState<Compte | null>(null);
  const [cle, setCle] = useState<Cle | null | undefined>(undefined);

  const appel = useCallback(async (url: string) => {
    const s = await sessionActuelle();
    return fetch(url, { headers: { Authorization: `Bearer ${s?.access_token ?? ""}` } });
  }, []);

  useEffect(() => { sessionActuelle().then(setSession); }, []);

  useEffect(() => {
    if (!session) return;
    appel("/api/compte").then(async (r) => { if (r.ok) setCompte(await r.json()); });
    appel("/api/cles").then(async (r) => {
      if (r.ok) { const d = await r.json(); setCle(d.cles[0] ?? null); } else setCle(null);
    });
  }, [session, appel]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  // Accueil non connecté : une seule invitation à se connecter (celle de la
  // carte ; le bouton de l'en-tête est masqué sur cette page), un texte
  // court, et un aperçu des trois cartes de la capsule en pointillés — on
  // montre la valeur avant de demander la connexion, sans dévoiler de données.
  if (!session) {
    return (
      <div className="capsule-accueil">
        <style>{`
          .capsule-accueil { max-width: 600px; margin: 0 auto; padding: 26px 0 8px; }
          .capsule-accueil h1 { margin: 0; }
          .capsule-accueil-intro { color: var(--muted); margin: 10px 0 22px; font-size: 1rem; }
          .capsule-accueil-ou { font-size: .82rem; color: var(--muted); margin: 12px 0 30px; }
          .capsule-accueil-teaser { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
          .capsule-accueil-apercu { border: 1px dashed var(--line); border-radius: var(--radius-card); padding: 16px; background: var(--card); }
          .capsule-accueil-apercu h2 { display: flex; align-items: center; gap: 8px; font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; color: var(--muted); margin: 0 0 10px; }
          .capsule-accueil-apercu p { font-size: .85rem; color: var(--muted); margin: 0; line-height: 1.45; }
          @media (max-width: 700px) { .capsule-accueil-teaser { grid-template-columns: 1fr; } }
        `}</style>
        <h1>Mon <span className="surligne">espace</span></h1>
        <p className="capsule-accueil-intro">Ton compte, ta clé API et tes outils Jobs, au même endroit.</p>
        <a className="btn" href="/connexion?suite=/">Se connecter</a>
        <p className="capsule-accueil-ou">Par email (lien magique), Google ou GitHub, depuis la porte de connexion.</p>
        <div className="capsule-accueil-teaser" aria-label="Aperçu des rubriques de la capsule">
          <div className="capsule-accueil-apercu">
            <h2><Icone nom="personne" /> Mon profil</h2>
            <p>Prénom, nom, email et fiche de collaborateur publiée.</p>
          </div>
          <div className="capsule-accueil-apercu">
            <h2><Icone nom="code" /> Mon API</h2>
            <p>Ta clé, tes requêtes du jour et ton quota, en direct.</p>
          </div>
          <div className="capsule-accueil-apercu">
            <h2><Icone nom="mallette" /> Mon emploi</h2>
            <p>Candidatures, alertes et CV Matching, en direct de Jobs.</p>
          </div>
        </div>
      </div>
    );
  }
  if (!compte) return <p className="meta">Chargement…</p>;

  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const nomComplet = [compte.prenom, compte.nom].filter(Boolean).join(" ");
  const resumeAlertes = compte.alertes.actives
    ? compte.alertes.chambres.map((c) => CHAMBRES.find((x) => x.v === c)?.l ?? c).join(", ")
    : "Aucune alerte pour l'instant";

  const rubriques = [
    { titre: "Informations personnelles", resume: nomComplet || "Prénom et nom du compte", href: "/mon-compte/informations", icone: "personne" },
    { titre: "Sécurité et connexion", resume: "Mot de passe, validation en deux étapes, clés d'accès, activité", href: "/mon-compte/securite", icone: "cadenas" },
    { titre: "Communications", resume: "Newsletter, alertes par email et suivi des e-mails", href: "/mon-compte/communications", icone: "enveloppe" },
    { titre: "Mes alertes", resume: resumeAlertes, href: "/mon-compte/alertes", icone: "cloche" },
    { titre: "Ma fiche collaborateur", resume: "Le profil CV publié sur dataparl.fr", href: "/mon-compte/ma-fiche", icone: "document" },
    { titre: "Mon espace API", resume: "Ta clé API, sa consommation et la documentation", href: "/mon-espace-api", icone: "code" },
    { titre: "DataParl' Jobs", resume: "Tes candidatures, tes alertes et ton profil de collaborateur", href: "/jobs", icone: "mallette" },
    ...(compte.equipe ? [{ titre: "Achats et abonnements", resume: "Bientôt : des packs sans publicité", href: "/mon-compte/achats", icone: "document" }] : []),
    { titre: "Données et confidentialité", resume: "Export de tes données et suppression du compte", href: "/mon-compte/preferences", icone: "bouclier" },
  ];

  return (
    <div className="etroit">
      <style>{`
        .capsule-carte { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-card); padding: 20px; }
        .capsule-cartes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0 28px; }
        .capsule-carte h2 { font-size: .78rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; margin: 0; display: flex; align-items: center; justify-content: space-between; }
        .capsule-carte-valeur { font-size: 1.35rem; font-weight: 700; margin: 14px 0 4px; color: var(--ink); }
        .capsule-carte-meta { font-size: .85rem; color: var(--muted); margin: 0; }
        .capsule-carte-action { display: inline-block; margin-top: 14px; font-size: .85rem; font-weight: 500; color: var(--bleu); }
        .compte-item { display: flex; align-items: center; gap: 16px; min-height: 76px; padding: 12px 14px; margin: 0 -14px; text-decoration: none; border-radius: 10px; transition: background 0.15s ease; }
        .compte-item + .compte-item { border-top: 1px solid rgba(15, 23, 42, 0.06); }
        .compte-item:hover, .compte-item:focus-visible { background: rgba(15, 23, 42, 0.05); }
        .capsule-titre-rubriques { font-size: .95rem; font-weight: 600; margin: 0; padding: 16px 20px; border-bottom: 1px solid var(--line); background: var(--card); border-radius: var(--radius-card) var(--radius-card) 0 0; }
        @media (max-width: 900px) { .capsule-cartes { grid-template-columns: 1fr; } }
      `}</style>

      <h1>Mon <span className="surligne">espace</span></h1>
      <p className="meta" style={{ margin: "6px 0 0" }}>Ton compte, ta clé API et tes outils Jobs, au même endroit.</p>

      <div className="capsule-cartes">
        <div className="capsule-carte">
          <h2>Mon profil <span style={{ color: "var(--muted)", display: "flex" }}><Icone nom="personne" /></span></h2>
          <p className="capsule-carte-valeur">{nomComplet || "Ton compte"}</p>
          <p className="capsule-carte-meta">
            Compte créé le {fmt.format(new Date(compte.cree_le))}
            <br />{compte.email}
          </p>
          <a className="capsule-carte-action" href="/mon-compte/informations">Gérer mon profil →</a>
        </div>
        <div className="capsule-carte">
          <h2>Mon API <span style={{ color: "var(--muted)", display: "flex" }}><Icone nom="code" /></span></h2>
          <p className="capsule-carte-valeur">{cle ? `${cle.requetes_aujourdhui} / ${cle.quota_jour}` : "Pas encore de clé"}</p>
          <p className="capsule-carte-meta">
            {cle
              ? <>requêtes aujourd&apos;hui · dernier appel {cle.last_used_at ? "effectué" : "jamais"}</>
              : <>Demande ta clé pour brancher l&apos;API DataParl&apos;</>}
          </p>
          <a className="capsule-carte-action" href="/mon-espace-api">Voir ma clé et la documentation →</a>
        </div>
        <div className="capsule-carte">
          <h2>Mon emploi <span style={{ color: "var(--muted)", display: "flex" }}><Icone nom="mallette" /></span></h2>
          <p className="capsule-carte-valeur">Bientôt</p>
          <p className="capsule-carte-meta">
            Candidatures, alertes et CV Matching
            <br />arrivent ici, en direct de DataParl&apos; Jobs
          </p>
          <a className="capsule-carte-action" href="/jobs">Voir DataParl&apos; Jobs →</a>
        </div>
      </div>

      <section style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-card)", overflow: "hidden", background: "var(--card)" }}>
        <h2 className="capsule-titre-rubriques">Mon compte</h2>
        {rubriques.map((r) => (
          <a key={r.titre} className="compte-item" href={r.href}>
            <span style={{ color: "#5C5C5C", display: "flex" }}><Icone nom={r.icone} /></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>{r.titre}</span>
              <span style={{ display: "block", fontSize: 14, color: "#5C5C5C", marginTop: 2 }}>{r.resume}</span>
            </span>
            <span aria-hidden="true" style={{ color: "#9A9A9A", fontSize: 20, lineHeight: 1 }}>›</span>
          </a>
        ))}
      </section>
    </div>
  );
}
