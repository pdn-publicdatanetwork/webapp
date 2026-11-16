import type { Metadata } from "next";
import { prenomNom } from "@/lib/format";
import { analyserFichier, CHAMBRE_DE_CODE, CREDIT, INSTITUTION, MEDIA_BASE, TAILLES, urlLicence } from "@/lib/media";
import { dataQuery } from "@/lib/data";
import { parlementaireDepuisId } from "@/lib/referentiel";
import { hrefGroupe, hrefDepartement, hrefParti, sansGroupe } from "@/lib/collectifs";
import { slugDepartement } from "@/lib/senatoriales";

export const dynamic = "force-dynamic";

const SITE = "https://www.dataparl.fr";

// Page de crédit d'une photo, sur le modèle de Wikimedia Commons : résumé,
// licence, pages de DataParl' qui l'utilisent, métadonnées. Elle s'affiche
// quand l'adresse media.dataparl.fr/<chambre>/<fichier>.png est ouverte
// directement dans un navigateur (réécriture par proxy.ts), et reste
// joignable sur www.dataparl.fr/photo-credit?img=…, adresse canonique que
// les moteurs de recherche indexent.
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ img?: string }> }): Promise<Metadata> {
  const img = (await searchParams).img ?? "";
  const m = /^(an|senat|pe|gouv)\/([^/]+\.png)$/.exec(img);
  const f = m ? analyserFichier(m[2]) : null;
  const valide = !!m && !!f && f.credit === m[1];
  return {
    title: valide ? `Crédit photo : ${m![2]} (${CREDIT[m![1]]})` : "Crédit photo",
    description: valide
      ? `Photo détenue par ${CREDIT[m![1]]}, affichée sur DataParl' : détenteur des droits, conditions de réutilisation et pages qui l'utilisent.`
      : "Crédit photo des images affichées sur DataParl'.",
    alternates: { canonical: `${SITE}/photo-credit?img=${encodeURIComponent(img)}` },
  };
}

