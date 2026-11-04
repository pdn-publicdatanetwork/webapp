"use client";
import { useEffect, useState } from "react";
import { CHAMBRES, domaineAutorise } from "@/lib/jobs";
import { CONTRATS } from "@/lib/jobsTexte";
import Turnstile from "@/components/Turnstile";

// Espace de dépôt d'offre pour les élus et leurs cabinets. Auditeur de
// conformité temps réel (charte DataParl') et envoi vers /api/jobs/proposer.

type Formulaire = {
  titre: string;
  chambre: string;
  type_poste: string;
  salaire: string;
  lieu: string;
  email: string;
  elu: string;
  groupe: string;
  intro: string;
  missions: string;
  profil: string;
  candidater: string;
  temps_travail: string;
  date_debut: string;
  date_limite: string;
  avantages: string;
};

const VIDE: Formulaire = {
  titre: "",
  chambre: "an",
  type_poste: "Stage",
  salaire: "",
  lieu: "",
  email: "",
  elu: "",
  groupe: "",
  intro: "",
  missions: "",
  profil: "",
  candidater: "",
  temps_travail: "Temps plein",
  date_debut: "",
  date_limite: "",
  avantages: "",
};

export default function EspacePro({ courriel }: { courriel?: string }) {
  const [f, setF] = useState<Formulaire>(VIDE);
  const [etat, setEtat] = useState<"attente" | "envoi" | "ok" | "erreur">("attente");
  const [message, setMessage] = useState("");
  const [jeton, setJeton] = useState("");
  const [essai, setEssai] = useState(0);
  const maj = (p: Partial<Formulaire>) => setF({ ...f, ...p });

  useEffect(() => {
    if (courriel) maj({ email: courriel });
  }, [courriel]);

  const regles = {
    titreCourt: f.titre.trim().length >= 6 && f.titre.trim().length <= 70,
    salaireTransparent: f.salaire.trim().length > 3 && /\d/.test(f.salaire),
    adressePrecise: f.lieu.trim().length >= 6 && /\d/.test(f.lieu),
    emailParlementaire: domaineAutorise(f.email.trim()),
  };
  const score = Object.values(regles).filter(Boolean).length;
  const conforme = score === 4;
  const ligne = (ok: boolean, label: string) => (
    <div className="flex items-center gap-2">
      <span>{ok ? "✅" : "❌"}</span>
      <span className={ok ? "text-slate-700 font-medium" : "text-slate-400"}>{label}</span>
    </div>
  );

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conforme) return;
    setEtat("envoi");
    setMessage("");
    try {
      const res = await fetch("/api/jobs/proposer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titre: f.titre.trim(),
          chambre: f.chambre,
          type_poste: f.type_poste,
          salaire: f.salaire.trim(),
          lieu: f.lieu.trim(),
          email: f.email.trim(),
          elu: f.elu.trim(),
          groupe: f.groupe.trim(),
          intro: f.intro.trim(),
          missions: f.missions.split("\n").map((l) => l.trim()).filter(Boolean),
          profil: f.profil.split("\n").map((l) => l.trim()).filter(Boolean),
          candidater: f.candidater.trim(),
          temps_travail: f.temps_travail,
          date_debut: f.date_debut,
          date_limite: f.date_limite,
          avantages: f.avantages.trim(),
          turnstile: jeton,
        }),
      });
      const json = await res.json().catch(() => ({}));
      setEssai(essai + 1);
      setJeton("");
      if (res.ok) {
        setEtat("ok");
        setMessage(json.message ?? "Votre offre est déposée. Elle sera relue puis publiée.");
      } else {
        setEtat("erreur");
        setMessage(json.erreur ?? "Dépôt impossible, réessayez.");
      }
    } catch {
      setEtat("erreur");
      setMessage("Dépôt impossible, réessayez.");
    }
  };

  const champ =
    "w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4E2E53] focus:bg-white";
  const label = "block font-bold text-slate-700 mb-1";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2">
        <span className="bg-[#E4BDE9] text-[#4E2E53] text-xs font-bold px-2.5 py-1 rounded-full">Espace Élu / Cabinet</span>
        <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#4E2E53]">Déposer une offre</h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Publiez votre offre de collaborateur parlementaire avec le badge « Déposée par l&apos;élu ».
          Une adresse e-mail parlementaire est demandée pour la vérification : l&apos;offre est relue par
          l&apos;équipe DataParl&apos; avant publication.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <form onSubmit={envoyer} className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
          <div>
            <label className={label}>Intitulé du poste (70 caractères max)</label>
            <input type="text" required maxLength={70} value={f.titre} onChange={(e) => maj({ titre: e.target.value })} placeholder="ex : Stagiaire communication et réseaux sociaux" className={champ} />
            <p className="text-[11px] text-slate-400 mt-1">{f.titre.length}/70</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Chambre</label>
              <select value={f.chambre} onChange={(e) => maj({ chambre: e.target.value })} className={champ}>
                {CHAMBRES.map((c) => (
                  <option key={c.valeur} value={c.valeur}>{c.libelle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Type de contrat</label>
              <select value={f.type_poste} onChange={(e) => maj({ type_poste: e.target.value })} className={champ}>
                {CONTRATS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Temps de travail</label>
              <select value={f.temps_travail} onChange={(e) => maj({ temps_travail: e.target.value })} className={champ}>
                <option>Temps plein</option>
                <option>Temps partiel</option>
              </select>
            </div>
            <div>
              <label className={label}>Date de début (optionnel)</label>
              <input type="date" value={f.date_debut} onChange={(e) => maj({ date_debut: e.target.value })} className={champ} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Date limite de candidature (optionnel)</label>
              <input type="date" value={f.date_limite} onChange={(e) => maj({ date_limite: e.target.value })} className={champ} />
            </div>
            <div>
              <label className={label}>Avantages (optionnel)</label>
              <input type="text" value={f.avantages} onChange={(e) => maj({ avantages: e.target.value })} placeholder="ex : tickets restaurant, 50 % transports" className={champ} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Rémunération (transparente)</label>
              <input type="text" required value={f.salaire} onChange={(e) => maj({ salaire: e.target.value })} placeholder="ex : 1 300 € nets / mois" className={champ} />
            </div>
            <div>
              <label className={label}>E-mail parlementaire de contact</label>
              <input type="email" required value={f.email} onChange={(e) => maj({ email: e.target.value })} readOnly={Boolean(courriel)} placeholder="prenom.nom@assemblee-nationale.fr" className={champ} />
              {courriel && <p className="text-[11px] mt-1 font-medium text-slate-400">Adresse vérifiée depuis votre compte parlementaire connecté.</p>}
              {f.email.trim().includes("@") && (
                <p className={"text-[11px] mt-1 font-medium " + (regles.emailParlementaire ? "text-emerald-600" : "text-amber-600")}>
                  {regles.emailParlementaire
                    ? "✅ Domaine parlementaire reconnu : " + (f.email.trim().split("@")[1] ?? "")
                    : "⚠️ Domaine non parlementaire. Attendus : assemblee-nationale.fr, clb-an.fr, senat.fr, clb-senat.fr, europarl.europa.eu."}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Nom de l&apos;élu</label>
              <input type="text" required value={f.elu} onChange={(e) => maj({ elu: e.target.value })} placeholder="Prénom Nom" className={champ} />
            </div>
            <div>
              <label className={label}>Groupe politique</label>
              <input type="text" value={f.groupe} onChange={(e) => maj({ groupe: e.target.value })} placeholder="ex : Socialistes et apparentés" className={champ} />
            </div>
          </div>

          <div>
            <label className={label}>Lieu précis (adresse normalisée)</label>
            <input type="text" required value={f.lieu} onChange={(e) => maj({ lieu: e.target.value })} placeholder="ex : 126 rue de l'Université, 75007 Paris" className={champ} />
          </div>

          <div>
            <label className={label}>Présentation du poste (2 à 3 phrases)</label>
            <textarea rows={3} required value={f.intro} onChange={(e) => maj({ intro: e.target.value })} className={champ} />
          </div>

          <div>
            <label className={label}>Missions (une par ligne)</label>
            <textarea rows={4} required value={f.missions} onChange={(e) => maj({ missions: e.target.value })} className={champ} />
          </div>

          <div>
            <label className={label}>Profil recherché (une ligne par attente)</label>
            <textarea rows={3} required value={f.profil} onChange={(e) => maj({ profil: e.target.value })} className={champ} />
          </div>

          <div>
            <label className={label}>Consignes de candidature (optionnel)</label>
            <textarea rows={2} value={f.candidater} onChange={(e) => maj({ candidater: e.target.value })} placeholder="ex : CV et lettre de motivation avec l'objet STAGE-NOVEMBRE" className={champ} />
          </div>

          <Turnstile key={essai} onToken={setJeton} />

          <button
            type="submit"
            disabled={!conforme || etat === "envoi"}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
              conforme
                ? "bg-[#4E2E53] hover:bg-[#3b223f] text-white shadow-md"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
          >
            {etat === "envoi" ? "Dépôt en cours…" : "Déposer l'offre pour relecture"}
          </button>

          {etat === "ok" && (
            <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              ✅ {message}
            </p>
          )}
          {etat === "erreur" && (
            <p className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">{message}</p>
          )}
        </form>

        <aside className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5 lg:sticky lg:top-28">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-serif-title font-bold text-[#4E2E53] text-sm">🛡️ Auditeur de conformité</h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Critères de la charte de transparence DataParl&apos; vérifiés en direct.
            </p>
          </div>
          <div className="bg-[#ECF1FC] p-4 rounded-2xl text-center space-y-1">
            <div className="text-2xl font-bold text-[#4E2E53]">{score} / 4</div>
            <p className="text-[11px] text-slate-600 font-semibold">
              {conforme ? "✨ Offre conforme à la charte" : "Mise en conformité requise"}
            </p>
          </div>
          <div className="space-y-3 text-xs">
            {ligne(regles.titreCourt, "Intitulé court (70 caractères max)")}
            {ligne(regles.salaireTransparent, "Rémunération transparente")}
            {ligne(regles.adressePrecise, "Adresse précise et normalisée")}
            {ligne(regles.emailParlementaire, "E-mail parlementaire vérifiable")}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Votre adresse e-mail n&apos;est jamais affichée publiquement : elle reste protégée par la
            vérification anti-robot côté candidats.
          </p>
        </aside>
      </div>
    </div>
  );
}
