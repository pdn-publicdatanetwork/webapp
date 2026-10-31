"use client";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Autocompletion, { chargerElus } from "@/app/_components/Autocompletion";
import { familleDe, FAMILLES } from "@/lib/familles";
import { CHAMBRE_LONG, nomAffiche, prenomNom } from "@/lib/format";
import { sessionActuelle } from "@/lib/supabaseBrowser";

type Elu = { chambre: string; cle: string; nom: string; groupe: string };
type EluCompact = { s: string; p: string; n: string; c: string };
type Reglage = {
  actives: boolean; frequences: ("quotidienne" | "hebdomadaire")[]; chambres: string[]; types: string[];
  groupes: string[]; elus: string[]; partis: string[]; commissions: string[]; prenom?: string; nom?: string;
};

const CHAMBRES = ["assemblee", "senat", "europarl"];
const TYPES = [{ v: "arrivee", l: "Arrivées" }, { v: "depart", l: "Départs" }, { v: "transfert", l: "Transferts" }];

export default function ReglageAlertes() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [r, setR] = useState<Reglage | null>(null);
  const [elus, setElus] = useState<Elu[]>([]);
  const [compacts, setCompacts] = useState<EluCompact[]>([]);
  const [raz, setRaz] = useState(0);
  const [cgu, setCgu] = useState(false);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; t: string } | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => { sessionActuelle().then(setSession); }, []);
  useEffect(() => {
    fetch("/api/referentiel").then((x) => (x.ok ? x.json() : null)).then((d) => { if (d) setElus(d.elus); });
    chargerElus().then(setCompacts);
  }, []);
  useEffect(() => {
    if (!session) return;
    fetch("/api/compte", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((x) => (x.ok ? x.json() : null))
      .then((d) => d && setR({ ...d.alertes, actives: d.alertes.actives }));
  }, [session]);

  // Élus enregistrés : identifiant de fiche (slug) ou, pour les anciens réglages, clé de nom.
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
        <p style={{ marginTop: 0 }}>Les alertes sont liées à un compte DataParl&apos;, gratuit : une adresse email suffit.</p>
        <a className="btn" href="/connexion?suite=/alertes">Créer un compte ou se connecter</a>
      </div>
    );
  }
  if (!r) return <p className="meta">Chargement…</p>;

  const basculer = (k: "chambres" | "types" | "groupes", v: string) =>
    setR({ ...r, [k]: r[k].includes(v) ? r[k].filter((x) => x !== v) : [...r[k], v] });
  const ajouter = (k: "groupes" | "elus", v: string) => {
    if (!r[k].includes(v)) setR({ ...r, [k]: [...r[k], v] });
    setRaz((n) => n + 1);
  };
  const pret = cgu && consent && r.chambres.length > 0 && r.types.length > 0 && r.frequences.length > 0;

  async function enregistrer(actives: boolean) {
    if (!session || !r) return;
    setEnCours(true);
    const res = await fetch("/api/compte/alertes", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...r, actives, cgu, consentement: consent }),
    });
    setEnCours(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage({ ok: false, t: d.error ?? "Erreur, réessaie." });
    setR({ ...r, actives });
    setMessage({ ok: true, t: actives ? "C'est fait : tes alertes sont actives." : "Tes alertes sont désactivées." });
  }

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <p className="meta" style={{ marginTop: 0 }}>
        Alertes envoyées à <strong>{session.user.email}</strong>, {r.actives ? "actives" : "inactives"}
      </p>

      <label>Chambres</label>
      {CHAMBRES.map((c) => (
        <label key={c} className="check"><input type="checkbox" checked={r.chambres.includes(c)} onChange={() => basculer("chambres", c)} /> {CHAMBRE_LONG[c]}</label>
      ))}

      <label>Types de mouvement</label>
      {TYPES.map((t) => (
        <label key={t.v} className="check"><input type="checkbox" checked={r.types.includes(t.v)} onChange={() => basculer("types", t.v)} /> {t.l}</label>
      ))}

      <label htmlFor="groupe-alerte">Groupes ou familles politiques <span className="meta">(aucun = tous)</span></label>
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

      <label htmlFor="elu-alerte">Élus <span className="meta">(aucun = tous)</span></label>
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

      <label>Fréquence <span className="meta">(les deux si tu veux)</span></label>
      <label className="check"><input type="checkbox" checked={r.frequences.includes("quotidienne")} onChange={() => setR({ ...r, frequences: r.frequences.includes("quotidienne") ? r.frequences.filter((f) => f !== "quotidienne") : [...r.frequences, "quotidienne"] })} /> DataParl&apos; Daily : chaque jour où ça bouge</label>
      <label className="check"><input type="checkbox" checked={r.frequences.includes("hebdomadaire")} onChange={() => setR({ ...r, frequences: r.frequences.includes("hebdomadaire") ? r.frequences.filter((f) => f !== "hebdomadaire") : [...r.frequences, "hebdomadaire"] })} /> DataParl&apos; Weekly : le récapitulatif du lundi</label>

      <label className="check" style={{ marginTop: 22 }}>
        <input type="checkbox" checked={cgu} onChange={(e) => setCgu(e.target.checked)} />
        <span>J&apos;ai lu et j&apos;accepte les <a href="/informations-legales/cgu" target="_blank" rel="noopener noreferrer">conditions d&apos;utilisation</a>.</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>J&apos;accepte de recevoir ces alertes par email. Je pourrai me désinscrire à tout moment, en un clic, depuis chaque message.</span>
      </label>

      <button type="button" disabled={!pret || enCours} onClick={() => enregistrer(true)}>
        {r.actives ? "Mettre à jour mes alertes" : "M'inscrire"}
      </button>{" "}
      {r.actives && <button type="button" className="secondaire" disabled={enCours} onClick={() => enregistrer(false)}>Désactiver</button>}
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.t}</p>}
    </div>
  );
}
