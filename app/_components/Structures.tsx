import Link from "next/link";
import { slugStructure, type InfoSiren, type Structure } from "@/lib/structures";

// Tableau d'une liste de structures (tiers payants ou prestataires).
// hrefBase : préfixe des fiches détail (/collab/tiers-payants, /collab/prestataires).
export function TableStructures({
  liste,
  siren,
  hrefBase,
}: {
  liste: Structure[];
  siren: Record<string, InfoSiren | null>;
  hrefBase: string;
}) {
  if (liste.length === 0) {
    return <p className="meta">Aucune structure dans cette catégorie pour les eurodéputés français suivis.</p>;
  }
  const avecSiren = Object.values(siren).some(Boolean);
  return (
    <table className="stats">
      <thead>
        <tr>
          <th>Structure</th>
          <th>Eurodéputés clients</th>
          {avecSiren && <th>Forme juridique</th>}
          {avecSiren && <th>SIREN</th>}
        </tr>
      </thead>
      <tbody>
        {liste.map((s) => {
          const info = siren[s.cle];
          return (
            <tr key={s.cle}>
              <td>
                <Link href={hrefBase + "/" + slugStructure(s.nom)}>{s.nom}</Link>
              </td>
              <td>{s.clients.length}</td>
              {avecSiren && <td>{info?.forme_juridique || "inconnue"}</td>}
              {avecSiren && <td>{info?.siren || "non identifiée"}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Carte d'identité SIREN d'une structure (si enrichissement réussi) :
// identification, personnes physiques (dirigeants, bénéficiaires effectifs)
// et liens vers les fichiers publics.
export function CarteSiren({ info }: { info: InfoSiren | null }) {
  if (!info) {
    return (
      <p className="meta">
        Structure non identifiée au registre national des entreprises. L'enrichissement automatique (SIREN, forme
        juridique, dirigeants) s'appuie sur les dénominations publiées par le Parlement européen, qui peuvent
        différer de la raison sociale officielle.
      </p>
    );
  }
  return (
    <div className="card" style={{ maxWidth: "none" }}>
      <p style={{ margin: "0 0 6px" }}>
        <strong>{info.denomination}</strong>
        {info.actif ? <span className="puce">société active</span> : null}
        {info.manuel ? <span className="puce">SIREN vérifié à la main</span> : null}
      </p>
      <p className="meta" style={{ margin: 0 }}>
        {info.forme_juridique ? info.forme_juridique + ", " : ""}SIREN {info.siren}
        {info.adresse ? ", " + info.adresse : ""}
      </p>
      <h3 style={{ margin: "12px 0 4px" }}>Qui dirige la structure ?</h3>
      <p className="meta" style={{ margin: "0 0 6px" }}>
        Dirigeants et bénéficiaires effectifs déclarés au registre national des entreprises pour cette structure,
        qui perçoit les sommes versées par le Parlement européen au titre du contrat de l&apos;eurodéputé
        (rémunération, cotisations ou prestations) :
      </p>
      {info.dirigeants.length > 0 && (
        <p className="meta" style={{ margin: "0 0 4px" }}>
          <strong>Dirigeants :</strong> {info.dirigeants.join(", ")}
        </p>
      )}
      {info.beneficiaires.length > 0 && (
        <p className="meta" style={{ margin: "0 0 4px" }}>
          <strong>Bénéficiaires effectifs :</strong> {info.beneficiaires.join(", ")}
        </p>
      )}
      {info.dirigeants.length === 0 && info.beneficiaires.length === 0 && (
        <p className="meta" style={{ margin: 0 }}>
          Dirigeants et bénéficiaires effectifs non disponibles pour cette société (ajouter la clé PAPPERS_API_KEY
          sur Vercel pour les afficher).
        </p>
      )}
      <p className="meta" style={{ margin: "8px 0 0" }}>
        Fichiers publics :{" "}
        <a href={"https://annuaire-entreprises.data.gouv.fr/recherche?q=" + info.siren}>annuaire des entreprises</a>
        {", "}
        <a href={"https://www.pappers.fr/recherche?q=" + info.siren}>Pappers</a>
        {info.manuel
          ? " : SIREN vérifié manuellement par DataParl'."
          : " : dénomination PE rapprochée automatiquement, à vérifier en cas d'homonymie."}
      </p>
    </div>
  );
}
