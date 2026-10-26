"use client";
import { useEffect, useState } from "react";
import { cookieStorage } from "@/lib/cookieStorage";
import { appliquer, chargerClarity, chargerPub, enregistrer, espaceInterne, lire } from "@/lib/consentement";

// Bandeau de consentement maison (pas une bannière Google) : recueille l'accord
// pour la mesure d'audience et la publicité, et transmet les signaux Consent
// Mode v2 à GTM. C'est aussi ici que les scripts AdSense (si publicité
// acceptée) et Microsoft Clarity (si mesure d'audience acceptée) sont
// injectés — jamais avant. Trois choix en bas : « Autoriser », « Gérer les
// options » et « Tout refuser » (accessible sans ouvrir les options).
// Espaces internes (admin, webmail) : rien ne s'affiche, rien ne se charge.

export default function BandeauCookies() {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState(false);
  const [choix, setChoix] = useState({ mesure: true, pub: true });

  useEffect(() => {
    if (espaceInterne()) return;
    const c = lire();
    if (c) {
      // Déjà choisi : appliquer à chaque page (les défauts « denied » du layout
      // s'appliquent avant GTM ; ici on réactualise avec le choix mémorisé).
      appliquer(c);
      if (c.mesure) chargerClarity();
      if (c.pub) chargerPub();
    } else setVisible(true);
  }, []);

  function valider(c: { mesure: boolean; pub: boolean }) {
    enregistrer({ ...c, date: new Date().toISOString().slice(0, 10) });
    if (c.mesure) chargerClarity();
    if (c.pub) chargerPub();
    setVisible(false);
  }
  const tout = () => valider({ mesure: true, pub: true });
  const rien = () => valider({ mesure: false, pub: false });

  if (!visible) return null;

  return (
    <div className="cookies" role="dialog" aria-labelledby="cookies-titre">
      <p className="meta">Ton accord compte.</p>
      <p id="cookies-titre" className="titre">Cookies, à ton choix.</p>
      <p>
        Seul ce qui sert à te garder connecté(e) est enregistré sans accord. Pour le reste, tu choisis :
        la <strong>mesure d'audience</strong> (savoir quelles pages sont lues) et la{" "}
        <strong>publicité</strong> (annonces Google adaptées à tes centres d'intérêt).
        Rien n'est activé sans ton accord, et tu peux refuser les deux.
      </p>
      <p><a href="/informations-legales/cookies">Lire la politique cookie</a></p>

      {options ? (
        <>
          <div className="consentement-options">
            <label>
              <input type="checkbox" checked={choix.mesure} onChange={(e) => setChoix({ ...choix, mesure: e.target.checked })} />
              <span><strong>Mesure d'audience</strong>Statistiques de fréquentation, anonymes si refusés</span>
            </label>
            <label>
              <input type="checkbox" checked={choix.pub} onChange={(e) => setChoix({ ...choix, pub: e.target.checked })} />
              <span><strong>Publicité</strong>Annonces Google et personnalisation publicitaire</span>
            </label>
          </div>
          <div className="consentement-boutons">
            <button onClick={() => valider(choix)}>Enregistrer mes choix</button>
            <button className="secondaire" onClick={rien}>Tout refuser</button>
          </div>
        </>
      ) : (
        <div className="consentement-boutons">
          <button onClick={tout}>Autoriser</button>
          <button className="secondaire" onClick={() => setOptions(true)}>Gérer les options</button>
          <button className="lien" onClick={rien}>Tout refuser</button>
        </div>
      )}
    </div>
  );
}
