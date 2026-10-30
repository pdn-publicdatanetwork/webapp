import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import Photo from "@/app/_components/Photo";
import { dateLongue, prenomNom } from "@/lib/format";
import { listeGouvernements, mandatsEtCabinets, photoMinistreDe, photosDesPersonnes, type Gouvernement, type PhotoMinistre } from "@/lib/gouvernement";
import {
  LIBELLE_STATUT, libelleRang, ordreRang, periode, rattachementDe, slugMinistre, statutCabinet,
  type MandatMinistre, type MembreCabinet,
} from "@/lib/gouvernementTypes";

// Fraîcheur horaire : le balayage JORF du matin (cron ~07:10 UTC) apparaît
// sur le site dans la journée (avant : 24 h).
export const revalidate = 3600;
type Props = { params: Promise<{ gouv: string }> };

const GRILLE: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 };

const hrefCollabs = (gouvSlug: string, m: MandatMinistre) =>
  "/gouv/" + gouvSlug + "/collabs/" + encodeURIComponent(slugMinistre(m.prenom, m.nom));

function CarteMinistre({ m, equipe, hote, gouvSlug, photo }: {
  m: MandatMinistre; equipe: MembreCabinet[]; hote: MandatMinistre | null; gouvSlug: string; photo?: PhotoMinistre;
}) {
  const nom = prenomNom(m.prenom, m.nom);
  const st = statutCabinet(m.debut, equipe.length);
  return (
    <div className="card" style={{ maxWidth: "none", padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <Photo chambre={photo?.chambre} slug={photo?.slug} src={photo?.photo_url} nom={nom} taille={64} />
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: "1.05em" }}>
          <a href={"/gouv/m/" + encodeURIComponent(m.id)}>{nom}</a>
        </h3>
        <p style={{ margin: "3px 0 0", fontWeight: 600 }}>{m.portefeuille || m.fonction}</p>
        <p className="meta" style={{ margin: "3px 0 0" }}>
          {libelleRang(m.rang)}
          {hote ? ", auprès de " + prenomNom(hote.prenom, hote.nom) : ""}
          {", " + periode(m.debut, m.fin)}
        </p>
        <p style={{ margin: "8px 0 0" }}>
          <a className="btn secondaire" href={hrefCollabs(gouvSlug, m)}>
            {equipe.length > 0 ? "Voir le cabinet (" + equipe.length + ")" : "Voir le cabinet"}
          </a>{" "}
          <span className="meta">{LIBELLE_STATUT[st]}</span>
        </p>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent((await params).gouv).toLowerCase();
  let g: Gouvernement | undefined;
  try {
    const { mandats } = await mandatsEtCabinets();
    g = listeGouvernements(mandats).find((x) => x.slug === slug);
  } catch {
    g = undefined;
  }
  if (!g) return {};
  return {
    title: "Gouvernement " + g.nom + " : les ministres et leurs cabinets",
    description:
      "Composition du gouvernement " + g.nom + " (Premier ministre, ministres, ministres délégués) et, pour chacun, les membres de son cabinet ministériel d'après le Journal officiel.",
    alternates: { canonical: "/gouv/" + g.slug },
  };
}

export default async function PageGouvernement({ params }: Props) {
  const slug = decodeURIComponent((await params).gouv).toLowerCase();
  const { mandats, cabinets } = await mandatsEtCabinets();
  const gouvernements = listeGouvernements(mandats);
  const idx = gouvernements.findIndex((g) => g.slug === slug);
  if (idx === -1) notFound();
  const g = gouvernements[idx];
  const duGouvernement = mandats.filter((m) => m.gouvernement === g.nom);
  const enExercice = idx === 0;
  const affiches = enExercice ? duGouvernement.filter((m) => !m.fin) : duGouvernement;
  const partis = enExercice ? duGouvernement.filter((m) => m.fin) : [];

  const cabinetsParMinistre = new Map<string, MembreCabinet[]>();
  for (const c of cabinets) {
    const l = cabinetsParMinistre.get(c.ministre_id) ?? [];
    l.push(c);
    cabinetsParMinistre.set(c.ministre_id, l);
  }
  const photos = await photosDesPersonnes(duGouvernement.map((m) => m.personne_id ?? ""));
  const photoDe = (m: MandatMinistre): PhotoMinistre | undefined => photoMinistreDe(m, photos);

  const plusAncien = gouvernements[idx + 1] ?? null;
  const plusRecent = gouvernements[idx - 1] ?? null;

  const membresIdentifies = affiches.reduce((n, m) => n + (cabinetsParMinistre.get(m.id)?.length ?? 0), 0);
  const documentes = affiches.filter((m) => (cabinetsParMinistre.get(m.id)?.length ?? 0) > 0).length;

  const pm = affiches.filter((m) => ordreRang(m.rang) === 0).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const ministres = affiches.filter((m) => ordreRang(m.rang) === 1 || ordreRang(m.rang) === 2).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const delegues = affiches.filter((m) => ordreRang(m.rang) >= 3).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  const grille = (liste: MandatMinistre[]) => (
    <div style={GRILLE}>
      {liste.map((m) => (
        <CarteMinistre
          key={m.id}
          m={m}
          equipe={cabinetsParMinistre.get(m.id) ?? []}
          hote={ordreRang(m.rang) >= 3 ? rattachementDe(m, affiches) : null}
          gouvSlug={g.slug}
          photo={photoDe(m)}
        />
      ))}
    </div>
  );

  return (
    <>
      <p className="meta" style={{ marginBottom: 0 }}>
        <a href="/gouv/explorer">Tous les gouvernements depuis 2012</a>
        {", "}ordre protocolaire : Premier ministre, ministres, ministres délégués (ordre alphabétique au sein de chaque rang)
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <h1>Gouvernement {g.nom}{enExercice ? " (en exercice)" : ""}</h1>
        <p className="meta" style={{ margin: 0 }}>
          {plusAncien && <a href={"/gouv/" + plusAncien.slug}>← {plusAncien.nom}</a>}
          {plusAncien && plusRecent && ", "}
          {plusRecent && <a href={"/gouv/" + plusRecent.slug}>{plusRecent.nom} →</a>}
        </p>
      </div>
      <p className="lead">
        {enExercice
          ? "Gouvernement en exercice depuis le " + dateLongue(g.debut) + ", " + affiches.length + " membres en poste."
          : "Gouvernement du " + dateLongue(g.debut) + (g.fin ? " au " + dateLongue(g.fin) : "") + ", " + affiches.length + " membres."}
      </p>
      <p className="meta">
        {documentes} cabinet{documentes > 1 ? "s" : ""} documenté{documentes > 1 ? "s" : ""} sur {affiches.length}, {membresIdentifies} membre{membresIdentifies > 1 ? "s" : ""} de cabinet identifié{membresIdentifies > 1 ? "s" : ""}, source : Journal officiel (DILA).
      </p>

      {pm.length > 0 && (
        <section>
          <h2>Premier ministre</h2>
          {grille(pm)}
        </section>
      )}
      {ministres.length > 0 && (
        <section>
          <h2>Ministres</h2>
          {grille(ministres)}
        </section>
      )}
      {delegues.length > 0 && (
        <section>
          <h2>Ministres délégués et secrétaires d&apos;État</h2>
          {grille(delegues)}
        </section>
      )}

      {partis.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary>
            Changements depuis la formation du gouvernement ({partis.length} mandat{partis.length > 1 ? "s" : ""} terminé{partis.length > 1 ? "s" : ""})
          </summary>
          <div style={{ marginTop: 12 }}>
            {grille([...partis].sort((a, b) => (b.fin ?? b.debut).localeCompare(a.fin ?? a.debut)))}
          </div>
        </details>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "GovernmentOrganization",
            name: "Gouvernement " + g.nom,
            url: "https://www.dataparl.fr/gouv/" + g.slug,
          }).replace(/</g, "\u003c"),
        }}
      />
    </>
  );
}
