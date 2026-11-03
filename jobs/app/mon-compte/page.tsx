"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/authSupabase";

// Espace compte DataParl' Jobs : même compte que www.dataparl.fr.

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    auth.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/connexion?suite=/mon-compte");
        return;
      }
      setEmail(data.session.user.email ?? null);
      setCharge(false);
    });
  }, [router]);

  const deconnexion = async () => {
    await auth.auth.signOut();
    router.replace("/");
  };

  if (charge) return <div className="max-w-md mx-auto py-16 text-center text-sm text-slate-500">Chargement…</div>;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">✅ Connecté</span>
        <h1 className="text-2xl font-serif-title font-bold text-[#4E2E53]">Mon compte</h1>
        <p className="text-sm text-slate-600">
          Vous êtes connecté avec <strong className="break-all">{email}</strong>.
        </p>
        <div className="bg-[#ECF1FC] rounded-2xl p-4 space-y-2 text-xs">
          <p className="font-bold text-[#4E2E53]">Votre espace DataParl&apos; :</p>
          <a href="https://www.dataparl.fr/mon-compte" className="block text-[#6C84B0] hover:text-[#4E2E53] underline">Mon compte sur www.dataparl.fr →</a>
          <a href="https://www.dataparl.fr/mon-compte/ma-fiche" className="block text-[#6C84B0] hover:text-[#4E2E53] underline">Ma fiche / profil CV →</a>
        </div>
        <button onClick={deconnexion} className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl font-semibold text-xs transition-colors">
          Se déconnecter
        </button>
      </div>
      <p className="text-center text-[11px] text-slate-400 leading-relaxed">
        Un seul compte pour DataParl&apos; et DataParl&apos; Jobs. Vos alertes e-mail restent indépendantes de la connexion.
      </p>
    </div>
  );
}
