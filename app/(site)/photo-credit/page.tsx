import type { Metadata } from "next";
import { prenomNom } from "@/lib/format";
import { analyserFichier, CHAMBRE_DE_CODE, INSTITUTION, MEDIA_BASE } from "@/lib/media";
import { dataQuery } from "@/lib/data";
import { parlementaireDepuisId } from "@/lib/referentiel";

export const metadata: Metadata = { title: "Crédit photo", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SITE = "https://www.dataparl.fr";

// Page de crédit d'une photo, affichée quand son adresse media.dataparl.fr est
// ouverte directement dans un navigateur (réécriture par proxy.ts).
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
  return (
    <div className="etroit">
      <h1>Crédit <span className="surligne">photo</span></h1>
      {valide && (
        <p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="photo" src={`${MEDIA_BASE}/${img}`} alt={fiche || ministre ? `Photo officielle de ${prenomNom((fiche ?? ministre)!.prenom, (fiche ?? ministre)!.nom)}` : "Photo officielle"} width={f!.taille} height={f!.taille} style={{ maxWidth: "100%", height: "auto" }} />
        </p>
      )}
      <p className="lead">
        Source : {inst ? inst.libelle : "l'institution d'origine"}.
        {inst && <> Pour toute demande spécifique de modification ou de recadrage, vous devez envoyer un mail de demande d&apos;accord à
          l&apos;adresse officielle fournie par l&apos;institution : {inst.courriel ? <a href={`mailto:${inst.courriel}`}>{inst.courriel}</a> : inst.contact}.</>}
      </p>
      {valide && <p className="meta">Fichier : <span className="mono">{m![2]}</span>. Le segment <span className="mono">_{f!.credit}_</span> du nom indique l&apos;institution détentrice de la photo.</p>}
      <p>
        {fiche && <><a href={`${SITE}/parlementaires/${encodeURIComponent(fiche.slug)}`}>Voir la fiche de {prenomNom(fiche.prenom, fiche.nom)}</a>, </>}
        {ministre && <><a href={`${SITE}/gouv/m/${encodeURIComponent(ministre.id)}`}>Voir la fiche de {prenomNom(ministre.prenom, ministre.nom)}</a>, </>}
        <a href={`${SITE}/`}>Accueil de DataParl&apos;</a>, <a href={`${SITE}/informations-legales/mentions-legales`}>Mentions légales</a>
      </p>
    </div>
  );
}
