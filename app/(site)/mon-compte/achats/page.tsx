import type { Metadata } from "next";

export const metadata: Metadata = { title: "Achats et abonnements", robots: { index: false, follow: false } };

// Achats et abonnements : en préparation. Des packs sans publicité seront
// achetables en direct (Stripe), sans intermédiaire.
export default function Achats() {
  return (
    <div className="etroit">
      <h1>Achats et <span className="surligne">abonnements</span></h1>
      <p><a className="lien" href="/mon-compte">← Mon compte</a></p>

      <section className="section-compte">
        <h2>Bientôt disponible</h2>
        <p>
          Des <strong>packs sans publicité</strong> seront bientôt achetables ici, en direct et sans intermédiaire :
          tu choisis ce que tu veux soutenir, sans abonnement forcé.
        </p>
        <ul>
          <li>Paiement en direct par carte (Stripe)</li>
          <li>Sans engagement : tu achètes un pack, pas un abonnement</li>
          <li>Ton choix est respecté : pas de publicité, pas de revente de données</li>
        </ul>
        <p className="meta">Cette rubrique est encore vide : elle sera alimentée quand les paiements seront branchés. Rien ne te sera facturé sans ton action.</p>
      </section>
    </div>
  );
}