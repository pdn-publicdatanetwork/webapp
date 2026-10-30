import type { Metadata } from "next";
import { aujourdhuiParis } from "@/lib/alertes";
import { dateLongue } from "@/lib/format";
import { compteAffectations } from "@/lib/data";
import { tousLesParlementaires, type EluCompact } from "@/lib/referentiel";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Combien de collaborateurs a un député ou un sénateur ?",
  description: "Effectifs datés des équipes parlementaires : nombre de collaborateurs par député et par sénateur, moyennes réelles par chambre.",
  alternates: { canonical: "/questions/combien-de-collaborateurs" },
};

const NOM_CHAMBRE = { assemblee: "à l'Assemblée nationale", senat: "au Sénat", europarl: "au Parlement européen" } as const;

export default async function Page() {
  const dateFr = dateLongue(aujourdhuiParis());
  let comptes: Record<string, number> = {};
  let elus: EluCompact[] = [];
  try { [comptes, elus] = await Promise.all([compteAffectations(), tousLesParlementaires()]); } catch {}
  const actifs = elus.filter((e) => e.a);
  const chambres = (["assemblee", "senat", "europarl"] as const)
    .map((c) => ({ c, collabs: comptes[c] ?? 0, effectif: actifs.filter((e) => e.c === c).length }))
    .filter((x) => x.effectif > 0);
  const dispo = chambres.some((x) => x.collabs > 0);
  const moyenne = (x: { collabs: number; effectif: number }) => x.effectif ? Math.round((x.collabs / x.effectif) * 10) / 10 : 0;
  const reponse = dispo
    ? `En date du ${dateFr}, les équipes réelles vont d'un collaborateur unique au plafond de cinq pour les élus aux responsabilités. En moyenne : ${chambres.filter((x) => x.collabs > 0).map((x) => `${moyenne(x).toLocaleString("fr-FR")} collaborateurs par parlementaire ${NOM_CHAMBRE[x.c]}`).join(", ")}.`
    : "Chaque parlementaire français dispose d'une enveloppe lui permettant de recruter jusqu'à cinq collaborateurs en moyenne, répartis entre Paris et la circonscription.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Combien de collaborateurs a un député ou un sénateur ?", acceptedAnswer: { "@type": "Answer", text: reponse } },
      { "@type": "Question", name: "Quel est le plafond de collaborateurs par parlementaire ?", acceptedAnswer: { "@type": "Answer", text: "L'Assemblée nationale, le Sénat et le Parlement européen fixent chacun un plafond d'effectifs par parlementaire (jusqu'à cinq collaborateurs, dans la limite de l'enveloppe de masse salariale). Chaque élu répartit librement son enveloppe : un collaborateur à temps plein, plusieurs à temps partiel, à Paris ou en circonscription." } },
      { "@type": "Question", name: "Tous les parlementaires ont-ils des collaborateurs ?", acceptedAnswer: { "@type": "Answer", text: "La quasi-totalité des parlementaires emploient au moins un collaborateur. Certains n'en emploient aucun, d'autres atteignent le plafond : les présidents de groupe, questeurs ou responsables de commissions ont les équipes les plus étoffées. DataParl' publie la composition exacte de chaque équipe sur la fiche de chaque élu." } },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
      <p className="meta"><a href="/questions">&larr; Toutes les études</a></p>
      <h1>Combien de collaborateurs a un député ou un sénateur&nbsp;?</h1>
      <p className="lead">{reponse}</p>

      <h2>Les effectifs réels en date du {dateFr}</h2>
      {dispo ? (
        <div className="chiffres">
          {chambres.filter((x) => x.collabs > 0).map((x) => (
            <div key={x.c}>
              <strong>{moyenne(x).toLocaleString("fr-FR")}</strong>
              <span>collaborateurs par parlementaire {NOM_CHAMBRE[x.c]} ({x.collabs.toLocaleString("fr-FR")} pour {x.effectif.toLocaleString("fr-FR")} élus suivis)</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="meta">Les effectifs détaillés sont momentanément indisponibles.</p>
      )}

      <h2>Des plafonds, pas des obligations</h2>
      <p>
        Les crédits collaborateurs sont plafonnés : chaque chambre fixe un maximum d&apos;effectifs et une masse
        salariale par parlementaire. Dans cette limite, chaque élu choisit librement : un collaborateur unique à
        temps plein, deux ou trois à temps partiel, un poste à Paris et un autre en circonscription : c&apos;est la
        répartition la plus courante.
      </p>
      <p>
        Les équipes les plus étoffées se trouvent chez les élus à responsabilité : présidents de groupe,
        questeurs, présidents de commission. Le <a href="/vigiparl/an/parlementaires">classement VigiParl&apos;</a> montre
        en revanche que la taille ne dit rien du renouvellement : certaines équipes d&apos;un seul collaborateur
        tournent plus vite que des équipes de cinq.
      </p>

      <h2>Voir les équipes réelles, élu par élu</h2>
      <p>
        La composition exacte de chaque équipe, avec les fonctions et les dates, est publiée et mise à jour :
        <a href="/parlementaires">fiches parlementaires</a>, ou <a href="/collab">recherche par collaborateur</a>.
        Les moyennes par groupe et par parti sont sur <a href="/mixiparl">MixiParl&apos;</a>.
      </p>
      <p className="meta">Source : listes officielles des collaborateurs publiées par l&apos;Assemblée nationale, le Sénat et le Parlement européen, suivies par <a href="/">DataParl&apos;</a>, page générée le {dateFr}.</p>
    </>
  );
}
