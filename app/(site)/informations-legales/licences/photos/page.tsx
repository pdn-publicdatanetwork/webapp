import type { Metadata } from "next";

import { INSTITUTION } from "@/lib/media";

export const metadata: Metadata = {
  title: "Photos et logos : détenteurs et conditions",
  description:
    "Qui détient les photos des élus et les logos affichés sur DataParl', et les conditions de leur affichage : Assemblée nationale, Sénat, Parlement européen, Gouvernement, groupes et partis.",
  alternates: { canonical: "https://www.dataparl.fr/informations-legales/licences/photos" },
};

// Conditions d'affichage des photos et logos utilisés sur DataParl'. Chaque
// image servie par media.dataparl.fr a sa page de crédit
// (www.dataparl.fr/photo-credit?img=…), qui détaille le fichier, son
// détenteur et les pages du site qui l'utilisent, puis renvoie ici, vers la
// section de son institution. Une seule page à maintenir par détenteur.
export default function LicencesPhotos() {
  return (
    <>
      <h1>Photos et <span className="surligne">logos</span> : détenteurs et conditions</h1>
      <p>
        DataParl&apos; n&apos;est pas l&apos;auteur des photos et logos affichés sur le site : ils appartiennent aux
        institutions qui les publient. Le détenteur est identifié dans le nom de chaque fichier (le segment
        <span className="mono"> _an_</span>, <span className="mono">_senat_</span>, <span className="mono">_pe_</span> ou
        <span className="mono"> _gouv_</span>) et sur la page de crédit propre à chaque image. Cette page récapitule,
        pour chaque détenteur, les conditions de réutilisation et la démarche à suivre pour demander une modification
        ou un retrait.
      </p>

      <h2 id="assemblee-nationale">Assemblée nationale</h2>
      <p>
        Les portraits des députés sont les photographies officielles publiées par l&apos;Assemblée nationale sur les
        fiches de ses membres. DataParl&apos; les affiche à titre d&apos;information, en basse résolution, recadrées en
        carré, avec un crédit systématique : © Assemblée nationale. Le droit à l&apos;image de chaque élu relève de
        l&apos;institution, qui publie ces photographies dans le cadre de sa mission d&apos;information.
      </p>
      <p>
        Pour toute demande de modification ou de recadrage, l&apos;accord de l&apos;institution est demandé par mail à
        l&apos;adresse officielle : <a href={`mailto:${INSTITUTION.an.courriel}`}>{INSTITUTION.an.courriel}</a>
        (direction de l&apos;information multimédia).
      </p>

      <h2 id="senat">Sénat</h2>
      <p>
        Les portraits des sénateurs sont les photographies officielles publiées par le Sénat sur les fiches de ses
        membres. DataParl&apos; les affiche à titre d&apos;information, en basse résolution, recadrées en carré, avec un
        crédit systématique : © Sénat.
      </p>
      <p>
        Pour toute demande de modification ou de recadrage, l&apos;accord de l&apos;institution est demandé à
        l&apos;adresse officielle fournie par le Sénat.
      </p>

      <h2 id="parlement-europeen">Parlement européen</h2>
      <p>
        Les portraits des députés européens sont les photographies officielles publiées par le Parlement européen
        (photos MEP). Le Parlement autorise leur reproduction avec mention de la source : DataParl&apos; les affiche à
        titre d&apos;information, en basse résolution, recadrées en carré, avec un crédit systématique :
        © Parlement européen.
      </p>
      <p>
        Pour toute demande de modification ou de recadrage, l&apos;accord de l&apos;institution est demandé à
        l&apos;adresse officielle fournie par le Parlement européen.
      </p>

      <h2 id="gouvernement">Gouvernement</h2>
      <p>
        Les portraits des membres du Gouvernement sont les photographies officielles publiées par info.gouv.fr ; le
        photographe est crédité sur la page d&apos;origine, que la page de crédit de chaque image relit. DataParl&apos;
        les affiche à titre d&apos;information, en basse résolution, recadrées en carré.
      </p>
      <p>
        Pour toute demande de modification ou de recadrage, la démarche passe par le formulaire de contact de
        info.gouv.fr.
      </p>

      <h2 id="logos">Logos et marques</h2>
      <p>
        Les logos des groupes parlementaires, des partis et des chambres (servis par media.dataparl.fr/groupes) sont
        utilisés à titre d&apos;identification des collectifs décrits par DataParl&apos;, en basse résolution. Leur
        reproduction est soumise à la charte de l&apos;institution ou du parti concerné : DataParl&apos; ne concède
        aucun droit sur ces marques. Les logos des groupes de l&apos;Assemblée nationale proviennent de Datan, qui
        les publie par législature ; ceux de certains groupes du Sénat des pages Wikipédia des groupes, en miniature.
      </p>
      <p>
        Pour toute demande concernant un logo, la démarche passe par le formulaire de contact de DataParl&apos;,
        qui transmet vers l&apos;institution ou le parti concerné.
      </p>

      <h2>Crédit de chaque image</h2>
      <p>
        Chaque photo affichée sur le site renvoie à une page de crédit qui détaille son détenteur, les pages de
        DataParl&apos; qui l&apos;utilisent et ses métadonnées (format, dimensions, variantes). Les moteurs de recherche
        reçoivent la même information sous forme structurée, afin que le crédit remonte jusqu&apos;à la recherche
        d&apos;images. Voir aussi la page <a href="/informations-legales/licences">Licences et réutilisation</a> pour les
        données elles-mêmes.
      </p>
    </>
  );
}
