"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/authSupabase";
import { AUTH_FIREBASE_ACTIF, sessionFirebase } from "@/lib/sessionFirebase";

// Bannière d'alertes : la connexion est obligatoire, l'adresse utilisée est
// celle du compte connecté (aucune saisie d'e-mail).

export default function Alertes() {
  const [email, setEmail] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [etat, setEtat] = useState<"attente" | "envoi" | "ok" | "erreur">("attente");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (AUTH_FIREBASE_ACTIF) {
      sessionFirebase().then((s) => {
        setEmail(s?.email ?? null);
        setChargement(false);
      });
      return;
    }
    auth.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setChargement(false);
    });
    const { data: sub } = auth.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const inscrire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEtat("envoi");
    setMessage("");
    try {
      const res = await fetch("/api/jobs/alerte", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
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

      <div className="w-full md:w-auto shrink-0">
        {chargement ? (
          <p className="text-xs text-slate-400 text-center md:text-right py-2.5">Chargement…</p>
        ) : !email ? (
          <Link
            href="/connexion?suite=/"
            className="block text-center bg-[#4E2E53] hover:bg-[#3b223f] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
          >
            Se connecter pour recevoir les alertes
          </Link>
        ) : etat === "ok" ? (
          <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-center md:text-right">
            ✅ {message}
          </p>
        ) : (
          <form onSubmit={inscrire} className="flex flex-col sm:flex-row items-center justify-end gap-2">
            <span className="text-xs text-slate-500 sm:max-w-[220px] truncate">{email}</span>
            <button
              type="submit"
              disabled={etat === "envoi"}
              className="bg-[#4E2E53] hover:bg-[#3b223f] disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
            >
              {etat === "envoi" ? "…" : "M'inscrire"}
            </button>
          </form>
        )}
        {etat === "erreur" && <p className="text-xs text-red-600 mt-1 text-center md:text-right">{message}</p>}
      </div>
    </div>
  );
}
