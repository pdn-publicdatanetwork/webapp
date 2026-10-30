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
  alertes: { actives: boolean; frequence: "quotidienne" | "hebdomadaire"; chambres: string[]; types: string[] };
};

const CHAMBRES = [
  { v: "assemblee", l: "Assemblée nationale" },
  { v: "senat", l: "Sénat" },
  { v: "europarl", l: "Parlement européen" },
];

// Mon compte : le centre du compte, à la manière du compte Google. Chaque
// rubrique est une carte qui résume l'état et mène à sa page dédiée.
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
    ? `Actives : ${compte.alertes.chambres.map((c) => CHAMBRES.find((x) => x.v === c)?.l ?? c).join(", ")}`
    : "Aucune alerte pour l'instant";

  function Carte({ titre, resume, href, externe = false }: { titre: string; resume: string; href: string; externe?: boolean }) {
    return (
      <a className="section-compte" href={href} {...(externe ? { target: "_blank", rel: "noreferrer" } : {})} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>{titre}</p>
          <p className="meta" style={{ margin: "4px 0 0" }}>{resume}</p>
        </div>
        <span aria-hidden="true" style={{ marginLeft: "auto", color: "#64748b", fontSize: 20 }}>{externe ? "↗" : "›"}</span>
      </a>
    );
  }

  return (
    <div className="etroit">
      <h1>Mon <span className="surligne">compte</span></h1>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

      <section className="section-compte" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#0F172A", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 600, flexShrink: 0 }}>
          {initiale}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{compte.prenom ? `Bonjour ${compte.prenom}` : compte.email}</p>
          <p className="meta" style={{ margin: 0 }}>
            {compte.prenom ? `${compte.email} — ` : ""}compte créé le {fmt.format(new Date(compte.cree_le))}
          </p>
        </div>
      </section>

      <Carte titre="Informations personnelles" resume={nomComplet || "Prénom et nom utilisés pour tes e-mails"} href="/mon-compte/informations" />
      <Carte titre="Sécurité et connexion" resume="Mot de passe, validation en deux étapes, clés d'accès, mon activité" href="/mon-compte/securite" />
      <Carte titre="Données et confidentialité" resume="Newsletter, suivi, export et suppression" href="/mon-compte/preferences" />
      <Carte titre="Mes alertes" resume={resumeAlertes} href="/mon-compte/alertes" />
      <Carte titre="Ma fiche collaborateur" resume="Le profil CV publié sur dataparl.fr" href="/mon-compte/ma-fiche" />
      <Carte titre="Mon espace API" resume="Ta clé API, sa consommation et la documentation" href="https://api.dataparl.fr/mon-espace-api" externe />
      <Carte titre="Achats et abonnements" resume="Bientôt : des packs sans publicité" href="/mon-compte/achats" />

      <p style={{ marginTop: 18 }}><button className="lien" onClick={deconnexion}>Se déconnecter</button></p>
    </div>
  );
}