"use client";
import { useEffect, useState } from "react";
import { lien, type Espace } from "./liens";
import { useAdmin, type Role } from "./Porte";
import { authBrowser } from "@/lib/supabaseBrowser";

export const LIBELLE_ROLE: Record<Role, string> = { admin: "Administrateur", editeur: "Éditeur", utilisateur: "Utilisateur" };

// Accès : liste de rôles, ou module de la matrice de permissions.
type Acces = Role[] | string;
type Entree = { chemin: string; libelle: string; acces: Acces };
type Section = { chemin: string; libelle: string; acces?: Acces; entrees?: Entree[] };

// Sections de l'admin, groupées selon l'organisation de l'espace :
// tableau de bord, prise de contact, contenu, presse, actions, utilisateurs, admin, mon espace.
const SECTIONS: Section[] = [
  { chemin: "/", libelle: "Tableau de bord", acces: ["admin", "editeur"] },
  { chemin: "/contact", libelle: "Contact", acces: "formulaires" },
  {
    chemin: "/content", libelle: "Contenu", entrees: [
      { chemin: "/content/sitemap", libelle: "Plan du site", acces: "contenu_sitemap" },
      { chemin: "/content/sheets", libelle: "DataParl' Sheets", acces: "contenu_sheets" },
      { chemin: "/content/links", libelle: "Liens courts", acces: "contenu_liens" },
      { chemin: "/content/survey", libelle: "Enquête utilisateurs", acces: "contenu_enquete" },
      { chemin: "/elus", libelle: "Fiches élus", acces: "elus" },
      { chemin: "/elus/edit", libelle: "Éditeur de bios", acces: "elus" },
      { chemin: "/oppositions", libelle: "Suppressions de fiches", acces: "formulaires" },
    ],
  },
  { chemin: "/presse", libelle: "Presse", acces: "communication" },
  { chemin: "/jorf", libelle: "JORF", acces: "jorf" },
  { chemin: "/emplois", libelle: "Emplois", acces: ["admin", "editeur"] },
  {
    chemin: "/users", libelle: "Utilisateurs", acces: "comptes", entrees: [
      { chemin: "/users", libelle: "Comptes", acces: "comptes" },
      { chemin: "/users/abonnes", libelle: "Abonnés aux alertes", acces: "comptes" },
      { chemin: "/users/api-keys", libelle: "Clés API", acces: "cles_api" },
      { chemin: "/telechargements", libelle: "Téléchargements Sheets", acces: "comptes" },
      { chemin: "/maintenance", libelle: "Prévenus maintenance", acces: "comptes" },
    ],
  },
  { chemin: "/journal", libelle: "Journal", acces: "journal" },
  { chemin: "/equipe", libelle: "Équipe", acces: ["admin"] },
  { chemin: "/moi", libelle: "Mon espace", acces: ["admin", "editeur", "utilisateur"] },
];

// Accès non défini (simple menu regroupant des sous-sections) : toujours visible,
// le filtrage se fait sur les entrées.
const visible = (acces: Acces | undefined, role: Role, modules: string[]) =>
  !acces ? true : typeof acces === "string" ? modules.includes(acces) : acces.includes(role);

export default function EnTete({ espace }: { espace: Espace }) {
  const { nom, email, role, modules, verrouiller } = useAdmin();
  const [actif, setActif] = useState("");
  useEffect(() => { setActif(window.location.pathname.replace(/^\/admin/, "") || "/"); }, []);
  const sections = SECTIONS.filter((s) => visible(s.acces, role, modules) || (s.entrees ?? []).some((e) => visible(e.acces, role, modules)));
  return (
    <header className="site admin">
      <div className="wrap large">
        <a className="logo" href={lien(espace, role === "utilisateur" ? "/moi" : "/")}>Data<span className="surligne">Parl&apos;</span> <span className="espace">{espace === "admin" ? "Espace équipe" : "Webmail"}</span></a>
        <div className="qui">
          <span className={`badge-role ${role}`}>{LIBELLE_ROLE[role]}</span>
          <span className="qui-nom"><strong>{nom}</strong><span className="meta">{email}</span></span>
          <button className="lien" onClick={verrouiller}>Verrouiller</button>
          <button className="lien" onClick={async () => { await authBrowser().auth.signOut(); window.location.href = lien(espace, "/connexion"); }}>Déconnexion</button>
        </div>
      </div>
      <nav className="wrap large onglets-admin">
       {espace === "admin" ? sections.map((s) => {
          const actifSous = (c: string) => actif === c || (c !== "/" && actif.startsWith(`${c}/`));
          const ouvert = actifSous(s.chemin) || (s.entrees ?? []).some((e) => actifSous(e.chemin));
          if (!s.entrees) {
            return <a key={s.chemin} href={lien("admin", s.chemin)} aria-current={actifSous(s.chemin) ? "page" : undefined}>{s.libelle}</a>;
          }
          const entrees = s.entrees.filter((e) => visible(e.acces, role, modules));
          return (
            <details key={s.chemin} className="menu-admin" data-ouvert={ouvert ? "" : undefined} open={ouvert}>
              <summary aria-current={ouvert ? "page" : undefined}>{s.libelle}</summary>
              <div className="menu-admin-panneau">
                {entrees.map((e) => (
                  <a key={e.chemin} href={lien("admin", e.chemin)} aria-current={actif === e.chemin ? "page" : undefined}>{e.libelle}</a>
                ))}
              </div>
            </details>
          );
        }) : <a href={lien("admin", role === "utilisateur" ? "/moi" : "/")}>← Espace équipe</a>}
        {espace === "admin" && <a href={lien("webmail")}>Messagerie</a>}
      </nav>
    </header>
  );
}
