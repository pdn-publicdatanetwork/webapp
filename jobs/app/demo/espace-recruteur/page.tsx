"use client";
import { useState } from "react";
import EspacePro from "@/components/EspacePro";

// Démonstration de l'espace recruteur complet : vue d'ensemble (stats),
// gestion des offres, pipeline de recrutement (Kanban 6 étapes), dépôt
// d'offre et équipe & délégations (OTP e-mail). Toutes les données sont
// fictives et aucune action n'est réellement envoyée.

type Etape = 0 | 1 | 2 | 3 | 4 | 5;

const ETAPES: { cle: Etape; titre: string }[] = [
  { cle: 0, titre: "Candidature reçue" },
  { cle: 1, titre: "Présélection" },
  { cle: 2, titre: "Entretien" },
  { cle: 3, titre: "Test / Exercice" },
  { cle: 4, titre: "Offre envoyée" },
  { cle: 5, titre: "Recruté" },
];

const MES_OFFRES = [
  { id: "o1", titre: "Collaborateur parlementaire (Législation)", statut: "Publiée", candidatures: 8, date: "01 nov. 2026" },
  { id: "o2", titre: "Stagiaire communication et réseaux sociaux", statut: "Publiée", candidatures: 12, date: "28 oct. 2026" },
  { id: "o3", titre: "Assistant(e) de circonscription", statut: "En relecture", candidatures: 0, date: "03 nov. 2026" },
];

const CANDIDATS_DEMO: { id: string; nom: string; offre: string; etape: Etape; score: string }[] = [
  { id: "c1", nom: "Sarah Nguyen", offre: "Collaborateur (Législation)", etape: 0, score: "92 %" },
  { id: "c2", nom: "Marc Petit", offre: "Stagiaire communication", etape: 1, score: "88 %" },
  { id: "c3", nom: "Inès Lambert", offre: "Collaborateur (Législation)", etape: 2, score: "95 %" },
  { id: "c4", nom: "Paul Mercier", offre: "Stagiaire communication", etape: 3, score: "81 %" },
  { id: "c5", nom: "Ava Diop", offre: "Collaborateur (Législation)", etape: 4, score: "97 %" },
  { id: "c6", nom: "Louis Faure", offre: "Stagiaire communication", etape: 5, score: "90 %" },
];

const EQUIPE = [
  { id: "e1", nom: "Camille Martin (démo)", role: "Députée", niveau: "Admin", date: "12 oct. 2026" },
  { id: "e2", nom: "Sarah Nguyen (démo)", role: "Collaboratrice parlementaire", niveau: "Rédaction des offres", date: "15 oct. 2026" },
  { id: "e3", nom: "Marc Petit (démo)", role: "Collaborateur parlementaire", niveau: "Lecture des candidatures", date: "22 oct. 2026" },
];