export default async function CreditPhoto({ searchParams }: { searchParams: Promise<{ img?: string }> }) {
  const img = (await searchParams).img ?? "";
  const m = /^(an|senat|pe|gouv)\/([^/]+\.png)$/.exec(img);
  const f = m ? analyserFichier(m[2]) : null;
  const valide = !!m && !!f && f.credit === m[1];
  const inst = valide ? INSTITUTION[f!.credit] : null;
  const elu = valide && m![1] !== "gouv" ? await parlementaireDepuisId(f!.id).catch(() => null) : null;
  const fiche = elu && elu.chambre === CHAMBRE_DE_CODE[m![1]] ? elu : null;
  // Membre du Gouvernement : le segment du nom est le profil info.gouv.fr
  // (infogouv_slug) : la fiche correspondante vit sous /gouv/m/<id>.
  const ministre = valide && m![1] === "gouv"
    ? (await dataQuery<{ id: string; prenom: string; nom: string }>("ministres",
        new URLSearchParams({ select: "id,prenom,nom", infogouv_slug: "eq." + f!.id, order: "debut.desc", limit: "1" }), 3600)
      ).rows[0] ?? null
    : null;
  const sujet = fiche ?? ministre;
  const nomSujet = sujet ? prenomNom(sujet.prenom, sujet.nom) : null;
  const licence = valide ? urlLicence(f!.credit) : null;

  // Pages de DataParl' qui affichent cette photo, générées depuis le référentiel.
  const usages: { href: string; label: string }[] = [];
  if (fiche) {
    usages.push({ href: `${SITE}/parlementaires/${encodeURIComponent(fiche.slug)}`, label: `Fiche de ${prenomNom(fiche.prenom, fiche.nom)}` });
    const hrefDept = hrefDepartement(fiche.departement || fiche.circonscription, slugDepartement);
    if (hrefDept) usages.push({ href: SITE + hrefDept, label: `Élus de ${fiche.departement || fiche.circonscription}` });
    if (!sansGroupe(fiche.groupe)) {
      const hrefGrp = hrefGroupe(fiche.chambre, fiche.groupe);
      if (hrefGrp) usages.push({ href: SITE + hrefGrp, label: `Groupe ${fiche.groupe}` });
      const hrefPar = hrefParti(fiche.groupe);
      if (hrefPar) usages.push({ href: SITE + hrefPar, label: `Parti ${fiche.groupe}` });
    }
  }
  if (ministre) usages.push({ href: `${SITE}/gouv/m/${encodeURIComponent(ministre.id)}`, label: `Fiche de ${prenomNom(ministre.prenom, ministre.nom)} (Gouvernement)` });

  const jsonLd = valide ? {
    "@context": "https://schema.org", "@type": "ImageObject",
    contentUrl: `${MEDIA_BASE}/${img}`,
    name: nomSujet ? `Photo officielle de ${nomSujet}` : "Photo officielle",
    creditText: CREDIT[f!.credit],
    copyrightNotice: `© ${CREDIT[f!.credit]}`,
    license: licence ?? undefined,
  } : null;

  return (
    <div className="etroit">
      <h1>Crédit <span className="surligne">photo</span></h1>
      {!valide ? (
        <p className="lead">
          Image inconnue. Le détenteur d&apos;une photo se lit dans le segment du nom de fichier :
          <span className="mono"> _an_</span> (Assemblée nationale), <span className="mono">_senat_</span> (Sénat),
          <span className="mono"> _pe_</span> (Parlement européen) ou <span className="mono">_gouv_</span> (Gouvernement).
        </p>
      ) : (
        <>
          <p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="photo" src={`${MEDIA_BASE}/${img}`} alt={nomSujet ? `Photo officielle de ${nomSujet}` : "Photo officielle"} width={f!.taille} height={f!.taille} style={{ maxWidth: "100%", height: "auto" }} />
          </p>

          <h2 id="summary">Summary</h2>
          <ul>
            <li>Sujet : {nomSujet ? (sujet === fiche ? <a href={`${SITE}/parlementaires/${encodeURIComponent(fiche!.slug)}`}>{nomSujet}</a> : <a href={`${SITE}/gouv/m/${encodeURIComponent(ministre!.id)}`}>{nomSujet}</a>) : "non identifié dans le référentiel"}</li>
            <li>Détenteur de l&apos;image : {inst!.libelle}</li>
            <li>Origine : {fiche?.url_officielle ? <a href={fiche.url_officielle} rel="nofollow noopener">fiche officielle de l&apos;institution</a> : "publication officielle de l'institution"}</li>
          </ul>

          <h2 id="licensing">Licensing</h2>
          <p>
            Cette photo appartient à {inst!.libelle}. Elle est affichée sur DataParl&apos; à titre d&apos;information,
            en basse résolution, recadrée en carré, avec un crédit systématique : © {CREDIT[f!.credit]}. Les
            conditions détaillées sont décrites sur la page{" "}
            {licence && <a href={licence}>Photos et logos : détenteurs et conditions</a>}.
          </p>

          <h2 id="file-usage">File usage on DataParl&apos;</h2>
          {usages.length > 0 ? (
            <ul>
              {usages.map((u) => <li key={u.href}><a href={u.href}>{u.label}</a></li>)}
            </ul>
          ) : (
            <p className="meta">Aucune page du site n&apos;est rattachée à ce fichier.</p>
          )}

          <h2 id="metadata">Metadata</h2>
          <ul>
            <li>Fichier : <span className="mono">{m![2]}</span>. Le segment <span className="mono">_{f!.credit}_</span> du nom indique l&apos;institution détentrice de la photo.</li>
            <li>Format : PNG, {f!.taille} × {f!.taille} pixels (recadrée en carré par DataParl&apos;).</li>
            <li>
              Variantes :{" "}
              {TAILLES.filter((t) => t !== f!.taille).map((t, i) => (
                <span key={t}>{i > 0 && ", "}<a href={`${MEDIA_BASE}/${m![1]}/${f!.id}_${f!.credit}_${t}.png`}>{t} px</a></span>
              ))}
            </li>
          </ul>

          {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />}
        </>
      )}
      <p>
        <a href={`${SITE}/informations-legales/licences/photos`}>Détenteurs et conditions des photos et logos</a>,{" "}
        <a href={`${SITE}/`}>accueil de DataParl&apos;</a>,{" "}
        <a href={`${SITE}/informations-legales/mentions-legales`}>mentions légales</a>
      </p>
    </div>
  );
}
