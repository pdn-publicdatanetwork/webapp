"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/authSupabase";

// Espace candidat : suivi des candidatures, alertes e-mail, profil & CV.
// Le compte est celui de www.dataparl.fr. Le suivi des candidatures gérées
// par DataParl' (ATS) arrive prochainement : les candidatures affichées
// sont un aperçu de démonstration, clairement signalé.

type Candidature = {
  id: string;
  intitule: string;
  elu: string;
  chambre: string;
  groupe: string;
  ats: boolean;
  date: string;
  statut: string;
  etape: number;
  maj: string;
  message?: string;
  notes?: string;
};

type Alerte = { id: string; titre: string; criteres: string; frequence: string; active: boolean };

const CANDIDATURES_DEMO: Candidature[] = [
  {
    id: "d1",
    intitule: "Collaborateur parlementaire (Législation)",
    elu: "Léa Bonnet (démo)",
    chambre: "Sénat",
    groupe: "Socialistes et apparentés",
    ats: true,
    date: "01 nov. 2026",
    statut: "Entretien prévu",
    etape: 3,
    maj: "Aujourd'hui",
    message: "Bonjour, votre profil a retenu notre attention. Entretien fixé au Palais du Luxembourg le 10 nov. à 14h30.",
  },
  {
    id: "d2",
    intitule: "Stagiaire communication et réseaux sociaux",
    elu: "Manon Fabre (démo)",
    chambre: "Assemblée nationale",
    groupe: "Renaissance",
    ats: true,
    date: "28 oct. 2026",
    statut: "En cours d'examen",
    etape: 2,
    maj: "Hier",
    message: "Dossier transmis à la collaboratrice principale.",
  },
  {
    id: "d3",
    intitule: "Assistant(e) de circonscription",
    elu: "John Doe (démo)",
    chambre: "Assemblée nationale",
    groupe: "Non inscrit",
    ats: false,
    date: "24 oct. 2026",
    statut: "Envoyée par e-mail",
    etape: 1,
    maj: "24 oct. 2026",
    notes: "Envoyée directement à la permanence avec la référence CIRCO-80.",
  },
];

const OFFRES_ENREGISTREES = [
  { id: "s1", titre: "Conseiller(e) politique & commission des affaires étrangères", elu: "Élodie Garnier (démo)", chambre: "Parlement européen", contrat: "CDI", lieu: "Bruxelles / Strasbourg", date: "29 oct. 2026" },
  { id: "s2", titre: "Collaborateur / Collaboratrice de presse & communication", elu: "Marc Vidal (démo)", chambre: "Sénat", contrat: "CDD", lieu: "Paris 6e", date: "25 oct. 2026" },
];

const ALERTES_DEMO: Alerte[] = [
  { id: "a1", titre: "Toutes les offres au Sénat", criteres: "Sénat • CDI / CDD", frequence: "Hebdomadaire", active: true },
  { id: "a2", titre: "Stage communication et réseaux sociaux", criteres: "Toutes chambres • Stage • Communication", frequence: "Instantanée", active: true },
];

