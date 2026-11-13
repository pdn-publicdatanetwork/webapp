"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  appliquer,
  chargerClarity,
  chargerGA4,
  chargerPub,
  enregistrer,
  espaceInterne,
  lire,
  marquerMurVu,
  murDejaVu,
  pagePubAutorisee,
} from "@/lib/consentement";
import "./mur-acces.css";

// Mur d'accès (décisions du 13/11/2026, modèle energynews.pro adapté) : il
// remplace l'ancien bandeau cookies (BandeauCookies.tsx). Deux voies, jamais
// de mur dur : « Continuer gratuitement, avec publicité » (annonces
// contextuelles, sans cookie publicitaire) ou « Passer sans publicité »
// (3 € par mois, renvoie vers la rubrique Achats de Mon espace en attendant
// le checkout Stripe). « Continuer sans choisir » : la publicité contextuelle
// reste par défaut. La mesure d'audience (GA4, Clarity) reste un opt-in
// distinct, décoché. Le mur ne s'affiche qu'une fois (marqueur cookie) et
// seulement sur les pages pouvant porter de la publicité
// (pagePubAutorisee) : les autres pages n'ont pas de choix à proposer.
// Espaces internes (admin, webmail) : rien ne s'affiche, rien ne se charge.

export default function MurAcces() {
  const [visible, setVisible] = useState(false);
  const [mesure, setMesure] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (espaceInterne()) return;
    let annule = false;
    (async () => {
      // Mur coupé depuis la console admin (site_parametres) : il ne
      // s'affiche pas ; les traceurs soumis au consentement non plus.
      try {
        const r = await fetch("/api/parametres-site");
        const p = (await r.json()) as { popup_cookies?: boolean };
        if (annule || p?.popup_cookies === false) return;
      } catch { /* indisponible : comportement par défaut (mur actif) */ }
      const c = lire();
      if (c) {
        // Déjà choisi (ancien bandeau ou mur) : appliquer à chaque page,
        // jamais redemandé.
        appliquer(c);
        if (c.mesure) {
          chargerGA4();
          chargerClarity();
        }
        if (c.pub) chargerPub();
        return;
      }
      // Aucun choix : publicité contextuelle par défaut (sans cookie : les
      // signaux « denied » du layout suffisent), aucun script de mesure.
      chargerPub();
      if (pagePubAutorisee() && !murDejaVu()) setVisible(true);
    })();
    return () => { annule = true; };
  }, []);

  function valider(m: boolean) {
    enregistrer({ mesure: m, pub: true, date: new Date().toISOString().slice(0, 10) });
    if (m) {
      chargerGA4();
      chargerClarity();
    }
    chargerPub();
    setVisible(false);
  }

  const gratuit = () => valider(mesure);
  const abonner = () => {
    valider(mesure);
    router.push("/mon-compte/achats");
  };
  const sansChoisir = () => {
    marquerMurVu();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mur" role="dialog" aria-labelledby="mur-titre">
      <div className="mur-tete">
        <p className="meta">Tout dataparl.fr est en accès libre.</p>
        <button className="lien" onClick={sansChoisir}>
          Continuer sans choisir (publicité contextuelle uniquement)
        </button>
      </div>
      <p id="mur-titre" className="titre">Choisissez les modalités de votre accès</p>
      <div className="mur-choix">
        <div className="mur-col">
          <p className="mur-col-titre">Continuer gratuitement, avec publicité</p>
          <p className="mur-col-meta">Gratuit, sans compte</p>
          <p>
            Fiches des élues, élus et collaborateurs, mouvements quotidiens, VigiParl&apos;,
            MixiParl&apos;, alertes e-mail. En échange, <strong>de la publicité sur certaines
            pages</strong> : un bloc par page, jamais en plein écran, jamais de publicité
            politique. C&apos;est elle qui finance l&apos;accès libre au site et l&apos;infrastructure
            qui reconstitue le Parlement chaque jour.
          </p>
          <button onClick={gratuit}>Continuer gratuitement</button>
        </div>
        <div className="mur-col mur-col-payante">
          <p className="mur-col-titre">Passer sans publicité</p>
          <p className="mur-col-meta">3 € par mois, résiliable à tout moment</p>
          <p>
            Zéro publicité, zéro traceur, aucun partenaire annonceur. Votre abonnement finance
            le site autant que la publicité, <strong>sans en voir un seul bloc</strong>.
          </p>
          <button className="secondaire" onClick={abonner}>S&apos;abonner sans publicité</button>
        </div>
      </div>
      <div className="consentement-options mur-mesure">
        <label>
          <input type="checkbox" checked={mesure} onChange={(e) => setMesure(e.target.checked)} />
          <span><strong>Facultatif</strong>Nous aider à mesurer l&apos;audience du site (statistiques de fréquentation)</span>
        </label>
      </div>
      <div className="mur-engagements">
        <span>Vos données nominatives ne sont jamais revendues</span>
        <span>Vos communications se règlent une par une dans Mon espace</span>
        <span>Les données publiées sur data.gouv.fr restent intégralement libres (ODbL)</span>
      </div>
      <p className="mur-persistance">
        Ce choix vaut aussi pour votre compte, que vous vous connectiez par e-mail, Google ou
        GitHub : il ne vous sera pas redemandé.
      </p>
      <a href="/nos-engagements">Tout voir : nos engagements</a>
    </div>
  );
}
