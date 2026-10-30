import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { inscrireWa, lienDesinscriptionWa, normaliserTel } from "@/lib/wa";

export const metadata: Metadata = {
  title: "Recevoir le DataParl' Daily par WhatsApp",
  alternates: { canonical: "/daily/wa" },
};
export const dynamic = "force-dynamic";

// Inscription au DataParl' Daily par WhatsApp : saisie du numéro mobile,
// opt-in explicite (pas d'inscription à la place de quelqu'un d'autre).
// Après validation, le lien de désinscription un clic est affiché une seule
// fois : il n'est pas renvoyé (seul son hash est conservé).

async function inscrire(formData: FormData) {
  "use server";
  const tel = normaliserTel(String(formData.get("tel") ?? ""));
  const optin = formData.get("optin") === "on";
  if (!tel || !optin) redirect("/daily/wa?etat=invalide");
  try {
    const jeton = await inscrireWa(tel);
    redirect(`/daily/wa?etat=ok&jeton=${encodeURIComponent(jeton)}`);
  } catch {
    redirect("/daily/wa?etat=erreur");
  }
}

export default async function DailyWa({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { etat, jeton } = await searchParams;

  if (etat === "ok") {
    const lien = jeton ? lienDesinscriptionWa(jeton) : null;
    return (
      <div className="card">
        <h1>C’est noté ✨</h1>
        <p>
          Tu recevras le DataParl’ Daily par WhatsApp dès la prochaine édition
          (chaque matin, vers 7h45). S’il n’y a aucun mouvement, aucun message.
        </p>
        {lien && (
          <>
            <p>
              <strong>Conserve ce lien de désinscription</strong> : il ne sera
              pas renvoyé :
            </p>
            <p><a href={lien} style={{ wordBreak: "break-all" }}>{lien}</a></p>
            <p className="note">
              Un clic puis « Confirmer » suffit pour ne plus rien recevoir.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Le DataParl’ Daily par WhatsApp</h1>
      <p>
        Chaque matin vers 7h45, le récapitulatif des mouvements de
        collaborateurs parlementaires (arrivées, départs, transferts)
        directement sur ton WhatsApp. Gratuit, sans compte, désinscription en
        un clic.
      </p>
      {etat === "invalide" && (
        <p className="erreur">Numéro mobile français requis (06 ou 07) et case d’acceptation cochée.</p>
      )}
      {etat === "erreur" && (
        <p className="erreur">Inscription impossible pour le moment. Réessaie dans un instant.</p>
      )}
      <form action={inscrire}>
        <label htmlFor="tel">Numéro de mobile</label>
        <input
          id="tel" name="tel" type="tel" inputMode="tel" autoComplete="tel"
          placeholder="06 12 34 56 78" required
        />
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 400, marginTop: 14 }}>
          <input type="checkbox" name="optin" required style={{ marginTop: 4 }} />
          <span>
            J’accepte de recevoir le DataParl’ Daily par WhatsApp et les{" "}
            <a href="/informations-legales/confidentialite">CGU DataParl’</a>.
            Mon numéro est utilisé uniquement pour cet envoi et n’est jamais
            transmis à des tiers ; je peux me désinscrire à tout moment.
          </span>
        </label>
        <button type="submit">Recevoir le Daily</button>
      </form>
      <p className="note">
        Après la première édition, tu peux répondre « STOP » à n’importe
        quel message pour être retiré de la liste. Les données diffusées sont
        celles du <a href="/daily">Daily</a> (ODbL).
      </p>
    </div>
  );
}
