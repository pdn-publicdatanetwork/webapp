"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { sessionActuelle } from "@/lib/supabaseBrowser";

// Achats et abonnements : réservé à l'équipe pendant la construction. Les
// packs sans publicité arriveront plus tard, avec Stripe ; la page sera
// alors ouverte à tous.
export default function Achats() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [equipe, setEquipe] = useState<boolean | null>(null);

  const appel = useCallback(async (url: string, init: RequestInit = {}) => {
    const s = await sessionActuelle();
    return fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${s?.access_token}` } });
  }, []);

  useEffect(() => {
    sessionActuelle().then(setSession);
  }, []);

  useEffect(() => {
    if (!session) return;
    appel("/api/compte").then(async (r) => {
      if (r.ok) {
        const c = (await r.json()) as { equipe?: boolean };
        setEquipe(!!c.equipe);
      } else setEquipe(false);
    });
  }, [session, appel]);

  if (session === undefined || (session && equipe === null)) return <p className="meta">Chargement…</p>;

  return (
    <div className="etroit">
      <p className="meta"><a className="lien" href="/mon-compte">Compte</a> / Achats et abonnements</p>
      <h1>Achats et <span className="surligne">abonnements</span></h1>
      {equipe ? (
        <section className="section-compte">
          <h2>En préparation</h2>
          <p>
            Des <strong>packs sans publicité</strong> seront bientôt achetables ici, en direct et sans intermédiaire :
            tu choisis ce que tu veux soutenir, sans abonnement forcé.
          </p>
          <ul>
            <li>Paiement en direct par carte (Stripe)</li>
            <li>Sans engagement : tu achètes un pack, pas un abonnement</li>
            <li>Ton choix est respecté : pas de publicité, pas de revente de données</li>
          </ul>
          <p className="meta">Rubrique en cours de construction : rien ne sera facturé sans ton action. Elle sera ouverte à tous quand les paiements seront branchés.</p>
        </section>
      ) : (
        <section className="section-compte">
          <p>Cette rubrique n'est pas encore disponible.</p>
        </section>
      )}
    </div>
  );
}