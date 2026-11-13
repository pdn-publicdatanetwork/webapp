import type { Metadata } from "next";
import FormulaireEnquete from "./FormulaireEnquete";
import { hashJeton } from "@/lib/mail";
import { authAdmin } from "@/lib/supabaseAdmin";
import "../(site)/contact/dataform.css";
import "./enquete.css";

export const metadata: Metadata = {
  title: "Ton avis sur DataParl'",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Questionnaire « Ton avis sur DataParl' » (survey.dataparl.fr, interface
// DataForm'). Invitation par jeton ?j=… ouvert depuis le site (pop-up après
// quelques minutes de visite, compte connecté) ; réponse unique par jeton.
// v2 (DNS forms.dataparl.fr) : la page déménage sur forms.dataparl.fr/avis.

export default async function Enquete({ searchParams }: { searchParams: Promise<{ j?: string }> }) {
  const j = ((await searchParams).j ?? "").trim();
  let valide = false;
  if (j.length >= 20) {
    const { data } = await authAdmin().from("survey_reponses")
      .select("id, repondu_le").eq("jeton_hash", hashJeton(j)).limit(1);
    const r = data?.[0];
    if (r && !r.repondu_le) valide = true;
    else if (r) return <DejaRepondu />;
  }
  if (valide) return <FormulaireEnquete jeton={j} />;
  return <LienExpire />;
}

function EnteteAvis() {
  return (
    <header className="df-entete">
      <span className="df-logo">Data<span className="df-surligne">Parl&apos;</span></span>
    </header>
  );
}

function PiedAvis() {
  return (
    <footer className="df-footer">
      <a href="https://www.dataparl.fr/informations-legales">Informations légales</a>
      <a href="https://status.dataparl.fr">Statut des services</a>
      <span className="df-copyright">© 2026 DataParl&apos; : le Parlement, pièce par pièce.</span>
    </footer>
  );
}

function DejaRepondu() {
  return (
    <div className="df-zone df-zone-avis">
      <EnteteAvis />
      <main className="df-main">
        <div className="df-center df-stack" style={{ maxWidth: "32rem", margin: "0 auto" }}>
          <div className="df-succes-check">✓</div>
          <h1 className="df-h1" style={{ fontSize: "1.6rem" }}>Merci, c&apos;est <span className="df-surligne">noté</span> !</h1>
          <p className="df-lead">Ce questionnaire a déjà été rempli, votre réponse est enregistrée. Elle sert à régler les priorités : expérience du site, profondeur des données, lisibilité.</p>
          <div className="df-decouvre">
            <a href="https://www.dataparl.fr">Data<span className="df-hl-jaune">Parl&apos;</span></a>
            <a href="https://jobs.dataparl.fr">Data<span className="df-hl-violet">Parl&apos;</span> Jobs</a>
            <a href="https://api.dataparl.fr">Data<span className="df-hl-vert">Parl&apos;</span> API</a>
          </div>
        </div>
      </main>
      <PiedAvis />
    </div>
  );
}

function LienExpire() {
  return (
    <div className="df-zone df-zone-avis">
      <EnteteAvis />
      <main className="df-main">
        <div className="df-center df-stack" style={{ maxWidth: "32rem", margin: "0 auto" }}>
          <h1 className="df-h1">Questionnaire <span className="df-surligne">expiré</span></h1>
          <p className="df-lead">Ce lien n&apos;est plus valable. Il est ouvert depuis le site, après quelques minutes de visite : revenez sur <a href="https://www.dataparl.fr/">www.dataparl.fr</a>, connectez-vous, et il se proposera de nouveau.</p>
        </div>
      </main>
      <PiedAvis />
    </div>
  );
}
