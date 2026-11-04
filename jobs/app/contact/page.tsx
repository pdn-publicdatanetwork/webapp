"use client";
import { useState } from "react";
import Turnstile from "@/components/Turnstile";

// Formulaire de contact DataParl' Jobs : les messages partent vers la même
// destination que dataparl.fr/contact (webmail équipe + Slack + admin).

const SUJETS = [
  { v: "question", l: "Question générale" },
  { v: "erreur", l: "Signaler une erreur de donnée" },
  { v: "bug", l: "Signaler un bug" },
  { v: "phishing", l: "Signaler un phishing" },
  { v: "rgpd", l: "Demande RGPD (suppression, droits)" },
  { v: "presse", l: "Demande presse" },
  { v: "legal", l: "Demande légale" },
];

export default function Page() {
  const [f, setF] = useState({ prenom: "", nom: "", email: "", sujet: "question", message: "", site: "" });
  const [jeton, setJeton] = useState("");
  const [essai, setEssai] = useState(0);
  const [etat, setEtat] = useState<"attente" | "envoi" | "ok" | "erreur">("attente");
  const [message, setMessage] = useState("");
  const maj = (p: Partial<typeof f>) => setF({ ...f, ...p });

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEtat("envoi");
    setMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, turnstile: jeton }),
      });
      const j = await res.json().catch(() => ({}));
      setEssai(essai + 1);
      setJeton("");
      if (res.ok) {
        setEtat("ok");
        setMessage(j.message ?? "Merci, votre message est bien arrivé.");
      } else {
        setEtat("erreur");
        setMessage(j.error ?? "Envoi impossible, réessayez.");
      }
    } catch {
      setEtat("erreur");
      setMessage("Envoi impossible, réessayez.");
    }
  };

  const champ =
    "w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4E2E53] focus:bg-white";
  const label = "block font-bold text-slate-700 mb-1 text-sm";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-3">
        <span className="bg-[#E4BDE9] text-[#4E2E53] text-xs font-bold px-2.5 py-1 rounded-full">Contact</span>
        <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#4E2E53]">Écrire à l&apos;équipe DataParl&apos;</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Une question, une correction, un bug sur les offres du Parlement ? Votre message arrive
          directement dans la messagerie de l&apos;équipe, la même que sur dataparl.fr.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
        {etat === "ok" ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1">
            <p className="text-sm font-bold text-emerald-800">Message envoyé ✅</p>
            <p className="text-xs text-slate-600">{message}</p>
          </div>
        ) : (
          <form onSubmit={envoyer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Prénom</label>
                <input type="text" required maxLength={80} value={f.prenom} onChange={(e) => maj({ prenom: e.target.value })} className={champ} />
              </div>
              <div>
                <label className={label}>Nom</label>
                <input type="text" required maxLength={80} value={f.nom} onChange={(e) => maj({ nom: e.target.value })} className={champ} />
              </div>
            </div>
            <div>
              <label className={label}>E-mail</label>
              <input type="email" required value={f.email} onChange={(e) => maj({ email: e.target.value })} placeholder="prenom.nom@email.fr" className={champ} />
            </div>
            <div>
              <label className={label}>Sujet</label>
              <select value={f.sujet} onChange={(e) => maj({ sujet: e.target.value })} className={champ}>
                {SUJETS.map((s) => (
                  <option key={s.v} value={s.v}>{s.l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Message</label>
              <textarea rows={5} required maxLength={5000} value={f.message} onChange={(e) => maj({ message: e.target.value })} className={champ} />
            </div>
            <input
              type="text"
              value={f.site}
              onChange={(e) => maj({ site: e.target.value })}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
            <Turnstile key={essai} onToken={setJeton} />
            <button
              type="submit"
              disabled={etat === "envoi"}
              className="w-full bg-[#4E2E53] hover:bg-[#3b223f] disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm transition-all"
            >
              {etat === "envoi" ? "Envoi en cours…" : "Envoyer mon message"}
            </button>
            {etat === "erreur" && <p className="text-xs text-red-600">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