const COMPETENCES = ["Droit public", "Procédure parlementaire", "Rédaction d'amendements", "Communication politique", "Canva", "CapCut"];

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [charge, setCharge] = useState(true);
  const [onglet, setOnglet] = useState<"apercu" | "candidatures" | "alertes" | "profil">("apercu");
  const [applications, setApplications] = useState<Candidature[]>(CANDIDATURES_DEMO);
  const [alertes, setAlertes] = useState<Alerte[]>(ALERTES_DEMO);
  const [note, setNote] = useState("");
  const [modalAlerte, setModalAlerte] = useState(false);
  const [formAlerte, setFormAlerte] = useState({ titre: "", chambre: "Toutes les chambres", contrat: "CDI", mots: "", frequence: "Hebdomadaire" });
  const [modalSuppression, setModalSuppression] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => {
    auth.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/connexion?suite=/mon-compte");
        return;
      }
      setEmail(data.session.user.email ?? null);
      setCharge(false);
    });
  }, [router]);

  const deconnexion = async () => {
    await auth.auth.signOut();
    router.replace("/");
  };

  // Suppression directe du compte (RGPD) : l'API vérifie la session serveur,
  // efface les données du service (alertes, CV Matching) puis le compte auth
  // Supabase. Le compte étant unique, il vaut aussi pour www.dataparl.fr.
  const supprimerCompte = async () => {
    setSuppressionEnCours(true);
    try {
      const { data } = await auth.auth.getSession();
      const jeton = data.session?.access_token ?? "";
      const res = await fetch("/api/compte/supprimer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jeton }),
      });
      if (res.ok) {
        await auth.auth.signOut();
        router.replace("/");
        return;
      }
      const j = await res.json().catch(() => ({}));
      setNote(
        typeof j?.erreur === "string"
          ? j.erreur
          : "Suppression impossible pour le moment : passez par le formulaire de contact (sujet RGPD)."
      );
    } catch {
      setNote("Suppression impossible pour le moment : passez par le formulaire de contact (sujet RGPD).");
    }
    setModalSuppression(false);
    setSuppressionEnCours(false);
  };

  const demo = () => setNote("Aperçu de démonstration : le suivi réel des candidatures arrive prochainement.");

  const creerAlerte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAlerte.titre || !email) return;
    // Inscription réelle : la collecte enverra les nouvelles offres validées.
    await fetch("/api/jobs/alerte", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setAlertes([
      {
        id: "a" + Date.now(),
        titre: formAlerte.titre,
        criteres: [formAlerte.chambre, formAlerte.contrat, formAlerte.mots].filter(Boolean).join(" • "),
        frequence: formAlerte.frequence,
        active: true,
      },
      ...alertes,
    ]);
    setModalAlerte(false);
    setFormAlerte({ titre: "", chambre: "Toutes les chambres", contrat: "CDI", mots: "", frequence: "Hebdomadaire" });
    setNote("Alerte enregistrée : vous recevrez les nouvelles offres à cette adresse.");
  };

  const carteCandidature = (app: Candidature) => (
    <div key={app.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              app.ats ? "bg-purple-100 text-[#4E2E53] border border-purple-200" : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}>
              {app.ats ? "✨ Candidature gérée sur DataParl" : "📋 Candidature externe"}
            </span>
            <span className="text-xs text-slate-400">Transmise le {app.date}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">{app.intitule}</h3>
          <p className="text-xs font-semibold text-slate-600">{app.elu} • {app.chambre} ({app.groupe})</p>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">{app.statut}</span>
      </div>
      {app.ats && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500">Statut en direct auprès de l&apos;équipe parlementaire :</div>
          <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
            <div className={`p-2 rounded-xl border ${app.etape >= 1 ? "bg-purple-100 text-[#4E2E53] border-purple-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>1. Transmise</div>
            <div className={`p-2 rounded-xl border ${app.etape >= 2 ? "bg-purple-100 text-[#4E2E53] border-purple-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>2. En examen</div>
            <div className={`p-2 rounded-xl border ${app.etape >= 3 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>3. Entretien</div>
            <div className={`p-2 rounded-xl border ${app.etape >= 4 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>4. Décision</div>
          </div>
        </div>
      )}
      {app.message && (
        <div className="bg-[#ECF1FC] p-4 rounded-2xl border border-[#6C84B0]/20 text-xs text-[#4E2E53]">
          <p className="font-bold mb-1">💬 Message de l&apos;équipe parlementaire :</p>
          <p className="text-slate-700 italic">« {app.message} »</p>
        </div>
      )}
      {app.notes && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
          <p className="font-bold text-slate-800">📝 Vos notes personnelles :</p>
          <p>{app.notes}</p>
        </div>
      )}
      <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">Mise à jour : {app.maj}</p>
    </div>
  );

  if (charge) return <div className="max-w-md mx-auto py-16 text-center text-sm text-slate-500">Chargement…</div>;

  const initiales = (email ?? "?").split(/[@.]/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
  const kpi = (label: string, valeur: string | number, precision: string, couleur = "text-[#4E2E53]") => (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
      <div className="text-xs font-bold text-[#6C84B0] uppercase tracking-wider">{label}</div>
      <div className={"text-3xl font-bold " + couleur}>{valeur}</div>
      <p className="text-[11px] text-slate-500">{precision}</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E4BDE9] text-[#4E2E53] font-bold text-lg flex items-center justify-center">{initiales}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">✓ Connecté</span>
              <span className="bg-[#E4BDE9]/50 text-[#4E2E53] text-[10px] font-bold px-2.5 py-0.5 rounded-full">Compte DataParl&apos;</span>
            </div>
            <h1 className="text-2xl font-serif-title font-bold text-[#4E2E53]">Mon compte</h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium break-all">Identifiant : <strong>{email}</strong></p>
          </div>
        </div>
        <div className="bg-[#ECF1FC] border border-[#6C84B0]/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            <p className="font-bold text-[#4E2E53]">Espace central DataParl&apos;</p>
            <p className="text-[11px] text-slate-500">Un seul compte pour l&apos;écosystème parlementaire.</p>
          </div>
          <a
            href="https://www.dataparl.fr/mon-compte"
            target="_blank"
            rel="noreferrer"
            className="bg-[#4E2E53] hover:bg-[#3b223f] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap"
          >
            dataparl.fr/mon-compte ↗
          </a>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto text-xs sm:text-sm font-bold">
        {([
          ["apercu", "📊 Vue d'ensemble"],
          ["candidatures", "📑 Suivi des candidatures"],
          ["alertes", "🔔 Mes alertes"],
          ["profil", "👤 Mon profil & CV"],
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

      {note && <p className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-3 rounded-2xl">{note}</p>}

      {onglet === "apercu" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpi("Candidatures actives", applications.length, "2 gérées en direct sur DataParl'")}
            {kpi("Entretiens obtenus", "1", "Palais du Luxembourg (Sénat)", "text-emerald-700")}
            {kpi("Alertes actives", alertes.filter((a) => a.active).length, "Alertes e-mail programmées")}
            {kpi("Complétion CV IA", "94 %", "Optimisé pour le Parlement", "text-purple-700")}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif-title font-bold text-xl text-[#4E2E53]">Dernières candidatures</h3>
                <button onClick={() => setOnglet("candidatures")} className="text-xs font-bold text-[#6C84B0] hover:text-[#4E2E53] underline">
                  Voir toutes les candidatures →
                </button>
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Aperçu de démonstration : le suivi réel des candidatures transmises via DataParl&apos; Jobs arrive prochainement.
              </p>
              {applications.map(carteCandidature)}
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-serif-title font-bold text-lg text-[#4E2E53]">Offres enregistrées</h3>
                  <span className="text-xs font-bold bg-[#E4BDE9]/60 text-[#4E2E53] px-2 py-0.5 rounded-full">{OFFRES_ENREGISTREES.length}</span>
                </div>
                <div className="space-y-3">
                  {OFFRES_ENREGISTREES.map((job) => (
                    <div key={job.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                      <h4 className="font-bold text-xs text-slate-900">{job.titre}</h4>
                      <p className="text-[11px] text-slate-600">{job.elu} • {job.chambre}</p>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                        <span>{job.contrat} • {job.lieu}</span>
                        <Link href="/" className="text-[#4E2E53] font-bold hover:underline">Postuler →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center space-y-3">
                <p className="text-xs text-slate-500">
                  Un seul compte pour DataParl&apos; et DataParl&apos; Jobs. Vos alertes e-mail restent indépendantes de la connexion.
                </p>
                <button onClick={deconnexion} className="w-full py-2.5 border border-slate-300 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50">
                  Se déconnecter de DataParl&apos;
                </button>
                <button
                  onClick={() => setModalSuppression(true)}
                  data-stat="clic_supprimer_compte"
                  className="w-full py-2.5 border border-red-200 text-red-700 rounded-2xl text-xs font-bold hover:bg-red-50"
                >
                  Supprimer mon compte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {onglet === "candidatures" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="bg-[#E4BDE9]/60 text-[#4E2E53] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">Tableau de suivi personnel</span>
              <h2 className="text-2xl font-serif-title font-bold text-[#4E2E53] mt-1">Suivi de vos candidatures</h2>
              <p className="text-xs text-slate-600">Aperçu de démonstration en attendant l&apos;ATS intégré.</p>
            </div>
            <button onClick={demo} className="bg-[#4E2E53] hover:bg-[#3b223f] text-white px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap">
              + Ajouter une candidature externe
            </button>
          </div>
          {applications.map(carteCandidature)}
        </div>
      )}

      {onglet === "alertes" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="bg-[#E4BDE9]/60 text-[#4E2E53] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">Préférences de notification</span>
              <h2 className="text-2xl font-serif-title font-bold text-[#4E2E53] mt-1">Alertes e-mail personnalisées</h2>
              <p className="text-xs text-slate-600">Recevez les nouvelles offres dès leur publication sur les portails officiels.</p>
            </div>
            <button onClick={() => setModalAlerte(true)} className="bg-[#4E2E53] hover:bg-[#3b223f] text-white px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap">
              + Créer une nouvelle alerte
            </button>
          </div>
          {alertes.map((alt) => (
            <div key={alt.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${alt.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                    {alt.active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs text-slate-400">Fréquence : {alt.frequence}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-900">{alt.titre}</h3>
                <p className="text-xs font-semibold text-[#6C84B0]">{alt.criteres}</p>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  onClick={() => setAlertes(alertes.map((a) => (a.id === alt.id ? { ...a, active: !a.active } : a)))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${alt.active ? "bg-amber-100 text-amber-900 hover:bg-amber-200" : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"}`}
                >
                  {alt.active ? "Désactiver" : "Activer"}
                </button>
                <button
                  onClick={() => setAlertes(alertes.filter((a) => a.id !== alt.id))}
                  className="text-red-600 hover:text-red-800 font-bold text-xs p-2 hover:bg-red-50 rounded-xl"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {onglet === "profil" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-2">
            <span className="bg-[#E4BDE9]/60 text-[#4E2E53] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">Profil candidat DataParl&apos;</span>
            <h2 className="text-2xl font-serif-title font-bold text-[#4E2E53]">Mon profil & CV de collaborateur</h2>
            <p className="text-xs text-slate-600">Vos informations permettent d&apos;accélérer vos candidatures directes auprès des équipes parlementaires.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-serif-title font-bold text-lg text-[#4E2E53]">Document de candidature (CV)</h3>
              <div className="bg-[#ECF1FC] p-4 rounded-2xl border border-[#6C84B0]/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-bold text-xs text-slate-900">Aucun CV de référence enregistré</p>
                    <p className="text-[10px] text-slate-500">Le CV est analysé lors du matching, jamais conservé.</p>
                  </div>
                </div>
              </div>
              <Link
                href="/matching"
                className="block border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2 bg-slate-50 hover:bg-slate-100/50 transition-colors"
              >
                <p className="text-xs font-bold text-slate-700">Analyser mon CV avec le matching IA</p>
                <p className="text-[11px] text-slate-400">CV Matching IA : extraction des compétences et correspondance avec les offres.</p>
              </Link>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-serif-title font-bold text-lg text-[#4E2E53]">Compétences</h3>
              <div className="flex flex-wrap gap-2">
                {COMPETENCES.map((c) => (
                  <span key={c} className="bg-[#E4BDE9]/40 text-[#4E2E53] text-xs font-bold px-3 py-1.5 rounded-full">{c}</span>
                ))}
              </div>
              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">💡 Conseil DataParl&apos; Jobs :</p>
                <p>Les compétences extraites de votre CV alimentent le matching IA avec les offres des sénateurs et députés.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalAlerte && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-slate-200 text-xs space-y-4">
            <button onClick={() => setModalAlerte(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            <div className="space-y-1">
              <span className="bg-[#E4BDE9]/60 text-[#4E2E53] font-bold px-2.5 py-0.5 rounded-full text-[10px]">Alerte personnalisée</span>
              <h3 className="text-xl font-serif-title font-bold text-[#4E2E53]">Créer une alerte e-mail</h3>
            </div>
            <form onSubmit={creerAlerte} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom de l&apos;alerte *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Stage communication au Sénat"
                  value={formAlerte.titre}
                  onChange={(e) => setFormAlerte({ ...formAlerte, titre: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#4E2E53]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chambre</label>
                  <select value={formAlerte.chambre} onChange={(e) => setFormAlerte({ ...formAlerte, chambre: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none">
                    <option>Toutes les chambres</option>
                    <option>Sénat</option>
                    <option>Assemblée nationale</option>
                    <option>Parlement européen</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Type de contrat</label>
                  <select value={formAlerte.contrat} onChange={(e) => setFormAlerte({ ...formAlerte, contrat: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none">
                    <option>CDI</option>
                    <option>CDD</option>
                    <option>Stage</option>
                    <option>Alternance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mots-clés optionnels</label>
                <input
                  type="text"
                  placeholder="Ex : Droit, Communication, Paris…"
                  value={formAlerte.mots}
                  onChange={(e) => setFormAlerte({ ...formAlerte, mots: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fréquence de notification</label>
                <select value={formAlerte.frequence} onChange={(e) => setFormAlerte({ ...formAlerte, frequence: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none">
                  <option>Instantanée</option>
                  <option>Quotidienne</option>
                  <option>Hebdomadaire</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-[#4E2E53] hover:bg-[#3b223f] text-white font-bold rounded-xl shadow-md">
                Activer cette alerte e-mail
              </button>
            </form>
          </div>
        </div>
      )}

      {modalSuppression && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-slate-200 space-y-4">
            <button onClick={() => setModalSuppression(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            <div className="space-y-1">
              <span className="bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Action irréversible</span>
              <h3 className="text-xl font-serif-title font-bold text-[#4E2E53]">Supprimer mon compte</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Votre compte est unique : le supprimer efface aussi votre accès à www.dataparl.fr, vos alertes
              e-mail et les données issues du CV Matching. Cette action est définitive ; vous pourrez
              toutefois recréer un compte avec la même adresse.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setModalSuppression(false)}
                className="py-2.5 border border-slate-300 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={supprimerCompte}
                disabled={suppressionEnCours}
                data-stat="clic_confirmer_suppression"
                className="py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-2xl text-xs font-bold"
              >
                {suppressionEnCours ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
