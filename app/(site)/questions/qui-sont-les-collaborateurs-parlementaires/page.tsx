import type { Metadata } from "next";
import { aujourdhuiParis } from "@/lib/alertes";
import { dateLongue } from "@/lib/format";
import { compteAffectations } from "@/lib/data";
import { tousLesParlementaires, type EluCompact } from "@/lib/referentiel";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Qui sont les collaborateurs parlementaires ?",
  description: "Définition, statut, effectifs datés et rôle des collaborateurs des députés, sénateurs et eurodéputés français, d'après les listes officielles.",
  alternates: { canonical: "/questions/qui-sont-les-collaborateurs-parlementaires" },
};

export default async function Page() {
  const dateFr = dateLongue(aujourdhuiParis());
  let comptes: Record<string, number> = {};
  let elus: EluCompact[] = [];
  try { [comptes, elus] = await Promise.all([compteAffectations(), tousLesParlementaires()]); } catch {}
  const actifs = elus.filter((e) => e.a);
  const nb = (c: string) => comptes[c] ?? 0;
  const total = nb("assemblee") + nb("senat") + nb("europarl");
  const nbElus = (c: string) => actifs.filter((e) => e.c === c).length;
  const dispo = total > 0;

  const reponse = `Un collaborateur parlementaire est une personne engagée par contrat de droit privé par un parlementaire français (député, sénateur ou député européen) pour l'assister dans son mandat : préparation des dossiers, rédaction, permanence et relations avec les électeurs et les administrations.${dispo ? ` Environ ${total.toLocaleString("fr-FR")} collaborateurs sont en poste aujourd'hui, dont ${nb("assemblee").toLocaleString("fr-FR")} auprès des députés et ${nb("senat").toLocaleString("fr-FR")} auprès des sénateurs.` : ""} Leurs noms figurent sur des listes officielles publiées par l'Assemblée nationale, le Sénat et le Parlement européen.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Qui sont les collaborateurs parlementaires ?", acceptedAnswer: { "@type": "Answer", text: reponse } },
      { "@type": "Question", name: "Quel est le statut d'un collaborateur parlementaire ?", acceptedAnswer: { "@type": "Answer", text: "Le collaborateur est salarié de droit privé, engagé directement par le parlementaire employeur. Sa rémunération est prise sur une enveloppe publique dédiée (l'AFAP, aide au fonctionnement des parlementaires), avec un plafond d'effectifs et de masse salariale. Il travaille à Paris (à l'Assemblée, au Sénat ou au Parlement européen) ou en circonscription, souvent les deux à temps partagé." } },
      { "@type": "Question", name: "Le poste de collaborateur parlementaire est-il public ?", acceptedAnswer: { "@type": "Answer", text: "Oui : l'identité des collaborateurs et leur employeur figurent dans les listes officielles publiées par chaque chambre, mises à jour régulièrement. DataParl' recense ces listes et publie les arrivées, départs et transferts quotidiennement." } },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
      <p className="meta"><a href="/questions">&larr; Toutes les études</a></p>
      <h1>Qui sont les collaborateurs parlementaires ?</h1>
      <p className="lead">{reponse}</p>

      <h2>Les effectifs en date du {dateFr}</h2>
      {dispo ? (
        <div className="chiffres">
          <div className="principal"><strong>{total.toLocaleString("fr-FR")}</strong><span>collaborateurs en poste</span></div>
          <div><strong>{nb("assemblee").toLocaleString("fr-FR")}</strong><span>à l&apos;Assemblée nationale ({nbElus("assemblee").toLocaleString("fr-FR")} députés)</span></div>
          <div><strong>{nb("senat").toLocaleString("fr-FR")}</strong><span>au Sénat ({nbElus("senat").toLocaleString("fr-FR")} sénateurs)</span></div>
          <div><strong>{nb("europarl").toLocaleString("fr-FR")}</strong><span>au Parlement européen ({nbElus("europarl").toLocaleString("fr-FR")} eurodéputés suivis)</span></div>
        </div>
      ) : (
        <p className="meta">Les effectifs détaillés sont momentanément indisponibles.</p>
      )}

      <h2>Un statut encadré par la loi</h2>
      <p>
        Recrutés par contrat de droit privé par chaque parlementaire employeur, les collaborateurs sont rémunérés
        sur une enveloppe publique dédiée, avec des plafonds d&apos;effectifs et de masse salariale. Chaque élu
        choisit librement comment répartir son enveloppe : un collaborateur unique à temps plein, plusieurs à
        temps partiel, à Paris, en circonscription, ou les deux.
      </p>

      <h2>Que font-ils au quotidien ?</h2>
      <ul>
        <li><strong>Suivi des dossiers</strong> : veille législative, notes d&apos;analyse, amendements ;</li>
        <li><strong>Rédaction</strong> : courriers, questions écrites, discours, communications ;</li>
        <li><strong>Permanence</strong> : relations avec les électeurs et les administrations en circonscription ;</li>
        <li><strong>Agenda et représentation</strong> : déplacements, rendez-vous, événements.</li>
      </ul>
      <p>
        Les fonctions exactes de chaque collaborateur figurent dans les listes officielles : retrouvez-les sur
        les <a href="/parlementaires">fiches parlementaires</a> et le <a href="/lexique">lexique des fonctions</a>.
      </p>

      <h2>Une source officielle, suivie chaque jour</h2>
      <p>
        L&apos;identité des collaborateurs n&apos;est pas une donnée privée : chaque chambre publie ses listes.
        DataParl&apos; les relit chaque matin et signale les <a href="/mouvements">arrivées, départs et transferts</a>.
        La <a href="/methode">méthode</a> et les <a href="/methode/sources">sources</a> sont publiées, les données
        sont sous licence ODbL.
      </p>
      <p className="meta">Source : listes officielles des collaborateurs publiées par l&apos;Assemblée nationale, le Sénat et le Parlement européen, suivies par <a href="/">DataParl&apos;</a>, page générée le {dateFr}.</p>
    </>
  );
}
