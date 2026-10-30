"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Autocompletion, { chargerElus } from "@/app/_components/Autocompletion";
import { CHAMBRE_LONG, nomAffiche, prenomNom } from "@/lib/format";
import { sessionActuelle } from "@/lib/supabaseBrowser";

type Collab = { nom: string; prenom: string; civilite: string; fonction: string; statut: string; email: string | null };
type Equipe = { chambre: string; elu_id: string; elu_cle: string; elu_nom: string; elu_groupe: string; elu_email: string | null; id_page: string; collabs: Collab[] };

function csv(equipes: Equipe[]): string {
  const cell = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lignes = [["Chambre", "Élu", "Groupe", "Email élu (déduit)", "Civilité", "Prénom", "Nom", "Fonction", "Email collaborateur (déduit)"].map(cell).join(";")];
  for (const e of equipes) {
    for (const c of e.collabs) {
      lignes.push([CHAMBRE_LONG[e.chambre], nomAffiche(e.elu_nom), e.elu_groupe, e.elu_email ?? "", c.civilite, c.prenom, c.nom.toLocaleUpperCase("fr-FR"), c.fonction, c.email ?? ""].map(cell).join(";"));
    }
  }
  return "\ufeff" + lignes.join("\r\n");
}

function telecharger(nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

const slug = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function Equipes() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [f, setF] = useState<Record<string, string>>({ chambre: "", groupe: "", elu: "", q: "" });
  const [eluSaisi, setEluSaisi] = useState("");
  const [depuisUrl, setDepuisUrl] = useState(false);
  const [equipes, setEquipes] = useState<Equipe[] | null>(null);
  const [etat, setEtat] = useState<"idle" | "chargement">("idle");
  const [erreur, setErreur] = useState("");

  useEffect(() => { sessionActuelle().then(setSession); }, []);
  // Lien « Contacts et export de l'équipe » depuis une fiche : ?elu=<identifiant>.
  useEffect(() => {
    const elu = new URLSearchParams(window.location.search).get("elu");
    if (!elu) return;
    setF((x) => ({ ...x, elu }));
    setDepuisUrl(true);
    chargerElus().then((liste) => {
      const e = liste.find((x) => x.s.toLowerCase() === elu.toLowerCase());
      if (e) setEluSaisi(prenomNom(e.p, e.n));
    });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (session && depuisUrl && f.elu) chercher(); }, [session, depuisUrl]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card" style={{ maxWidth: "none" }}>
        <p style={{ marginTop: 0 }}><strong>La recherche des collaborateurs est réservée aux comptes DataParl&apos;</strong>, gratuits.</p>
        <a className="btn" href="/connexion?suite=/collab">Créer un compte ou se connecter</a>
      </div>
    );
  }

  async function chercher(e?: React.FormEvent) {
    e?.preventDefault();
    if (!session) return;
    setEtat("chargement");
    setErreur("");
    const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    const r = await fetch(`/api/collabs?${p}`, { headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => null);
    setEtat("idle");
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) return setErreur(d.error ?? "La recherche n'a pas abouti.");
    setEquipes(d.equipes);
  }

  const total = equipes?.reduce((n, e) => n + e.collabs.length, 0) ?? 0;

  return (
    <>
      <form className="card" style={{ maxWidth: "none" }} onSubmit={chercher}>
        <div className="grille-filtres">
          <div>
            <label htmlFor="c-chambre">Chambre</label>
            <select id="c-chambre" value={f.chambre} onChange={(e) => { setF({ ...f, chambre: e.target.value, groupe: "", elu: "" }); setEluSaisi(""); }}>
              <option value="">Toutes</option>
              <option value="assemblee">Assemblée nationale</option>
              <option value="senat">Sénat</option>
              <option value="europarl">Parlement européen</option>
            </select>
          </div>
          <div>
            <label htmlFor="c-groupe">Groupe ou famille politique</label>
            <Autocompletion id="c-groupe" source="groupes" placeholder="ex. GEST, EcoS, écolo…" valeurInitiale={f.groupe}
              onChoix={(o) => setF((x) => ({ ...x, groupe: o?.valeur ?? "" }))} />
          </div>
          <div>
            <label htmlFor="c-commission">Commission</label>
            <select id="c-commission" disabled><option>Bientôt disponible</option></select>
          </div>
        </div>
        <label htmlFor="c-elu">Élu</label>
        <Autocompletion id="c-elu" source="elus" chambre={f.chambre || undefined} placeholder="Commence à taper un nom" valeurInitiale={eluSaisi}
          onChoix={(o) => setF((x) => ({ ...x, elu: o?.valeur ?? "" }))} />
        <label htmlFor="c-q">Nom d&apos;un collaborateur</label>
        <input id="c-q" type="text" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="ex. Martin" />
        <button type="submit" disabled={etat === "chargement"}>Rechercher</button>
      </form>

      {erreur && <p className="erreur">{erreur}</p>}
      {equipes && (
        <>
          <p className="meta">
            {equipes.length} élu{equipes.length > 1 ? "s" : ""}, {total} collaborateur{total > 1 ? "s" : ""}.{" "}
            {equipes.length > 0 && (
              <button className="lien" onClick={() => telecharger("dataparl-collaborateurs.csv", csv(equipes))}>Tout exporter (CSV)</button>
            )}
          </p>
          <p className="meta">Les adresses email sont <strong>déduites</strong> des règles de nommage des assemblées : elles ne sont pas vérifiées et peuvent être inexactes.</p>
          {equipes.map((e) => (
            <section key={`${e.chambre}-${e.elu_cle}`} className="section-compte">
              <h2 style={{ marginBottom: 4 }}>
                <a href={`/parlementaires/${encodeURIComponent(e.id_page)}`} style={{ color: "inherit" }}>{nomAffiche(e.elu_nom)}</a>
              </h2>
              <p className="meta" style={{ marginTop: 0 }}>
                {CHAMBRE_LONG[e.chambre]}{e.elu_groupe ? `, ${e.elu_groupe}` : ""}{e.elu_email ? `, ${e.elu_email}` : ""}
              </p>
              <table className="stats">
                <thead><tr><th>Collaborateur</th><th>Fonction</th><th>Email (déduit)</th></tr></thead>
                <tbody>
                  {e.collabs.map((c, i) => (
                    <tr key={i}>
                      <td>{prenomNom(c.prenom, c.nom)}{c.statut === "conge_sans_solde" && <span className="meta"> (congé)</span>}</td>
                      <td>{c.fonction || "Collaborateur"}</td>
                      <td>{c.email ?? <span className="meta">masquée</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="secondaire" onClick={() => telecharger(`dataparl-equipe-${slug(nomAffiche(e.elu_nom))}.csv`, csv([e]))}>Exporter l&apos;équipe (CSV)</button>{" "}
              <button className="secondaire" onClick={() => navigator.clipboard?.writeText([e.elu_email, ...e.collabs.map((c) => c.email)].filter(Boolean).join("; "))}>
                Copier les emails
              </button>
            </section>
          ))}
        </>
      )}
    </>
  );
}
