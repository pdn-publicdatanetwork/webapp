import type { Metadata } from "next";

// Page de maintenance servie par proxy.ts quand le mode est actif
// (désactivable avec la variable d'environnement MAINTENANCE=0 sur Vercel).
// Style : charte du site (globals.css), aucun JavaScript.

export const metadata: Metadata = {
  title: "Maintenance — DataParl'",
  robots: { index: false, follow: false },
};

export default function Maintenance() {
  return (
    <div className="etroit" style={{ margin: "0 auto" }}>
      <div style={{ fontFamily: "var(--font-spectral), Spectral, Georgia, serif", fontWeight: 700, fontSize: "1.7rem", lineHeight: 1.15, margin: "24px 0 32px" }}>
        Data<span className="surligne">Parl&apos;</span>
      </div>

      <h1><span className="surligne">Maintenance</span> en cours</h1>
      <p className="lead" style={{ marginTop: ".2rem" }}>
        On remet le Parlement, pièce par pièce, au propre.
        DataParl&apos; est momentanément indisponible&nbsp;: le recensement des élus
        et de leurs collaborateurs n&apos;a pas bougé, toutes les données sont intactes
        et le site sera de retour très vite.
      </p>

      <div className="chiffres">
        <div><strong>Mer. 21 oct.</strong><span>Retour prévu le mercredi 21 octobre</span></div>
        <div><strong>100&nbsp;%</strong><span>De vos données conservées</span></div>
        <div><strong>0</strong><span>Mouvement raté&nbsp;: tout sera rattrapé</span></div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1.2rem", margin: ".2rem 0 .4rem" }}>On s&apos;occupe de tout</h2>
        <p className="meta" style={{ margin: 0 }}>
          L&apos;intervention en cours ne touche pas à vos données&nbsp;: comptes, alertes
          et historique seront exactement comme vous les avez laissés au retour du site.
        </p>
        <p className="meta" style={{ margin: 0 }}>
          Une question urgente&nbsp;? Passez par notre{" "}
          <a href="/contact">formulaire de contact</a>, on répond dès que la remise en route est faite.
        </p>
      </div>
    </div>
  );
}
