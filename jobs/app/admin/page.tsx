

"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/authSupabase";
import { CHAMBRE_NOM } from "@/lib/jobsTexte";

// Back-office DataParl' Jobs : réservé au compte admin de DataParl'
// (théo@dataparl.fr, table staff). Variable optionnelle côté serveur :
// ADMIN_JOBS_EMAILS. Back-office DataParl' Jobs : relecture des offres (file de revue,
// publiées, archives). Réservé à l'équipe (compte @dataparl.fr).
// Notifications Slack si SLACK_WEBHOOK_URL est configuré côté Vercel.

type OffreAdmin = {
  fingerprint: string;
  titre: string;
  elu: string;
  chambre: string;
  type_poste: string;
  localisation: string;
  salaire: string;
  source_connector: string;
  created_at: string;
  publie_le: string;
  statut: string;
  review_status: string;
};

type Donnees = { revue: OffreAdmin[]; actives: OffreAdmin[]; archives: OffreAdmin[] };

type Stats = {
  pages_30j: number;
  clics_30j: number;
  top_pages: [string, number][];
  top_clics: [string, number][];
  par_jour: [string, number][];
  offres: { slug: string; titre: string; elu: string; vues: number; clics: number; taux: number }[];
  comptes: { email: string; visites: number; dernier: string }[];
};

const LIBELLE_CLIC: Record<string, string> = {
  clic_carte_offre: "Clic sur une carte d'offre",
  clic_contacter: "Clic « Contacter l'équipe »",
  clic_envoi_candidature: "Clic « Envoyer ma candidature »",
  clic_copie_email: "Clic « Copier l'adresse e-mail »",
  clic_connexion: "Clic « Se connecter »",
  clic_mon_compte: "Clic « Mon compte »",
};

