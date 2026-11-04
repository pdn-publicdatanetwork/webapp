"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, suitePropre } from "@/lib/authSupabase";

// Connexion par magic link, partagée avec le compte DataParl' (dataparl-auth).
// ?suite=/chemin ramène l'utilisateur là où il était après vérification.

function Formulaire() {
  const params = useSearchParams();
  const router = useRouter();
  const suite = suitePropre(params.get("suite"));
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"attente" | "envoi" | "ok" | "erreur">("attente");
  const [message, setMessage] = useState("");

  useEffect(() => {
    auth.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(suite);
    });
  }, [router, suite]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEtat("envoi");
    const { error } = await auth.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: window.location.origin + "/auth/callback?suite=" + encodeURIComponent(suite),
      },
    });
    if (error) {
      setEtat("erreur");
      setMessage(error.message ?? "Envoi impossible, réessayez.");
      return;
    }
    setEtat("ok");
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-3">
        <span className="bg-[#E4BDE9] text-[#4E2E53] text-xs font-bold px-2.5 py-1 rounded-full">Compte DataParl&apos;</span>
        <h1 className="text-2xl font-serif-title font-bold text-[#4E2E53]">Se connecter</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          C&apos;est le même compte que sur www.dataparl.fr (Mon compte). Entrez votre e-mail :
          nous vous envoyons un lien de connexion.
        </p>
        {etat !== "ok" ? (
          <form onSubmit={envoyer} className="space-y-3 pt-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@email.fr"
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4E2E53] focus:bg-white text-sm"
            />
            <button
              type="submit"
              disabled={etat === "envoi"}
              className="w-full bg-[#4E2E53] hover:bg-[#3b223f] disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm transition-all"
            >
              {etat === "envoi" ? "Envoi en cours…" : "Recevoir mon lien de connexion"}
            </button>
          </form>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1">
            <p className="text-sm font-bold text-emerald-800">Vérifiez votre messagerie 📬</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>. Cliquez dessus pour être ramené ici,
              directement là où vous étiez.
            </p>
          </div>
        )}
        {etat === "erreur" && <p className="text-xs text-red-600">{message}</p>}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Formulaire />
    </Suspense>
  );
}
