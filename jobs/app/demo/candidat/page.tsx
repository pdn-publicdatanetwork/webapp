"use client";
import { useState } from "react";

// Démonstration de l'espace candidat : suivi des candidatures, alertes e-mail
// et profil CV, avec de fausses données. Aucune action n'est réellement
// envoyée (message « Mode démo »).

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
  message?: string;
};

type Alerte = { id: string; titre: string; criteres: string; frequence: string; active: boolean };

const CANDIDATURES: Candidature[] = [
  {
    id: "d1",
    intitule: "Collaborateur parlementaire (Législation)",
    elu: "Yan Chantrel (démo)",
    chambre: "Sénat",
    groupe: "Socialistes et apparentés",
    ats: true,
    date: "01 nov. 2026",
    statut: "Entretien prévu",
    etape: 3,
    message: "Bonjour Camille, entretien fixé au Palais du Luxembourg le 10 nov. à 14h30.",
  },
  {
    id: "d2",
    intitule: "Stagiaire communication et réseaux sociaux",
    elu: "Aurore Bergé (démo)",
    chambre: "Assemblée nationale",
    groupe: "Renaissance",
    ats: true,
    date: "28 oct. 2026",
    statut: "En cours d'examen",
    etape: 2,
    message: "Dossier transmis à la collaboratrice principale.",
  },
  {
    id: "d3",
    intitule: "Assistant(e) de circonscription",
    elu: "Jean-Philippe Tanguy (démo)",
    chambre: "Assemblée nationale",
    groupe: "Rassemblement National",
    ats: false,
    date: "24 oct. 2026",
    statut: "Envoyée par e-mail",
    etape: 1,
  },
];

const ALERTES: Alerte[] = [
  { id: "a1", titre: "Toutes les offres au Sénat", criteres: "Sénat • CDI / CDD", frequence: "Hebdomadaire", active: true },
  { id: "a2", titre: "Stage communication et réseaux sociaux", criteres: "Toutes chambres • Stage • Communication", frequence: "Instantanée", active: true },
];

const COMPETENCES = ["Droit public", "Procédure parlementaire", "Rédaction d'amendements", "Communication politique", "CapCut"];