function Mur({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-[#E4BDE9] flex items-center justify-center text-xl mx-auto">🛠️</div>
      <h1 className="text-xl font-serif-title font-bold text-[#4E2E53]">{titre}</h1>
      <p className="text-sm text-slate-600 leading-relaxed">{texte}</p>
      <Link href="/connexion?suite=/admin" className="inline-block bg-[#4E2E53] hover:bg-[#3b223f] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all">
        Se connecter
      </Link>
    </div>
  );
}

export default function Page() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [onglet, setOnglet] = useState<"revue" | "actives" | "archives" | "stats">("revue");
  const [stats, setStats] = useState<Stats | null>(null);
  const [recherche, setRecherche] = useState("");
  const [enCours, setEnCours] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    auth.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    const { data: sub } = auth.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const charger = useCallback(async () => {
    if (!email) return;
    setErreur("");
    const res = await fetch("/api/admin/offres?compte=" + encodeURIComponent(email)).catch(() => null);
    if (!res || !res.ok) {
      setErreur("Lecture impossible pour le moment.");
      return;
    }
    setDonnees(await res.json());
  }, [email]);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    if (onglet !== "stats" || stats || !email) return;
    fetch("/api/admin/stats?compte=" + encodeURIComponent(email))
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setStats(s))
      .catch(() => setStats(null));
  }, [onglet, stats, email]);

  const decider = async (empreinte: string, action: "valider" | "archiver" | "rejeter") => {
    if (!email) return;
    setEnCours(empreinte + action);
    const res = await fetch("/api/admin/offres", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ compte: email, empreinte, action }),
    }).catch(() => null);
    setEnCours("");
    if (res && res.ok) charger();
    else setErreur("Action impossible pour le moment.");
  };

  if (email === undefined) return <div className="max-w-xl mx-auto py-20 text-center text-sm text-slate-400">Chargement…</div>;
  if (!email) return <Mur titre="Back-office réservé à l&apos;équipe" texte="Connectez-vous avec votre compte DataParl&apos; pour relire les offres." />;
  if (email.toLowerCase() !== "theo@dataparl.fr") {
    return <Mur titre="Accès réservé au compte admin" texte="Le back-office est accessible uniquement avec le compte admin DataParl&apos;." />;
  }

  const liste = donnees ? (onglet === "revue" ? donnees.revue : onglet === "actives" ? donnees.actives : donnees.archives) : [];
  const q = recherche.trim().toLowerCase();
  const filtrees = q
    ? liste.filter((o) => (o.titre + " " + o.elu + " " + o.localisation).toLowerCase().includes(q))
    : liste;

  const carte = (o: OffreAdmin) => (
    <div key={o.fingerprint} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={o.source_connector === "proposition" ? "bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full" : "bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full"}>
              {o.source_connector === "proposition" ? "✨ Déposée par l'élu" : "Collectée"}
            </span>
            <span className="bg-[#E4BDE9]/40 text-[#4E2E53] text-[10px] font-bold px-2.5 py-0.5 rounded-full">{o.type_poste || "Autre"}</span>
            <span className="text-[11px] text-slate-400">{CHAMBRE_NOM[o.chambre] ?? o.chambre}</span>
          </div>
          <h3 className="font-bold text-base text-slate-900">{o.titre}</h3>
          <p className="text-xs text-slate-600">{o.elu} {o.localisation ? "• " + o.localisation : ""} {o.salaire ? "• " + o.salaire : ""}</p>
          <p className="text-[10px] text-slate-400">
            {onglet === "revue" ? "Déposée/collectée le " : "Publiée le "}
            {(onglet === "revue" ? o.created_at : o.publie_le).slice(0, 10)}
            {o.statut ? " • " + o.statut : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-end">
          {onglet !== "archives" && (
            <button
              onClick={() => decider(o.fingerprint, "valider")}
              disabled={Boolean(enCours)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50"
            >
              {enCours === o.fingerprint + "valider" ? "…" : "Valider"}
            </button>
          )}
          <button
            onClick={() => decider(o.fingerprint, "archiver")}
            disabled={Boolean(enCours)}
            className="bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50"
          >
            Archiver
          </button>
          {onglet === "revue" && (
            <button
              onClick={() => decider(o.fingerprint, "rejeter")}
              disabled={Boolean(enCours)}
              className="bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50"
            >
              Rejeter
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-2">
        <span className="bg-[#E4BDE9] text-[#4E2E53] text-xs font-bold px-2.5 py-1 rounded-full">Back-office</span>
        <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#4E2E53]">Relecture des offres</h1>
        <p className="text-sm text-slate-600">
          File de revue, offres publiées et archives. Les décisions sont notées dans Firestore et notifiées
          sur Slack si le webhook est configuré.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-bold text-[#6C84B0] uppercase tracking-wider">En attente de relecture</div>
          <div className="text-3xl font-bold text-[#4E2E53]">{donnees ? donnees.revue.length : "…"}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-bold text-[#6C84B0] uppercase tracking-wider">Offres publiées</div>
          <div className="text-3xl font-bold text-emerald-700">{donnees ? donnees.actives.length : "…"}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-bold text-[#6C84B0] uppercase tracking-wider">Archives</div>
          <div className="text-3xl font-bold text-slate-500">{donnees ? donnees.archives.length : "…"}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto text-xs sm:text-sm font-bold">
          {([
            ["revue", "⏳ File de revue"],
            ["actives", "✅ Publiées"],
            ["archives", "🗄️ Archives"],
            ["stats", "📊 Statistiques"],
          ] as const).map(([cle, libelle]) => (
            <button
              key={cle}
              onClick={() => setOnglet(cle)}
              className={`px-4 py-2.5 rounded-xl whitespace-nowrap ${onglet === cle ? "bg-[#4E2E53] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {libelle}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Rechercher un titre, un élu, un lieu…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full sm:w-72 p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E2E53]"
        />
      </div>

      {erreur && <p className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-2xl">{erreur}</p>}

      {onglet === "stats" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="text-xs font-bold text-[#6C84B0] uppercase tracking-wider">Pages vues (30 j)</div>
              <div className="text-3xl font-bold text-[#4E2E53]">{stats ? stats.pages_30j : "…"}</div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="text-xs font-bold text-[#6C84B0] uppercase tracking-wider">Clics suivis (30 j)</div>
              <div className="text-3xl font-bold text-emerald-700">{stats ? stats.clics_30j : "…"}</div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="text-xs font-bold text-[#6C84B0] uppercase tracking-wider">Visites /connexion (30 j)</div>
              <div className="text-3xl font-bold text-[#4E2E53]">
                {stats ? (stats.top_pages.find(([p2]) => p2 === "/connexion")?.[1] ?? "0") : "…"}
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="text-xs font-bold text-[#6C84B0] uppercase tracking-wider">Vues de fiches offre</div>
              <div className="text-3xl font-bold text-purple-700">
                {stats ? stats.top_pages.filter(([p2]) => p2.startsWith("/offre/")).reduce((n, [, v]) => n + v, 0) : "…"}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-serif-title font-bold text-lg text-[#4E2E53]">📈 Tendances par offre (30 j)</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-2">Offre</th>
                  <th className="pb-2 text-right">Vues</th>
                  <th className="pb-2 text-right">Clics « postuler »</th>
                  <th className="pb-2 text-right">Taux</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.offres ?? []).map((o) => (
                  <tr key={o.slug} className="border-t border-slate-100">
                    <td className="py-2 pr-3">
                      <Link href={"/offre/" + o.slug} className="font-bold text-slate-800 hover:text-[#4E2E53] underline">
                        {o.titre}
                      </Link>
                      {o.elu ? <span className="block text-[10px] text-slate-400">{o.elu}</span> : null}
                    </td>
                    <td className="py-2 text-right font-bold text-[#4E2E53]">{o.vues}</td>
                    <td className="py-2 text-right font-bold text-emerald-700">{o.clics}</td>
                    <td className="py-2 text-right text-slate-500">{o.taux}%</td>
                  </tr>
                ))}
                {stats && (stats.offres ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-400">Pas encore de données par offre.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-serif-title font-bold text-lg text-[#4E2E53]">👥 Comptes ayant visité (30 j)</h3>
            <ul className="text-xs text-slate-700 space-y-1.5">
              {(stats?.comptes ?? []).map((c) => (
                <li key={c.email} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5">
                  <span className="font-mono truncate">{c.email}</span>
                  <span className="shrink-0 text-slate-500">
                    <strong className="text-[#4E2E53]">{c.visites}</strong> vue{c.visites > 1 ? "s" : ""}, dernière le {c.dernier}
                  </span>
                </li>
              ))}
              {stats && (stats.comptes ?? []).length === 0 && (
                <li className="text-slate-400">Aucun compte connecté identifié sur la période.</li>
              )}
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-serif-title font-bold text-lg text-[#4E2E53]">Top pages (30 j)</h3>
              <ul className="text-xs text-slate-700 space-y-1.5">
                {(stats?.top_pages ?? []).map(([p2, n]) => (
                  <li key={p2} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-mono truncate">{p2}</span>
                    <span className="font-bold text-[#4E2E53] shrink-0 ml-3">{n}</span>
                  </li>
                ))}
                {stats && stats.top_pages.length === 0 && <li className="text-slate-400">Pas encore de données.</li>}
              </ul>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-serif-title font-bold text-lg text-[#4E2E53]">Clics suivis (30 j)</h3>
              <ul className="text-xs text-slate-700 space-y-1.5">
                {(stats?.top_clics ?? []).map(([c, n]) => (
                  <li key={c} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span>{LIBELLE_CLIC[c] ?? c}</span>
                    <span className="font-bold text-[#4E2E53] shrink-0 ml-3">{n}</span>
                  </li>
                ))}
                {stats && stats.top_clics.length === 0 && <li className="text-slate-400">Pas encore de clics suivis.</li>}
              </ul>
              <h3 className="font-serif-title font-bold text-lg text-[#4E2E53] pt-2">Pages vues par jour (14 j)</h3>
              <ul className="text-[11px] text-slate-500 space-y-1">
                {(stats?.par_jour ?? []).map(([j, n]) => (
                  <li key={j} className="flex items-center justify-between">
                    <span>{j}</span>
                    <span className="font-bold text-slate-700">{n}</span>
                  </li>
                ))}
                {stats && stats.par_jour.length === 0 && <li className="text-slate-400">Pas encore de données.</li>}
              </ul>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Mesure minimale : pages vues et clics, sans IP ni identifiant (conforme à la page Informations
            légales). Les données commencent à s'accumuler depuis la mise en ligne du suivi.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {filtrees.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm space-y-2">
            <p className="text-2xl">📭</p>
            <h3 className="text-lg font-bold text-[#4E2E53]">{donnees ? "Aucune offre dans cette vue" : "Chargement…"}</h3>
            {donnees && <p className="text-xs text-slate-500">Les nouvelles offres collectées ou déposées arrivent automatiquement ici.</p>}
          </div>
        ) : (
          filtrees.map(carte)
        )}
      </div>
    </div>
  );
}
