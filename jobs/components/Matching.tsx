"use client";
import { useMemo, useState } from "react";
import ModalOffre from "@/components/ModalOffre";
import { CHAMBRE_NOM, typeContrat } from "@/lib/jobsTexte";
import type { OffreListe } from "@/lib/types";

// CV Matching : le candidat colle le texte de son CV, l'app détecte les
// compétences par listes de mots-clés et calcule un score heuristique
// de correspondance avec chaque offre. Honnête : aucune IA externe.

const COMPETENCES: { nom: string; mots: string[] }[] = [
  { nom: "Droit public / légistique", mots: ["droit public", "droit constitutionnel", "droit parlementaire", "légistique", "amendement", "proposition de loi", "juridique"] },
  { nom: "Communication politique", mots: ["communication", "presse", "communiqué", "infolettre", "newsletter", "média", "relations publiques"] },
  { nom: "Réseaux sociaux", mots: ["réseaux sociaux", "community management", "instagram", "twitter", "linkedin", "tiktok", "capcut", "canva"] },
  { nom: "Rédaction / synthèse", mots: ["rédaction", "synthèse", "note de", "veille", "rapport", "plume"] },
  { nom: "Relations institutionnelles", mots: ["affaires publiques", "institutionnel", "collectivité", "préfecture", "mairie", "élu", "parlement", "commission", "sénat", "assemblée"] },
  { nom: "Europe / international", mots: ["europe", "européen", "bruxelles", "international", "union européenne", "anglais"] },
  { nom: "Environnement", mots: ["environnement", "climat", "écologie", "transition", "énergie"] },
  { nom: "Économie / finances", mots: ["économie", "finance", "budget", "fiscal"] },
  { nom: "Territoires / circonscription", mots: ["circonscription", "permanence", "terrain", "administré", "département"] },
  { nom: "Organisation d'événements", mots: ["événement", "colloque", "conférence", "séminaire", "organisation"] },
];

function detecter(cv: string) {
  const bas = cv.toLowerCase();
  return COMPETENCES.filter((c) => c.mots.some((m) => bas.includes(m)));
}

function scorePour(offre: OffreListe, compDetectees: { nom: string; mots: string[] }[]) {
  const texte = (offre.titre + " " + offre.description).toLowerCase();
  let presence = 0;
  for (const c of compDetectees) if (c.mots.some((m) => texte.includes(m))) presence++;
  if (compDetectees.length === 0 || presence === 0) return 15;
  const base = Math.round((presence / compDetectees.length) * 80);
  return Math.min(95, Math.max(20, base));
}

const CV_EXEMPLE = [
  "Master 2 Droit public, Université Paris 1 Panthéon-Sorbonne (2025).",
  "Stage de 12 mois au cabinet d'un député : rédaction d'amendements, notes de synthèse, suivi de la commission des Lois.",
  "Chargé de communication d'un groupe d'élus locaux : réseaux sociaux, Canva, infolettre mensuelle.",
  "Veille juridique et parlementaire, organisation de colloques à l'Assemblée nationale.",
].join("\n");

