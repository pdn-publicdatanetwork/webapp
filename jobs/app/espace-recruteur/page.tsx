"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import EspacePro from "@/components/EspacePro";
import { auth } from "@/lib/authSupabase";
import { domaineAutorise } from "@/lib/jobs";

// Espace Recruteur : connexion obligatoire + adresse parlementaire stricte.
// Le domaine du compte connecté doit être autorisé (assemblee-nationale.fr,
// clb-an.fr, senat.fr, clb-senat.fr, europarl.europa.eu).

function Mur({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-[#E4BDE9] flex items-center justify-center text-xl mx-auto">🏛️</div>
      <h1 className="text-xl font-serif-title font-bold text-[#4E2E53]">{titre}</h1>
      <p className="text-sm text-slate-600 leading-relaxed">{texte}</p>
      <Link
        href="/connexion?suite=/espace-recruteur"
        className="inline-block bg-[#4E2E53] hover:bg-[#3b223f] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
      >
        Se connecter
      </Link>
    </div>
  );
}

export default function Page() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    auth.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    const { data: sub } = auth.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (email === undefined) {
    return <div className="max-w-xl mx-auto py-20 text-center text-sm text-slate-400">Chargement…</div>;
  }
  if (!email) {
    return (
      <Mur
        titre="Espace Recruteur réservé aux comptes"
        texte="Connectez-vous pour déposer une offre."
      />
    );
  }
  if (!domaineAutorise(email)) {
    return (
      <Mur
        titre="Adresse parlementaire requise"
        texte="L&apos;espace recruteur est réservé aux adresses autorisées (dataparl.fr, assemblee-nationale.fr, clb-an.fr, senat.fr, clb-senat.fr, europarl.europa.eu). Connectez-vous avec votre adresse professionnelle."
      />
    );
  }
  return <EspacePro courriel={email} />;
}