export default function Page() {
  const [onglet, setOnglet] = useState<"apercu" | "offres" | "pipeline" | "deposer" | "equipe">("apercu");
  const [candidats, setCandidats] = useState(CANDIDATS_DEMO);
  const [membres, setMembres] = useState(EQUIPE);
  const [note, setNote] = useState("");
  const [modalMembre, setModalMembre] = useState(false);
  const [formMembre, setFormMembre] = useState({ nom: "", email: "", role: "Collaborateur parlementaire" });

  const demo = (message = "Mode démo : aucune donnée n'est réellement enregistrée.") => setNote(message);

  const avancer = (id: string) => {
    const c = candidats.find((x) => x.id === id);
    if (!c || c.etape >= 5) return;
    setCandidats(candidats.map((x) => (x.id === id ? { ...x, etape: (x.etape + 1) as Etape } : x)));
    setNote("Mode démo : candidat avancé à l'étape « " + ETAPES[c.etape + 1].titre + " ». Aucun e-mail n'est envoyé.");
  };

  const ajouterMembre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMembre.nom || !formMembre.email) return;
    setMembres([...membres, { id: "e" + Date.now(), nom: formMembre.nom, role: formMembre.role, niveau: "Invitation en attente", date: "Aujourd'hui" }]);
    setModalMembre(false);
    setFormMembre({ nom: "", email: "", role: "Collaborateur parlementaire" });
    demo("Mode démo : un code OTP aurait été envoyé par e-mail pour valider la délégation. Rien n'est envoyé.");
  };

  const kpi = (label: string, valeur: string, precision: string, couleur = "text-[#4E2E53]") => (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
      <div className="text-xs font-bold text-[#6C84B0] uppercase tracking-wider">{label}</div>
      <div className={"text-3xl font-bold " + couleur}>{valeur}</div>
      <p className="text-[11px] text-slate-500">{precision}</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold px-4 py-3 rounded-2xl">
        🧪 Démonstration de l&apos;espace recruteur complet : fausses données, aucune connexion requise,
        aucune action envoyée. Dans la version réelle, la connexion avec une adresse parlementaire est
        obligatoire et l&apos;ATS gère les candidatures reçues via DataParl&apos; Jobs.
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E4BDE9] flex items-center justify-center text-xl">🏛️</div>
          <div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Cabinet de Camille Martin (démo)</span>
            <h1 className="text-2xl font-serif-title font-bold text-[#4E2E53]">Espace Recruteur</h1>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto text-xs sm:text-sm font-bold">
        {([
          ["apercu", "📊 Vue d'ensemble"],
          ["offres", "📄 Mes offres"],
          ["pipeline", "🎯 Pipeline de recrutement"],
          ["deposer", "✍️ Déposer une offre"],
          ["equipe", "👥 Équipe & délégations"],
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
            {kpi("Offres publiées", "2", "1 en relecture")}
            {kpi("Candidatures reçues", "20", "12 ce mois-ci")}
            {kpi("En entretien", "2", "Palais du Luxembourg")}
            {kpi("Délai de réponse moyen", "36 h", "Objectif : sous 48 h", "text-emerald-700")}
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="font-serif-title font-bold text-lg text-[#4E2E53]">Prochaines étapes (démo)</h3>
            <ul className="text-sm text-slate-700 space-y-2">
              <li>• Entretien d&apos;Inès Lambert à préparer (lundi 10 nov.)</li>
              <li>• Offre à envoyer à Ava Diop</li>
              <li>• 4 candidatures à préselectionner sur « Stagiaire communication »</li>
            </ul>
          </div>
        </div>
      )}

      {onglet === "offres" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-title font-bold text-xl text-[#4E2E53]">Mes offres ({MES_OFFRES.length})</h2>
            <button onClick={() => setOnglet("deposer")} className="bg-[#4E2E53] hover:bg-[#3b223f] text-white px-4 py-2.5 rounded-2xl font-bold text-xs">
              + Déposer une offre
            </button>
          </div>
          {MES_OFFRES.map((o) => (
            <div key={o.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className={o.statut === "Publiée" ? "bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full" : "bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full"}>
                  {o.statut}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">{o.titre}</h3>
                <p className="text-xs text-slate-500">{o.candidatures} candidature(s) • déposée le {o.date}</p>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                <button onClick={() => demo("Mode démo : la modification d'offre n'est pas active.")} className="border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold px-4 py-2 rounded-xl">Modifier</button>
                <button onClick={() => demo("Mode démo : l'offre ne serait pas réellement archivée.")} className="bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs font-bold px-4 py-2 rounded-xl">Archiver</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {onglet === "pipeline" && (
        <div className="space-y-4">
          <h2 className="font-serif-title font-bold text-xl text-[#4E2E53]">Pipeline de recrutement</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ETAPES.map((etape) => (
              <div key={etape.cle} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3 space-y-3 min-h-40">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-[#4E2E53]">{etape.cle + 1}. {etape.titre}</h3>
                  <span className="text-[10px] font-bold bg-[#E4BDE9]/60 text-[#4E2E53] px-2 py-0.5 rounded-full">
                    {candidats.filter((c) => c.etape === etape.cle).length}
                  </span>
                </div>
                <div className="space-y-2">
                  {candidats.filter((c) => c.etape === etape.cle).map((c) => (
                    <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                      <p className="text-[11px] font-bold text-slate-900">{c.nom}</p>
                      <p className="text-[10px] text-slate-500">{c.offre}</p>
                      <p className="text-[10px] font-bold text-[#4E2E53]">Matching IA : {c.score}</p>
                      {etape.cle < 5 && (
                        <button onClick={() => avancer(c.id)} className="w-full text-[10px] font-bold text-[#6C84B0] hover:text-[#4E2E53]">
                          Avancer →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Le glisser-déposer et les e-mails automatiques aux candidats arriveront avec l&apos;ATS réel.
          </p>
        </div>
      )}

      {onglet === "deposer" && <EspacePro demo />}

      {onglet === "equipe" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-title font-bold text-xl text-[#4E2E53]">Équipe & délégations</h2>
            <button onClick={() => setModalMembre(true)} className="bg-[#4E2E53] hover:bg-[#3b223f] text-white px-4 py-2.5 rounded-2xl font-bold text-xs">
              + Déléguer un accès
            </button>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase text-slate-400 border-b border-slate-100">
                  <th className="p-4">Membre</th>
                  <th className="p-4">Rôle</th>
                  <th className="p-4">Niveau d&apos;accès</th>
                  <th className="p-4">Depuis</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {membres.map((m) => (
                  <tr key={m.id}>
                    <td className="p-4 font-bold text-slate-900 text-xs">{m.nom}</td>
                    <td className="p-4 text-slate-600 text-xs">{m.role}</td>
                    <td className="p-4 text-slate-600 text-xs">{m.niveau}</td>
                    <td className="p-4 text-slate-400 text-xs">{m.date}</td>
                    <td className="p-4 text-right">
                      {m.niveau !== "Admin" && (
                        <button onClick={() => { setMembres(membres.filter((x) => x.id !== m.id)); demo("Mode démo : la délégation ne serait pas réellement révoquée."); }} className="text-red-600 hover:text-red-800 font-bold text-xs">
                          Révoquer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">
            Dans la version réelle, chaque délégation est validée par un code OTP envoyé à l&apos;e-mail parlementaire du membre.
          </p>
        </div>
      )}

      {modalMembre && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-slate-200 text-xs space-y-4">
            <button onClick={() => setModalMembre(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            <div className="space-y-1">
              <span className="bg-[#E4BDE9]/60 text-[#4E2E53] font-bold px-2.5 py-0.5 rounded-full text-[10px]">Délégation d&apos;accès</span>
              <h3 className="text-xl font-serif-title font-bold text-[#4E2E53]">Déléguer un accès (démo)</h3>
            </div>
            <form onSubmit={ajouterMembre} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom *</label>
                <input type="text" required placeholder="Prénom Nom" value={formMembre.nom} onChange={(e) => setFormMembre({ ...formMembre, nom: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#4E2E53]" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">E-mail parlementaire *</label>
                <input type="email" required placeholder="prenom.nom@senat.fr" value={formMembre.email} onChange={(e) => setFormMembre({ ...formMembre, email: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#4E2E53]" />
                <p className="text-[10px] text-slate-400 mt-1">Un code OTP serait envoyé à cette adresse pour confirmer (démo : rien n&apos;est envoyé).</p>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rôle</label>
                <select value={formMembre.role} onChange={(e) => setFormMembre({ ...formMembre, role: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none">
                  <option>Collaborateur parlementaire</option>
                  <option>Attaché(e) de presse</option>
                  <option>Stagiaire</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-[#4E2E53] hover:bg-[#3b223f] text-white font-bold rounded-xl shadow-md">
                Envoyer l&apos;invitation (mode démo)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