export default function Matching({ offres }: { offres: OffreListe[] }) {
  const [cv, setCv] = useState("");
  const [analyse, setAnalyse] = useState<{ competences: typeof COMPETENCES; mots: number } | null>(null);
  const [ouverte, setOuverte] = useState<OffreListe | null>(null);
  const [noteFichier, setNoteFichier] = useState("");

  const scores = useMemo(() => {
    if (!analyse) return [];
    return offres
      .map((o) => ({ offre: o, score: scorePour(o, analyse.competences) }))
      .sort((a, b) => b.score - a.score);
  }, [offres, analyse]);

  const surFichier = async (f: File | null | undefined) => {
    if (!f) return;
    const nom = f.name.toLowerCase();
    if (nom.endsWith(".pdf")) {
      setNoteFichier("PDF détecté : ouvrez-le, sélectionnez tout le texte (Ctrl+A) et collez-le (Ctrl+C / Ctrl+V) dans la zone ci-dessous.");
      return;
    }
    if (!nom.endsWith(".txt") && !nom.endsWith(".md")) {
      setNoteFichier("Format non pris en charge : collez directement le texte de votre CV ci-dessous.");
      return;
    }
    setNoteFichier("");
    setCv(await f.text());
  };

  const lancer = () => {
    const texte = cv.trim();
    if (texte.length < 40) {
      setNoteFichier("Collez au moins quelques lignes de votre CV (40 caractères minimum) pour lancer l'analyse.");
      return;
    }
    setNoteFichier("");
    setAnalyse({ competences: detecter(texte), mots: texte.split(/\s+/).length });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-4">
        <span className="bg-[#E4BDE9] text-[#4E2E53] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Module Candidat
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#4E2E53]">
          CV Matching : trouvez les offres qui vous correspondent
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Collez le texte de votre CV ci-dessous : l&apos;application détecte vos compétences et les confronte
          aux offres en ligne pour estimer votre taux de correspondance. Analyse locale, aucune donnée envoyée.
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            surFichier(e.dataTransfer.files?.[0]);
          }}
          className="mt-2 border-2 border-dashed border-[#6C84B0]/40 rounded-2xl p-6 bg-slate-50 space-y-3"
        >
          <p className="text-center text-sm font-semibold text-slate-700">Glissez un fichier .txt, collez le texte de votre CV ou essayez avec un exemple</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <input type="file" accept=".txt,.md,text/plain,.pdf" onChange={(e) => surFichier(e.target.files?.[0])} className="text-xs text-slate-500" />
            <button
              type="button"
              onClick={() => { setCv(CV_EXEMPLE); setNoteFichier(""); }}
              className="text-xs font-semibold text-[#6C84B0] bg-[#ECF1FC] hover:bg-[#E4BDE9]/50 px-3.5 py-2 rounded-xl transition-colors"
            >
              ✨ Tester avec un CV exemple
            </button>
          </div>
          {noteFichier && <p className="text-xs text-amber-600 font-medium text-center">{noteFichier}</p>}
          <textarea
            rows={8}
            value={cv}
            onChange={(e) => setCv(e.target.value)}
            placeholder={"Ex :\nMaster 2 Droit Public, Université Paris 1 (2026)\nStage au cabinet d'un député : rédaction d'amendements, notes de synthèse...\nCommunication : Canva, gestion des réseaux sociaux..."}
            className="w-full p-4 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4E2E53]"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400">{cv.trim() ? cv.trim().split(/\s+/).length + " mots détectés" : "PDF : copiez-collez le texte pour l'instant"}</p>
            <button
              onClick={lancer}
              className="bg-[#4E2E53] hover:bg-[#3b223f] text-white text-xs px-5 py-2.5 rounded-xl font-bold transition-all"
            >
              🤖 Analyser mon CV
            </button>
          </div>
        </div>
      </div>

      {analyse && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-serif-title font-bold text-lg text-[#4E2E53]">Votre profil détecté</h2>
                <p className="text-xs text-slate-500">{analyse.mots} mots analysés, {analyse.competences.length} compétence(s) reconnue(s)</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">Profil analysé</span>
            </div>
            {analyse.competences.length === 0 ? (
              <p className="text-sm text-slate-600">
                Aucune compétence reconnue. Enrichissez votre CV avec des mots-clés concrets (droit public,
                communication, réseaux sociaux, amendements...).
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {analyse.competences.map((c) => (
                  <span key={c.nom} className="bg-[#ECF1FC] text-[#4E2E53] text-xs font-semibold px-2.5 py-1 rounded-lg">
                    {c.nom}
                  </span>
                ))}
              </div>
            )}
            <div className="bg-[#ECF1FC] p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#4E2E53]">Alerte e-mail auto-matching</p>
                <p className="text-[11px] text-slate-500">Recevez un e-mail dès qu&apos;une offre correspond à vos compétences.</p>
              </div>
              <a href="/#alerte" className="bg-[#4E2E53] text-white text-xs font-bold px-3.5 py-2 rounded-xl shrink-0">
                Activer l&apos;alerte
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">
              Offres classées selon votre profil
            </h2>
            {scores.map(({ offre, score }) => (
              <div key={offre.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <span className="text-xs font-bold text-[#6C84B0]">
                    {offre.chambre ? CHAMBRE_NOM[offre.chambre] + " • " : ""}{typeContrat(offre)}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm">{offre.titre}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{offre.description.split("\n")[0]}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-right">
                    <span className={`text-lg font-bold ${score >= 60 ? "text-emerald-600" : score >= 40 ? "text-amber-500" : "text-slate-400"}`}>
                      {score}%
                    </span>
                    <span className="block text-[10px] text-slate-400">correspondance</span>
                  </div>
                  <button
                    onClick={() => setOuverte(offre)}
                    className="bg-[#4E2E53] hover:bg-[#3b223f] text-white text-xs px-3.5 py-2 rounded-xl font-medium transition-all"
                  >
                    Voir l&apos;offre
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ouverte && <ModalOffre offre={ouverte} onFermer={() => setOuverte(null)} />}
    </div>
  );
}
