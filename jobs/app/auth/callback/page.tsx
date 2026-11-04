"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, suitePropre } from "@/lib/authSupabase";

// Retour du magic link ou de OAuth (Google) : échange du code PKCE contre
// une session, puis redirection vers la suite mémorisée (?suite=).
// Garde anti double invocation : en React Strict Mode l'effet tourne deux
// fois, le second échange échoue toujours (code déjà consommé) et l'écran
// affichait à tort un lien invalide.

function Echange() {
  const params = useSearchParams();
  const router = useRouter();
  const suite = suitePropre(params.get("suite"));
  const [erreur, setErreur] = useState("");
  const lance = useRef(false);

  useEffect(() => {
    if (lance.current) return;
    lance.current = true;

    const rediriger = () => router.replace(suite);

    auth.auth
      .getSession()
      .then(async ({ data }) => {
        if (data.session) {
          rediriger();
          return;
        }
        try {
          const res = await auth.auth.exchangeCodeForSession(window.location.href);
          if (res.data.session) {
            rediriger();
            return;
          }
          // Le code a pu être consommé par une invocation concurrente :
          // on revérifie la session avant de déclarer un échec.
          const recheck = await auth.auth.getSession();
          if (recheck.data.session) {
            rediriger();
            return;
          }
          setErreur("Lien de connexion invalide ou expiré. Demandez-en un nouveau depuis la page Connexion.");
        } catch {
          const recheck = await auth.auth.getSession();
          if (recheck.data.session) {
            rediriger();
            return;
          }
          setErreur("Lien de connexion invalide ou expiré. Demandez-en un nouveau depuis la page Connexion.");
        }
      });
  }, [params, router, suite]);

  return (
    <div className="max-w-md mx-auto py-16 text-center text-sm">
      {erreur ? (
        <div className="bg-white border border-red-200 rounded-3xl p-6 space-y-2">
          <p className="text-red-600 font-bold">Connexion impossible</p>
          <p className="text-slate-600 text-xs leading-relaxed">{erreur}</p>
        </div>
      ) : (
        <p className="text-slate-600">Vérification de votre connexion…</p>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Echange />
    </Suspense>
  );
}
