import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desinscrire, emailDepuisJeton } from "@/lib/consent";
import { Bouton, Carte, styles } from "@/lib/pagesConsent";

export const metadata: Metadata = { title: "Désinscription", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function valider(formData: FormData) {
  "use server";
  const email = await emailDepuisJeton(String(formData.get("id") ?? ""));
  if (!email) redirect("/desinscription?etat=invalide");
  await desinscrire(email);
  redirect("/desinscription?etat=ok");
}

export default async function Desinscription({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { id, etat } = await searchParams;
  if (etat === "ok") {
    return (
      <Carte titre="Désinscription confirmée">
        <p style={styles.texte}>C'est noté : tu ne recevras plus d'alertes DataParl'.</p>
      </Carte>
    );
  }
  if (etat === "invalide" || !(await emailDepuisJeton(id))) {
    return (
      <Carte titre="Lien expiré">
        <p style={styles.texte}>Ce lien de désinscription n'est plus valable. Utilise celui du dernier email reçu.</p>
      </Carte>
    );
  }
  return (
    <Carte titre="Se désinscrire">
      <p style={styles.texte}>Tu ne recevras plus aucune alerte DataParl'.</p>
      <form action={valider} style={{ margin: "24px 0 0" }}>
        <input type="hidden" name="id" value={id} />
        <Bouton>Confirmer la désinscription</Bouton>
      </form>
    </Carte>
  );
}