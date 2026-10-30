"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Autocompletion, { chargerElus } from "@/app/_components/Autocompletion";
import { familleDe, FAMILLES } from "@/lib/familles";
import { CHAMBRE_LONG, nomAffiche, prenomNom } from "@/lib/format";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import StyleCompte from "../style-compte";

// Mes alertes : tout le réglage du contenu des alertes parlementaires :
// fréquences, chambres, types, mais aussi groupes, familles et élus
// suivis (autocomplétion, comme sur /alertes). Le canal (activer/arrêter
// les alertes, newsletter, suivi) se gère dans Communications.
type Elu = { chambre: string; cle: string; nom: string; groupe: string };
type EluCompact = { s: string; p: string; n: string; c: string };
type Freq = "quotidienne" | "hebdomadaire";
type Alertes = { actives: boolean; frequences: Freq[]; chambres: string[]; types: string[]; groupes: string[]; elus: string[]; partis: string[]; commissions: string[] };
type Compte = { email: string; alertes: Alertes };

const CHAMBRES = ["assemblee", "senat", "europarl"];
const TYPES = [{ v: "arrivee", l: "Arrivées" }, { v: "depart", l: "Départs" }, { v: "transfert", l: "Transferts" }];

export default function MesAlertes() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [compte, setCompte] = useState<Compte | null>(null);
  const [r, setR] = useState<Alertes | null>(null);
  const [elus, setElus] = useState<Elu[]>([]);
  const [compacts, setCompacts] = useState<EluCompact[]>([]);
  const [raz, setRaz] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const appel = useCallback(async (url: string, init: RequestInit = {}) => {
    // Le jeton est relu à chaque appel : la session en mémoire peut être
    // expirée (onglet en arrière-plan).
    return fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}), Authorization: `Bearer ${(await sessionActuelle())?.access_token}` } });
  }, []);

  useEffect(() => {
    sessionActuelle().then(setSession);
  }, []);

  useEffect(() => {
    fetch("/api/referentiel").then((x) => (x.ok ? x.json() : null)).then((d) => { if (d) setElus(d.elus); });
    chargerElus().then(setCompacts);
  }, []);

  useEffect(() => {
    if (!session) return;
    appel("/api/compte").then(async (x) => {
      if (!x.ok) return setMessage({ ok: false, texte: "Impossible de charger tes alertes." });
      const c: Compte = await x.json();
      setCompte(c);
      setR(c.alertes);
    });
  }, [session, appel]);

  // Élus enregistrés : identifiant de fiche (slug) ou, pour les anciens
  // réglages, clé de nom.
  const nomDe = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of elus) m.set(e.cle, nomAffiche(e.nom));
    for (const e of compacts) m.set(e.s, prenomNom(e.p, e.n));
    return m;
  }, [elus, compacts]);
  const libelleGroupe = (v: string) => {
    const f = FAMILLES.find((x) => x.code === v);
    if (f) return `${f.code} : ${f.libelle}`;
    const fam = ["assemblee", "senat", "europarl"].map((c) => familleDe(c, v)).find(Boolean);
    return fam ? `${v} (${fam.code})` : v;
  };

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card">
        <h1>Mes alertes</h1>
        <p>Connecte-toi pour gérer tes alertes.</p>
        <a className="btn" href="/connexion?suite=/mon-compte/alertes">Se connecter</a>
      </div>
    );
  }
  if (!r || !compte) return <p className="meta">{message?.texte ?? "Chargement…"}</p>;

  const basculer = (k: "chambres" | "types" | "groupes", v: string) =>
    setR({ ...r, [k]: r[k].includes(v) ? r[k].filter((x) => x !== v) : [...r[k], v] });
  const ajouter = (k: "groupes" | "elus", v: string) => {
    if (!r[k].includes(v)) setR({ ...r, [k]: [...r[k], v] });
    setRaz((n) => n + 1);
  };

  async function enregistrer() {
    // TypeScript ne propage pas le garde-fou if (!r) dans les closures :
    // on fige l'état au moment de l'appel.
    if (!r) return;
    const regles: Alertes = r;
    setEnCours(true);
    setMessage(null);
    const res = await appel("/api/compte/alertes", {
      method: "PUT",
      body: JSON.stringify({
        // Le canal (on/off) se gère dans Communications : on conserve
        // l'état actuel, on n'enregistre que le contenu.
        actives: regles.actives,
        frequences: regles.frequences.length ? regles.frequences : ["quotidienne"],
        chambres: regles.chambres.length ? regles.chambres : ["assemblee", "senat"],
        types: regles.types.length ? regles.types : ["arrivee", "depart", "transfert"],
        groupes: regles.groupes,
        elus: regles.elus,
        partis: regles.partis,
        commissions: regles.commissions,
        cgu: regles.actives,
        consentement: regles.actives,
      }),
    });
    setEnCours(false);
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return setMessage({ ok: false, texte: d.error ?? "Enregistrement impossible, réessaie." });
    setMessage({ ok: true, texte: "Réglages des alertes enregistrés." });
  }

  return (
    <div className="etroit">
      <StyleCompte />
      <h1>Mes <span className="surligne">alertes</span></h1>
      <p className="meta fil-compte"><a className="lien" href="/mon-compte">Compte</a> / Mes alertes</p>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

      <section className="section-compte">
        <h2>Alertes parlementaires</h2>
        <p className="meta" style={{ marginTop: 0 }}>
          Alertes envoyées à <strong>{compte.email}</strong>, {r.actives ? "actives" : "arrêtées"}
          {!r.actives && <>, réactive-les dans <a href="/mon-compte/communications">Communications</a></>}
        </p>

        <p><strong>Fréquence</strong></p>
        <label className="check"><input type="checkbox" checked={r.frequences.includes("quotidienne")} onChange={() => setR({ ...r, frequences: r.frequences.includes("quotidienne") ? r.frequences.filter((f) => f !== "quotidienne") : [...r.frequences, "quotidienne"] })} /> Daily : chaque jour où il y a du mouvement</label>
        <label className="check"><input type="checkbox" checked={r.frequences.includes("hebdomadaire")} onChange={() => setR({ ...r, frequences: r.frequences.includes("hebdomadaire") ? r.frequences.filter((f) => f !== "hebdomadaire") : [...r.frequences, "hebdomadaire"] })} /> Weekly : le récapitulatif du lundi</label>

        <p><strong>Chambres suivies</strong></p>
        {CHAMBRES.map((c) => (
          <label key={c} className="check"><input type="checkbox" checked={r.chambres.includes(c)} onChange={() => basculer("chambres", c)} /> {CHAMBRE_LONG[c]}</label>
        ))}

        <p><strong>Types de mouvement</strong></p>
        {TYPES.map((t) => (
          <label key={t.v} className="check"><input type="checkbox" checked={r.types.includes(t.v)} onChange={() => basculer("types", t.v)} /> {t.l}</label>
        ))}

        <p><strong>Groupes ou familles politiques</strong> <span className="meta">(aucun = tous)</span></p>
        <Autocompletion key={`g${raz}`} id="groupe-alerte" source="groupes" placeholder="ex. GEST, EcoS, écolo… (ECO couvre les trois chambres)"
          onChoix={(o) => o && ajouter("groupes", o.valeur)} />
        <div className="puces">
          {r.groupes.map((g) => (
            <span key={g} className="puce">
              {libelleGroupe(g)}
              <button type="button" aria-label="Retirer" onClick={() => setR({ ...r, groupes: r.groupes.filter((x) => x !== g) })}>×</button>
            </span>
          ))}
        </div>

        <p><strong>Élus</strong> <span className="meta">(aucun = tous)</span></p>
        <Autocompletion key={`e${raz}`} id="elu-alerte" source="elus" placeholder="Commence à taper un nom"
          onChoix={(o) => o && ajouter("elus", o.valeur)} />
        <div className="puces">
          {r.elus.map((k) => (
            <span key={k} className="puce">
              {nomDe.get(k) ?? k}
              <button type="button" aria-label="Retirer" onClick={() => setR({ ...r, elus: r.elus.filter((x) => x !== k) })}>×</button>
            </span>
          ))}
        </div>

        <p style={{ marginTop: 18 }}>
          <button className="btn" onClick={enregistrer} disabled={enCours}>Enregistrer</button>
        </p>
      </section>
    </div>
  );
}
