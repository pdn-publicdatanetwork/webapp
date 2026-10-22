import type { Metadata } from "next";
import { CONTACT_URL } from "../maj";

import { HistoriqueTexte, VERSIONS } from "../historique";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegales() {
  return (
    <>
      <h1>Mentions <span className="surligne">légales</span></h1>
      <HistoriqueTexte versions={VERSIONS.mentions} />

      <h2>Éditeur</h2>
      <p>
        DataParl&apos; est édité par une personne physique, à titre personnel et non professionnel. Conformément à
        l&apos;article 6, III, 2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique
        (LCEN), l&apos;éditeur a choisi de ne pas rendre publique son identité ; celle-ci a été communiquée à
        l&apos;hébergeur, qui peut la transmettre sur réquisition judiciaire.
      </p>
      <p>Directeur de la publication : l&apos;éditeur.</p>
      <p>Contact : <a href={CONTACT_URL}>formulaire de contact</a>.</p>

      <h2>Hébergement</h2>
      <p>
        Site : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com).
      </p>
      <p>
        Bases de données et comptes : Supabase Inc. (supabase.com), serveurs situés dans l&apos;Union européenne
        (Irlande).
      </p>

      <h2>Nom de domaine</h2>
      <p>
        Le site est accessible à l&apos;adresse dataparl.fr, enregistrée auprès d&apos;IONOS SE, Elgendorfer Straße 57, 56410 Montabaur, Allemagne.
      </p>
      <p>
        Plusieurs sous-domaines organisent le service : <strong>www.dataparl.fr</strong> (le site public),
        <strong> media.dataparl.fr/sheets</strong> (DataParl&apos; Sheets, le tableur et la recherche dans les bases de
        données), <strong>api.dataparl.fr</strong> (l&apos;API publique et sa documentation) et{" "}
        <strong>media.dataparl.fr</strong> (les photos des élus, voir ci-dessous). Tous sont hébergés dans les
        conditions décrites ci-dessus.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, la charte graphique, le logotype et les visualisations de DataParl&apos; sont protégés par le droit
        de la propriété intellectuelle. Leur reproduction est soumise à autorisation préalable, sauf courte citation
        mentionnant la source.
      </p>
      <p>
        Les données, elles, sont ouvertes : leurs conditions de réutilisation sont décrites sur la page{" "}
        <a href="/informations-legales/licences">Licences et réutilisation</a>.
      </p>

      <h2 id="photos">Photos des élus</h2>
      <p>
        Les portraits des parlementaires sont les photos officielles publiées par les assemblées : © Assemblée nationale pour
        les députés, © Sénat pour les sénateurs, © Union européenne (source : Parlement européen) pour les députés européens.
      </p>
      <p>
        Ils illustrent les fiches à titre d&apos;information et ne sont ni modifiés (hors redimensionnement) ni utilisés à des
        fins publicitaires.
      </p>
      <p>
        Pour faciliter l&apos;accès à ces portraits de manière centralisée, les photos sont regroupées et servies depuis le
        sous-domaine dédié <span className="mono">media.dataparl.fr</span>.
      </p>
      <p>
        Ces images ne sont pas la propriété de DataParl&apos; et restent la propriété exclusive des institutions émettrices.
        Le segment <span className="mono">_crédit_</span> du nom de fichier indique l&apos;institution détentrice de chaque
        photo : <span className="mono">an</span> (Assemblée nationale), <span className="mono">senat</span> (Sénat),{" "}
        <span className="mono">pe</span> (Parlement européen).
      </p>

      <h2>Sources et indépendance</h2>
      <p>
        Les informations publiées proviennent des publications officielles de l&apos;Assemblée nationale, du Sénat et
        du Parlement européen, et de leurs archives. DataParl&apos; n&apos;est affilié à
        aucune de ces institutions, ni à aucun parti, groupe politique ou représentant d&apos;intérêts.
      </p>

      <h2>Signaler une erreur ou un contenu</h2>
      <p>
        Une information inexacte, un contenu illicite ou une demande relative à des données personnelles : l'utilisateur peut passer par le{" "}
        <a href={CONTACT_URL}>formulaire de contact</a>. Voir aussi la page{" "}
        <a href="/informations-legales/confidentialite">Données personnelles</a>.
      </p>
    </>
  );
}
