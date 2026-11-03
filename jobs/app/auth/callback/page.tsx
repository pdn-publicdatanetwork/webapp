"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, suitePropre } from "@/lib/authSupabase";

// Retour du magic link : échange du code PKCE contre une session, puis
// redirection vers la suite mémorisée (?suite=).

function Echange() {
  const params = useSearchParams();
  const router = useRouter();
  const suite = suitePropre(params.get("suite"));
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    auth.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ data, error }) => {
        if (error || !data.session) {
          setErreur("Lien de connexion invalide ou expiré. Demandez-en un nouveau depuis la page Connexion.");
          return;
        }
        router.replace(suite);
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
