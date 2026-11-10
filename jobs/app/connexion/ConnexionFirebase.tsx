"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { suitePropre } from "@/lib/authSupabase";
import {
  connexionParLien,
  connexionPopup,
  emailLienMemorise,
  finaliserSession,
  lienConnexionActif,
  memoriserEmailLien,
  sessionFirebase,
} from "@/lib/sessionFirebase";
import Turnstile from "@/components/Turnstile";

// Porte de connexion Firebase (projet dataparl-auth) pour jobs.dataparl.fr.
// Google (popup) ou lien magique ; la session vit dans le cookie partagé
// dp-firebase posé sur .dataparl.fr : connecté sur www = connecté ici.
// L'arrivée depuis un lien magique se finalise sur cette même page.

export default function ConnexionFirebase() {
  const params = useSearchParams();
  const router = useRouter();
  const suite = suitePropre(params.get("suite"));
  const [email, setEmail] = useState("");
  const [jeton, setJeton] = useState("");
  const [essai, setEssai] = useState(0);
  const [etat, setEtat] = useState<"attente" | "envoi" | "ok" | "erreur" | "lien-email">("attente");
  const [message, setMessage] = useState("");
  // Calculé hors rétrécissement de type : dans la branche « lien-email »,
  // le type de etat est réduit à "lien-email" et toute comparaison avec
  // "envoi" serait une erreur TS2367. On fige le booléen avant le rendu.
  const occupe = etat === "envoi";

  // Arrivée : finalisation d'un lien magique, ou redirection si déjà
  // connecté (le cookie partagé suffit : aucune saisie nécessaire).
  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        if (await lienConnexionActif()) {
          const memo = emailLienMemorise();
          if (memo) {
            await finaliser(connexionParLien(memo));
          } else {
            if (!vivant) return;
            setEtat("lien-email");
          }
          return;
        }
        const s = await sessionFirebase();
        if (!vivant) return;
        if (s) router.replace(suite);
      } catch (e) {
        if (!vivant) return;
        setEtat("erreur");
        setMessage((e as { code?: string; message?: string }).code ?? (e as Error).message ?? "Connexion impossible.");
      }
    })();
    return () => {
      vivant = false;
    };
    // finaliser est stable (défini ci-dessous hors rendu) ; suite change peu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, suite]);

  // Finalisation : vérification serveur du jeton (identité Postgres) puis
  // écriture du cookie de session partagé et retour à la page demandée.
  const finaliser = async (promesseUser: Promise<any>) => {
    setEtat("envoi");
    const userFb = await promesseUser;
    const idToken = userFb?.accessToken;
    if (!idToken) throw new Error("session incomplète");
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.id) throw new Error(j?.erreur ?? "vérification du compte impossible");
    finaliserSession(userFb, j.id);
    router.replace(suite);
  };

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEtat("envoi");
    try {
      const res = await fetch("/api/auth/lien", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), suite, jeton }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.erreur ?? "Envoi impossible, réessayez.");
      memoriserEmailLien(email.trim().toLowerCase());
      setEtat("ok");
    } catch (err) {
      setEtat("erreur");
      setMessage((err as Error).message);
      setEssai(essai + 1);
      setJeton("");
    }
  };

  const google = async () => {
    setEtat("envoi");
    try {
      await finaliser(connexionPopup("google"));
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setEtat("erreur");
      setMessage(err.code ? `Connexion refusée (${err.code})` : err.message ?? "Connexion Google impossible.");
    }
  };

  const depuisLien = async (e: React.FormEvent) => {
    e.preventDefault();
    setEtat("envoi");
    try {
      memoriserEmailLien(email.trim().toLowerCase());
      await finaliser(connexionParLien(email.trim().toLowerCase()));
    } catch (e2) {
      setEtat("erreur");
      setMessage((e2 as Error).message ?? "Lien invalide ou expiré.");
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-3">
        <span className="bg-[#E4BDE9] text-[#4E2E53] text-xs font-bold px-2.5 py-1 rounded-full">Compte DataParl&apos;</span>
        <h1 className="text-2xl font-serif-title font-bold text-[#4E2E53]">Se connecter</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          C&apos;est le même compte que sur www.dataparl.fr (Mon compte). Connecté sur le site ? Vous êtes déjà
          connecté ici.
        </p>

        {etat === "ok" ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1">
            <p className="text-sm font-bold text-emerald-800">Vérifiez votre messagerie 📬</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>. Cliquez dessus pour être ramené ici,
              directement là où vous étiez.
            </p>
          </div>
        ) : etat === "lien-email" ? (
          <form onSubmit={depuisLien} className="space-y-3 pt-2">
            <p className="text-xs text-slate-600">
              Vous arrivez depuis un lien de connexion : confirmez votre adresse e-mail pour terminer.
            </p>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@email.fr"
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4E2E53] focus:bg-white text-sm"
            />
            <button
              type="submit"
              disabled={occupe}
              className="w-full bg-[#4E2E53] hover:bg-[#3b223f] disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm transition-all"
            >
              {occupe ? "Vérification…" : "Terminer la connexion"}
            </button>
          </form>
        ) : (
          <>
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
            <Turnstile key={essai} onToken={setJeton} />
            <div className="flex items-center gap-3 pt-2">
              <span className="h-px bg-slate-200 flex-1" />
              <span className="text-[11px] text-slate-400 font-semibold">ou</span>
              <span className="h-px bg-slate-200 flex-1" />
            </div>
            <button
              type="button"
              onClick={google}
              disabled={etat === "envoi"}
              className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="font-black text-[#4285F4]">G</span>
              Continuer avec Google
            </button>
          </>
        )}
        {etat === "erreur" && <p className="text-xs text-red-600">{message}</p>}
      </div>
    </div>
  );
}
