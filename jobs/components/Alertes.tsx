"use client";
import { useState } from "react";
import Turnstile from "@/components/Turnstile";

// Bannière d'inscription aux alertes e-mail (POST /api/jobs/alerte).

export default function Alertes() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"attente" | "envoi" | "ok" | "erreur">("attente");
  const [message, setMessage] = useState("");
  const [jeton, setJeton] = useState("");
  const [essai, setEssai] = useState(0);

  const inscrire = async (e: React.FormEvent) => {
    e.preventDefault();
    setEtat("envoi");
    setMessage("");
    try {
      const res = await fetch("/api/jobs/alerte", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, turnstile: jeton }),
      });
      const json = await res.json().catch(() => ({}));
      setEssai(essai + 1);
      setJeton("");
      if (res.ok) {
        setEtat("ok");
        setMessage(json.message ?? "Inscription confirmée. À très vite !");
      } else {
        setEtat("erreur");
        setMessage(json.erreur ?? "Inscription impossible, réessayez.");
      }
    } catch {
      setEtat("erreur");
      setMessage("Inscription impossible, réessayez.");
    }
  };

  return (
    <div id="alerte" className="bg-white border border-[#6C84B0]/20 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#ECF1FC] flex items-center justify-center text-lg shrink-0">🔔</div>
        <div>
          <h3 className="font-bold text-[#4E2E53] text-sm">Recevez les nouvelles offres par e-mail</h3>
          <p className="text-xs text-slate-500">Un seul e-mail quand de nouvelles offres paraissent. Sans publicité, désinscription en un clic.</p>
        </div>
      </div>

      {etat === "ok" ? (
        <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl shrink-0">
          ✅ {message}
        </p>
      ) : (
        <form onSubmit={inscrire} className="flex flex-col md:items-end gap-2 w-full md:w-auto shrink-0">
          <div className="flex gap-2 w-full md:w-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@email.fr"
            className="flex-1 md:w-64 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E2E53] focus:bg-white"
          />
          <button
            type="submit"
            disabled={etat === "envoi"}
            className="bg-[#4E2E53] hover:bg-[#3b223f] disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shrink-0"
          >
            {etat === "envoi" ? "…" : "S'inscrire"}
          </button>
          </div>
          <Turnstile key={essai} onToken={setJeton} />
        </form>
      )}
      {etat === "erreur" && <p className="text-xs text-red-600 w-full md:w-auto">{message}</p>}
    </div>
  );
}
