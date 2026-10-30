import type { Metadata } from "next";
import FormulaireEnquete from "./FormulaireEnquete";
import { hashJeton } from "@/lib/mail";
import { authAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = { title: "Ton avis sur DataParl'", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Questionnaire survey.dataparl.fr : 3 notes et un commentaire libre, liés au
// compte qui a ouvert l'invitation (jeton ?j=…). Réponse unique par jeton.
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
  return (
    <div className="etroit" style={{ margin: "0 auto", padding: "48px 20px", maxWidth: 640 }}>
      <p style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "1.3rem", margin: 0 }}>
        Data<span style={{ background: "#FFD23F", padding: "0 3px" }}>Parl&apos;</span>
        <span style={{ color: "#4A5670", fontStyle: "italic", fontWeight: 400 }}>, Ton avis</span>
      </p>
      {!valide ? (
        <>
          <h1>Questionnaire <span className="surligne">expiré</span></h1>
          <p className="lead">Ce lien n&apos;est plus valable. Il est ouvert depuis le site, après quelques minutes de visite : reviens sur <a href="https://www.dataparl.fr/">www.dataparl.fr</a>, connecte-toi, et il se proposera de nouveau.</p>
        </>
      ) : (
        <FormulaireEnquete jeton={j} />
      )}
    </div>
  );
}

function DejaRepondu() {
  return (
    <div className="etroit" style={{ margin: "0 auto", padding: "48px 20px", maxWidth: 640 }}>
      <h1>Merci, c&apos;est <span className="surligne">noté</span> !</h1>
      <p className="lead">Ta réponse est enregistrée. Elle sert à régler les priorités : expérience du site, profondeur des données, lisibilité.</p>
      <p><a className="btn" href="https://www.dataparl.fr/">Retour sur DataParl&apos;</a></p>
    </div>
  );
}
