import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Photo from "@/app/_components/Photo";
import { prenomNom } from "@/lib/format";
import { ORDRE_FONCTION, categorieFonction, finEffective, periode, slugGouvernement, type MembreCabinet } from "@/lib/gouvernementTypes";
import { autresMandats, cabinetsDuMinistre, ficheMinistre, ficheParlementaireDe, photoMinistreDe, photosDesPersonnes } from "@/lib/gouvernement";
import { photoAbsolue } from "@/lib/media";
import { collaborateursParId } from "@/lib/referentiel";

// Fraîcheur horaire : le balayage JORF du matin (cron ~07:10 UTC) apparaît
// sur le site dans la journée (avant : 24 h).
export const revalidate = 3600;
type Props = { params: Promise<{ id: string }> };
const ID_OK = /^[A-Za-z0-9._-]{1,80}$/;

// Fiches ministres indexables : mandats et cabinets publiés au Journal officiel.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  if (!ID_OK.test(id)) return {};
  const m = await ficheMinistre(id).catch(() => null);
  if (!m) return {};
  const nom = prenomNom(m.prenom, m.nom);
  // Photo en aperçu : photo officielle info.gouv.fr (media.dataparl.fr/gouv/<slug>_gouv_400.png),
  // sinon repli sur la photo parlementaire de la personne, même logique que la fiche elle-même.
  // Carte « summary » (carrée) comme les fiches parlementaires.
  const photos = await photosDesPersonnes([m.personne_id ?? ""]);
  const photoObj = photoMinistreDe(m, photos);
  const photo = photoObj?.chambre && photoObj?.slug ? photoAbsolue(photoObj.chambre, photoObj.slug, 400) : null;
  const description = "Mandats de " + nom + " (" + (m.portefeuille || m.fonction) + ", gouvernement " + m.gouvernement + ") et composition de son cabinet ministériel d'après le Journal officiel.";
  return {
    title: nom + " : ministre, portefeuille et cabinet",
    description,
    alternates: { canonical: "/gouv/m/" + encodeURIComponent(m.id) },
    openGraph: { siteName: "DataParl'", title: nom + " : ministre, portefeuille et cabinet", description, type: "profile", images: photo ? [{ url: photo, width: 400, height: 400, alt: "Photo officielle de " + nom }] : undefined },
    twitter: { card: photo ? "summary" : "summary_large_image", title: nom + ", DataParl'", description, images: photo ? [photo] : undefined },
  };
}

export default async function FicheMinistre({ params }: Props) {
  const id = decodeURIComponent((await params).id);
  if (!ID_OK.test(id)) notFound();
  const m = await ficheMinistre(id).catch(() => null);
  if (!m) notFound();
  const [cabinets, mandats] = await Promise.all([cabinetsDuMinistre(m.id), autresMandats(m)]);
  const photos = await photosDesPersonnes([m.personne_id ?? ""]);
  const photo = photoMinistreDe(m, photos);
  const fiche = await ficheParlementaireDe(m.personne_id).catch(() => null);
  // Un membre rapproché à un collaborateur parlementaire pointe vers sa fiche
  // unique /collab/<slug> ; les autres vers la fiche de cabinet (anti-doublons).
  const slugCollab = new Map<string, string>();
  const idsCollab = [...new Set(cabinets.map((c) => c.collab_id).filter((x): x is string => !!x))];
  if (idsCollab.length) {
    for (const x of await collaborateursParId(idsCollab).catch(() => [])) slugCollab.set(x.collab_id, x.slug);
  }
  const hrefMembre = (c: MembreCabinet) => {
    const s = c.collab_id ? slugCollab.get(c.collab_id) : undefined;
    return s ? "/collab/" + encodeURIComponent(s) : "/gouv/c/" + encodeURIComponent(c.collab_cle);
  };
  // Le cabinet d'abord par rang (direction, chefferie, conseillers), puis par nom.
  const equipe = [...cabinets].sort(
    (a, b) =>
      ORDRE_FONCTION[categorieFonction(a.fonction)] - ORDRE_FONCTION[categorieFonction(b.fonction)] ||
      a.collab_nom.localeCompare(b.collab_nom, "fr"),
  );
  const nom = prenomNom(m.prenom, m.nom);

  return (
    <>
      <p className="meta" style={{ marginBottom: 0 }}>
        {m.gouvernement ? (
          <>
            <a href={"/gouv/" + slugGouvernement(m.gouvernement)}>{m.gouvernement}</a>,{" "}
          </>
        ) : null}
        <a href="/gouv/explorer">tous les gouvernements</a>
      </p>
      <div className="entete-elu">
        <Photo chambre={photo?.chambre} slug={photo?.slug} src={photo?.photo_url} nom={nom} />
        <div>
          <h1 style={{ margin: "2px 0 6px" }}>{nom}</h1>
          <p className="lead" style={{ margin: 0 }}>
            {(m.portefeuille || m.fonction || "Ministre") + ", " + periode(m.debut, m.fin) + ", au sein du gouvernement " + m.gouvernement + "."}
          </p>
          {fiche && (
            <p className="meta" style={{ margin: "6px 0 0" }}>
              <a href={"/parlementaires/" + encodeURIComponent(fiche.slug)}>Fiche parlementaire de {prenomNom(fiche.prenom, fiche.nom)}</a>
            </p>
          )}
        </div>
      </div>

      <h2>Cabinet ministériel</h2>
      {equipe.length === 0 ? (
        <p className="meta">
          Aucune nomination identifiée au JORF pour ce mandat : cabinet non documenté, pas nécessairement inexistant
          (le recensement est en cours pour les mandats récents).
        </p>
      ) : (
        <ul>
          {equipe.map((c) => (
            <li key={c.id}>
              <a href={hrefMembre(c)}>{prenomNom(c.collab_prenom, c.collab_nom)}</a>{" "}
              <span className="meta">{", " + c.fonction + ", " + periode(c.debut, finEffective(c.fin, m.fin))}</span>
            </li>
          ))}
        </ul>
      )}

      {mandats.length > 1 && (
        <>
          <h2>Tous les mandats de {nom}</h2>
          <ul className="gouvernement">
            {mandats.map((x) => (
              <li key={x.id}>
                {x.id === m.id ? (
                  <strong>{x.portefeuille || x.fonction}</strong>
                ) : (
                  <a href={"/gouv/m/" + encodeURIComponent(x.id)}>{x.portefeuille || x.fonction}</a>
                )}
                <span className="meta">{", " + x.gouvernement + ", " + periode(x.debut, x.fin)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="meta" style={{ marginTop: 32 }}>
        Fiche établie d&apos;après les nominations publiées au Journal officiel (DILA). Pour faire rectifier ou masquer une information :{" "}
        <a href="/contact?sujet=rgpd">formulaire de contact</a>.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: nom,
            jobTitle: m.portefeuille || m.fonction || "Ministre",
            url: "https://www.dataparl.fr/gouv/m/" + m.id,
          }),
        }}
      />
    </>
  );
}
