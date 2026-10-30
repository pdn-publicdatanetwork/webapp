import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prenomNom } from "@/lib/format";
import { enPoste, finEffective, periode } from "@/lib/gouvernementTypes";
import { ministresParIds, parcoursCabinet } from "@/lib/gouvernement";
import { collaborateursParId } from "@/lib/referentiel";

// Fraîcheur horaire : le balayage JORF du matin (cron ~07:10 UTC) apparaît
// sur le site dans la journée (avant : 24 h).
export const revalidate = 3600;
type Props = { params: Promise<{ cle: string }> };
const CLE_OK = /^[\p{L}\p{N} ._’-]{1,120}$/u;

// Fiches membres de cabinets indexables : parcours d'après le Journal officiel.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cle = decodeURIComponent((await params).cle).toLowerCase().trim();
  if (!CLE_OK.test(cle)) return {};
  const postes = await parcoursCabinet(cle).catch(() => []);
  if (!postes.length) return {};
  const nom = prenomNom(postes[0].collab_prenom, postes[0].collab_nom);
  return {
    title: nom + " : parcours en cabinet ministériel",
    description: "Parcours de " + nom + " en cabinets ministériels : fonctions, ministres, portefeuilles et périodes, d'après les nominations publiées au Journal officiel.",
    alternates: { canonical: "/gouv/c/" + encodeURIComponent(cle) },
  };
}

export default async function FicheMembreCabinet({ params }: Props) {
  const cle = decodeURIComponent((await params).cle).toLowerCase().trim();
  if (!CLE_OK.test(cle)) notFound();
  const postes = await parcoursCabinet(cle).catch(() => []);
  if (!postes.length) notFound();
  // Personne déjà rapprochée à un collaborateur parlementaire : une seule fiche
  // existe, on y renvoie définitivement (pas de doublon entre les parcours).
  const premierRattache = postes.find((p) => p.collab_id);
  if (premierRattache?.collab_id) {
    const [rattache] = await collaborateursParId([premierRattache.collab_id]).catch(() => []);
    if (rattache) redirect("/collab/" + encodeURIComponent(rattache.slug));
  }
  const ministres = await ministresParIds([...new Set(postes.map((p) => p.ministre_id))]);
  const parId = new Map(ministres.map((m) => [m.id, m]));
  const nom = prenomNom(postes[0].collab_prenom, postes[0].collab_nom);
  const nMinistres = new Set(postes.map((p) => p.ministre_id)).size;
  const rapproche = postes.some((p) => p.collab_id);
  // Un poste est « en cours » seulement si ni le JORF ni la fin du mandat n'y ont mis un terme.
  const dernier = postes[postes.length - 1];
  const ministreDernier = parId.get(dernier.ministre_id);
  const encoreEnPoste = enPoste(dernier.fin, ministreDernier?.fin ?? null);
  const debut = postes[0].debut;
  const finDernier = finEffective(dernier.fin, ministreDernier?.fin ?? null);

  return (
    <>
      <p className="meta" style={{ marginBottom: 0 }}>
        {postes.length} poste{postes.length > 1 ? "s" : ""} en cabinet ministériel, {nMinistres} ministre{nMinistres > 1 ? "s" : ""},{" "}
        <a href="/gouv/explorer">tous les gouvernements</a>
      </p>
      <h1>{nom}</h1>
      <p className="lead">
        Parcours en cabinet ministériel d&apos;après les nominations publiées au Journal officiel
        {debut ? ", depuis " + debut.slice(0, 4) : ""}
        {encoreEnPoste ? ", en poste à ce jour." : finDernier ? ", jusqu'en " + finDernier.slice(0, 4) + " au moins." : "."}
      </p>

      {rapproche && (
        <p className="card" style={{ maxWidth: "none" }}>
          {nom} est aussi <a href={"/collab/k/" + encodeURIComponent(cle)}>collaborateur parlementaire</a> :{" "}
          une fiche unique réunit ses deux parcours.
        </p>
      )}

      <h2>Parcours</h2>
      <ul className="gouvernement">
        {postes.map((p) => {
          const m = parId.get(p.ministre_id);
          return (
            <li key={p.id}>
              {p.fonction || "Membre de cabinet"} au cabinet de{" "}
              {m ? <a href={"/gouv/m/" + encodeURIComponent(m.id)}>{prenomNom(m.prenom, m.nom)}</a> : "ministre inconnu"}
              <span className="meta">
                {" (" + (m ? (m.portefeuille || m.fonction) + ", " + m.gouvernement + ", " : "") + periode(p.debut, finEffective(p.fin, m?.fin ?? null)) + ")"}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="meta" style={{ marginTop: 32 }}>
        Fiche établie par rapprochement du nom : deux personnes homonymes peuvent être confondues. Les postes sans cessation
        publiée au JORF sont close à la fin du mandat du ministre. Pour faire rectifier ou masquer une information :{" "}
        <a href="/contact?sujet=rgpd">formulaire de contact</a>.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: nom,
            url: "https://www.dataparl.fr/gouv/c/" + cle,
            hasOccupation: postes.map((p) => ({
              "@type": "Occupation",
              name: p.fonction,
              occupationLocation: "France",
            })),
          }),
        }}
      />
    </>
  );
}