export default function Page() {
  const [onglet, setOnglet] = useState<"apercu" | "candidatures" | "alertes" | "profil">("apercu");
  const [note, setNote] = useState("");

  const demo = () => setNote("Mode démo : aucune action n'est réellement enregistrée.");

  const kpi = (label: string, valeur: string, precision: string) => (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
      <div className="text-xs font-bold text-[#6C84B0] uppercase tracking-wider">{label}</div>
      <div className="text-3xl font-bold text-[#4E2E53]">{valeur}</div>
      <p className="text-[11px] text-slate-500">{precision}</p>
    </div>
  );

  const carte = (app: Candidature) => (
    <div key={app.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
            app.ats ? "bg-purple-100 text-[#4E2E53]" : "bg-slate-100 text-slate-700"
          }`}>
            {app.ats ? "✨ Candidature gérée sur DataParl" : "📋 Candidature externe"}
          </span>
          <h3 className="font-bold text-lg text-slate-900 mt-1">{app.intitule}</h3>
          <p className="text-xs font-semibold text-slate-600">{app.elu} • {app.chambre} ({app.groupe})</p>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">{app.statut}</span>
      </div>
      {app.ats && (
        <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
          <div className={`p-2 rounded-xl border ${app.etape >= 1 ? "bg-purple-100 text-[#4E2E53] border-purple-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>1. Transmise</div>
          <div className={`p-2 rounded-xl border ${app.etape >= 2 ? "bg-purple-100 text-[#4E2E53] border-purple-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>2. En examen</div>
          <div className={`p-2 rounded-xl border ${app.etape >= 3 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>3. Entretien</div>
          <div className={`p-2 rounded-xl border ${app.etape >= 4 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-50 text-slate-400 border-slate-200"}`}>4. Décision</div>
        </div>
      )}
      {app.message && (
        <div className="bg-[#ECF1FC] p-4 rounded-2xl border border-[#6C84B0]/20 text-xs text-[#4E2E53]">
          <p className="font-bold mb-1">💬 Message du cabinet parlementaire :</p>
          <p className="text-slate-700 italic">« {app.message} »</p>
        </div>
      )}
      <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">Transmise le {app.date}</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold px-4 py-3 rounded-2xl">
        🧪 Démonstration de l&apos;espace candidat : dans la version réelle, la connexion à votre
        compte DataParl&apos; est obligatoire et vos données sont enregistrées.
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E4BDE9] text-[#4E2E53] font-bold flex items-center justify-center">CD</div>
          <div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Compte vérifié (démo)</span>
            <h1 className="text-2xl font-serif-title font-bold text-[#4E2E53]">Camille Dupont (démo)</h1>
            <p className="text-xs text-slate-500">camille.dupont@demo.dataparl.fr</p>
          </div>
        </div>
        <button onClick={demo} className="border border-slate-300 rounded-2xl text-xs font-bold text-slate-700 px-4 py-2.5 hover:bg-slate-50">
          Se déconnecter
        </button>
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

      {note && (
        <p className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-3 rounded-2xl">{note}</p>
      )}

      {onglet === "apercu" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpi("Candidatures actives", "3", "2 gérées en direct sur DataParl")}
            {kpi("Entretiens obtenus", "1", "Palais du Luxembourg (Sénat)")}
            {kpi("Alertes actives", "2", "Alertes e-mail programmées")}
            {kpi("Complétion CV IA", "94 %", "Optimisé pour le Parlement")}
          </div>
          <div className="space-y-4">
            <h2 className="font-serif-title font-bold text-xl text-[#4E2E53]">Dernières candidatures</h2>
            {CANDIDATURES.map(carte)}
          </div>
        </div>
      )}

      {onglet === "candidatures" && (
        <div className="space-y-4">
          <button onClick={demo} className="bg-[#4E2E53] hover:bg-[#3b223f] text-white px-4 py-2.5 rounded-2xl font-bold text-xs">
            + Ajouter une candidature externe
          </button>
          {CANDIDATURES.map(carte)}
        </div>
      )}

      {onglet === "alertes" && (
        <div className="space-y-4">
          <button onClick={demo} className="bg-[#4E2E53] hover:bg-[#3b223f] text-white px-4 py-2.5 rounded-2xl font-bold text-xs">
            + Créer une alerte
          </button>
          {ALERTES.map((a) => (
            <div key={a.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Active</span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{a.titre}</h3>
                <p className="text-xs font-semibold text-[#6C84B0]">{a.criteres}</p>
                <p className="text-[11px] text-slate-400">Fréquence : {a.frequence}</p>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                <button onClick={demo} className="px-4 py-2 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs font-bold">Désactiver</button>
                <button onClick={demo} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {onglet === "profil" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-serif-title font-bold text-lg text-[#4E2E53]">Document de candidature (CV)</h3>
            <div className="bg-[#ECF1FC] p-4 rounded-2xl border border-[#6C84B0]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-bold text-xs text-slate-900">CV_Camille_Dupont_DroitPublic.pdf</p>
                  <p className="text-[10px] text-slate-500">Format PDF • Déposé en 2026 (démo)</p>
                </div>
              </div>
              <button onClick={demo} className="text-xs text-[#4E2E53] font-bold underline">Voir</button>
            </div>
            <button onClick={demo} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50">
              Déposer un nouveau CV PDF
            </button>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-serif-title font-bold text-lg text-[#4E2E53]">Compétences extraites</h3>
            <div className="flex flex-wrap gap-2">
              {COMPETENCES.map((c, i) => (
                <span key={i} className="bg-[#E4BDE9]/40 text-[#4E2E53] text-xs font-bold px-3 py-1.5 rounded-full">{c}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500 border-t border-slate-100 pt-4">
              Les compétences extraites du CV alimentent le matching IA avec les offres des
              parlementaires.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
