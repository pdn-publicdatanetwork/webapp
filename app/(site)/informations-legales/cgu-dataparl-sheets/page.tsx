import type { Metadata } from "next";
import { CONTACT_URL } from "../maj";

import { HistoriqueTexte, VERSIONS } from "../historique";

export const metadata: Metadata = { title: "CGU DataParl' Sheets" };

// Conditions d'utilisation propres au tableur DataParl' Sheets (/sheets). Vouvoiement :
// « l'utilisateur », comme les autres pages légales.
export default function CguSheets() {
  return (
    <>
      <h1>CGU DataParl&apos; <span className="surligne">Sheets</span></h1>
      <HistoriqueTexte versions={VERSIONS.cguSheets} />

      <h2>1. Objet</h2>
      <p>
        DataParl&apos; Sheets (<a href="https://media.dataparl.fr/sheets">media.dataparl.fr/sheets</a>) est le tableur de DataParl&apos; : des feuilles de calcul
        construites à partir des données publiées par l&apos;API DataParl&apos;. Les présentes conditions
        complètent les <a href="/informations-legales/cgu">conditions d&apos;utilisation</a> générales du site,
        qui s&apos;appliquent également à l&apos;utilisateur.
      </p>

      <h2>2. Accès</h2>
      <p>
        L&apos;accès aux feuilles est gratuit. L&apos;utilisateur doit être connecté à un compte DataParl&apos;
        pour consulter une feuille ; l&apos;accès est ensuite accordé en échange d&apos;une courte vidéo
        publicitaire, comme pour les autres contenus du site, et reste ouvert plusieurs heures.
      </p>
      <p>
        DataParl&apos; choisit quelles feuilles sont publiées en libre accès ; une feuille peut être
        ajoutée, remplacée ou retirée à tout moment. Une feuille retirée cesse d&apos;être accessible.
      </p>

      <h2>3. Consultation en lecture seule</h2>
      <p>
        Les feuilles sont proposées à l&apos;utilisateur en lecture seule : celui-ci ne peut pas modifier
        les données, ni les enregistrer sur le service. Seules les personnes de l&apos;équipe DataParl&apos;
        peuvent travailler sur une grille, et uniquement dans leur navigateur : rien n&apos;est écrit dans
        les bases de données. L&apos;utilisateur peut exporter une feuille en CSV pour ses propres usages.
      </p>

      <h2>4. Données et responsabilité</h2>
      <p>
        Les données restent celles des sources officielles décrites dans la <a href="/methode">méthode</a> ;
        leurs conditions de réutilisation (licence ODbL, mention de la source) sont décrites sur la page{" "}
        <a href="/informations-legales/licences">Licences et réutilisation</a>. Les mêmes limites
        s&apos;appliquent : une donnée peut être inexacte ou incomplète, et l&apos;utilisateur est invité à
        signaler toute erreur via le <a href={CONTACT_URL}>formulaire de contact</a>.
      </p>
    </>
  );
}
