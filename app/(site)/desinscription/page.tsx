import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accuserPreferences, desinscrire, emailDepuisJeton, logConsent } from "@/lib/consent";
import { MAIL_WEB_URL } from "@/lib/env";
import { Bouton, Carte, styles } from "@/lib/pagesConsent";
import { authAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = { title: "Mes communications", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Gestion fine : couper une à une les communications, ou tout arrêter.
// Chaque action journalise le consentement et confirme par e-mail.
async function couperAlertes(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const email = await emailDepuisJeton(id);
  if (!email) redirect("/desinscription?etat=invalide");
  const db = authAdmin();
  const now = new Date().toISOString();
  await db.from("communication_preferences").upsert({ email, alertes_enabled: false, updated_at: now });
  await db.from("alert_subscriptions").update({ active: false, updated_at: now }).eq("email", email);
  await logConsent(email, "unsubscribe", "alertes");
  try {
    await accuserPreferences(email, MAIL_WEB_URL + "/preferences?id=" + encodeURIComponent(id));
  } catch (e) {
    console.error("accusé préférences", e);
  }
  redirect(`/desinscription?id=${encodeURIComponent(id)}&etat=ok&type=alertes`);
}

async function couperNewsletter(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const email = await emailDepuisJeton(id);
  if (!email) redirect("/desinscription?etat=invalide");
  const db = authAdmin();
  const now = new Date().toISOString();
  await db.from("communication_preferences").upsert({ email, newsletter_enabled: false, updated_at: now });
  await db.from("newsletter_subscribers").update({ unsubscribed_at: now }).eq("email", email);
  await logConsent(email, "unsubscribe", "newsletter");
  try {
    await accuserPreferences(email, MAIL_WEB_URL + "/preferences?id=" + encodeURIComponent(id));
  } catch (e) {
    console.error("accusé préférences", e);
  }
  redirect(`/desinscription?id=${encodeURIComponent(id)}&etat=ok&type=newsletter`);
}

async function toutArreter(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const email = await emailDepuisJeton(id);
  if (!email) redirect("/desinscription?etat=invalide");
  await desinscrire(email); // journalise + accusé dédié « Désinscription confirmée »
  redirect(`/desinscription?id=${encodeURIComponent(id)}&etat=ok`);
}

export default async function Desinscription({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { id, etat, type } = await searchParams;
  if (etat === "ok") {
    const message = type === "alertes"
      ? "C'est noté : tu ne recevras plus les alertes. La newsletter et les autres messages continuent."
      : type === "newsletter"
        ? "C'est noté : tu ne recevras plus la newsletter. Tes alertes continuent."
        : "C'est noté : tu ne recevras plus rien de DataParl'.";
    return (
      <Carte titre="C'est noté">
        <p style={styles.texte}>{message}</p>
      </Carte>
    );
  }
  if (etat === "invalide" || !(await emailDepuisJeton(id))) {
    return (
      <Carte titre="Lien expiré">
        <p style={styles.texte}>Ce lien n'est plus valable. Utilise celui du dernier email reçu.</p>
      </Carte>
    );
  }
  return (
    <Carte titre="Mes communications">
      <p style={styles.texte}>Choisis ce que tu veux arrêter, tout ou une seule communication :</p>
      <form action={toutArreter} style={{ margin: "24px 0 8px" }}>
        <input type="hidden" name="id" value={id} />
        <Bouton>Tout arrêter</Bouton>
      </form>
      <form action={couperAlertes} style={{ margin: "8px 0" }}>
        <input type="hidden" name="id" value={id} />
        <Bouton>Arrêter les alertes seulement</Bouton>
      </form>
      <form action={couperNewsletter} style={{ margin: "8px 0" }}>
        <input type="hidden" name="id" value={id} />
        <Bouton>Arrêter la newsletter seulement</Bouton>
      </form>
      <p style={{ ...styles.meta, marginTop: 16 }}>Pour régler finement (fréquences, chambres) : <a href={`/preferences?id=${encodeURIComponent(id!)}`} style={styles.lien}>Mes préférences</a></p>
    </Carte>
  );
}
