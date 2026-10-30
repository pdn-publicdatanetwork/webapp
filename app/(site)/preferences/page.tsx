import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accuserPreferences, emailDepuisJeton, logConsent } from "@/lib/consent";
import { MAIL_WEB_URL } from "@/lib/env";
import { Bouton, Carte, styles } from "@/lib/pagesConsent";
import { authAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = { title: "Mes préférences", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const CHAMBRES = [
  { v: "assemblee", l: "Assemblée nationale" },
  { v: "senat", l: "Sénat" },
  { v: "europarl", l: "Parlement européen" },
] as const;

// Centre d'opt-ins, accessible par lien signé (sans compte) : alertes
// on/off, fréquences Daily+Weekly cumulables, chambres. Les critères
// avancés (élus suivis, groupes, commissions) restent sur /alertes,
// avec le compte — complémentaire, pas doublon.
async function enregistrer(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const email = await emailDepuisJeton(id);
  if (!email) redirect("/preferences?etat=invalide");
  const actif = formData.get("alertes") === "on";
  // Daily et Weekly sont cumulables ; aucune case cochée avec alertes
  // actives : on garde Daily (l'ancien réglage).
  let frequences = formData.getAll("frequences").map(String).filter((f) => f === "quotidienne" || f === "hebdomadaire") as ("quotidienne" | "hebdomadaire")[];
  if (actif && !frequences.length) frequences = ["quotidienne"];
  const chambres = formData.getAll("chambres").map(String).filter((c) => CHAMBRES.some((x) => x.v === c));
  const db = authAdmin();
  const now = new Date().toISOString();
  await db.from("communication_preferences").upsert({ email, alertes_enabled: actif, updated_at: now });
  const { data: sub } = await db.from("alert_subscriptions").select("id").eq("email", email).order("created_at", { ascending: false }).limit(1);
  const valeurs = { frequence: frequences[0] ?? "quotidienne", frequences, chambres: chambres.length ? chambres : ["assemblee", "senat"], active: actif, updated_at: now };
  if (sub?.length) await db.from("alert_subscriptions").update(valeurs).eq("id", sub[0].id);
  else await db.from("alert_subscriptions").insert({ email, ...valeurs });
  await logConsent(email, actif ? "prefs_update" : "unsubscribe", "alertes");
  // Accusé de réception (comptes@dataparl.fr) ; un échec d'envoi ne doit pas
  // faire échouer l'enregistrement des préférences.
  try {
    await accuserPreferences(email, MAIL_WEB_URL + "/preferences?id=" + encodeURIComponent(id));
  } catch (e) {
    console.error("accusé préférences", e);
  }
  redirect(`/preferences?id=${encodeURIComponent(id)}&etat=ok`);
}

export default async function Preferences({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { id, etat } = await searchParams;
  const email = await emailDepuisJeton(id);
  if (!email || etat === "invalide") {
    return (
      <Carte titre="Lien expiré">
        <p style={styles.texte}>Ce lien de préférences n'est plus valable. Utilise celui du dernier email reçu.</p>
      </Carte>
    );
  }
  const db = authAdmin();
  const [{ data: prefs }, { data: subs }] = await Promise.all([
    db.from("communication_preferences").select("alertes_enabled").eq("email", email).maybeSingle(),
    db.from("alert_subscriptions").select("frequence, frequences, chambres").eq("email", email).order("created_at", { ascending: false }).limit(1),
  ]);
  const sub = subs?.[0] ?? { frequence: "quotidienne", frequences: ["quotidienne"] as ("quotidienne" | "hebdomadaire")[], chambres: ["assemblee", "senat"] };
  const mesFrequences: ("quotidienne" | "hebdomadaire")[] = sub.frequences?.length ? sub.frequences : [sub.frequence];

  return (
    <Carte titre="Mes préférences">
      <p style={styles.meta}>{email}</p>
      {etat === "ok" && <p style={styles.ok}>Préférences enregistrées.</p>}
      <form action={enregistrer}>
        <input type="hidden" name="id" value={id} />
        <label style={{ ...styles.check, marginTop: 20 }}><input type="checkbox" name="alertes" defaultChecked={!!prefs?.alertes_enabled} style={styles.coche} /> Recevoir les alertes</label>
        <label style={styles.libelle}>Fréquences (cumulables)</label>
        <label style={styles.check}>
          <input type="checkbox" name="frequences" value="quotidienne" defaultChecked={mesFrequences.includes("quotidienne")} style={styles.coche} /> DataParl' Daily — chaque jour où il y a du mouvement
        </label>
        <label style={styles.check}>
          <input type="checkbox" name="frequences" value="hebdomadaire" defaultChecked={mesFrequences.includes("hebdomadaire")} style={styles.coche} /> DataParl' Weekly — le récapitulatif du lundi
        </label>
        <label style={styles.libelle}>Chambres suivies</label>
        {CHAMBRES.map((c) => (
          <label key={c.v} style={styles.check}>
            <input type="checkbox" name="chambres" value={c.v} defaultChecked={(sub.chambres as string[]).includes(c.v)} style={styles.coche} /> {c.l}
          </label>
        ))}
        <div style={{ margin: "24px 0 0" }}><Bouton>Enregistrer</Bouton></div>
      </form>
      <p style={{ ...styles.meta, marginTop: 24 }}>Besoin de plus fin (élus suivis, groupes) ? <a href="https://www.dataparl.fr/alertes" style={styles.lien}>Alertes</a> depuis ton compte. <a href={`/desinscription?id=${encodeURIComponent(id!)}`} style={styles.lien}>Me désinscrire</a></p>
    </Carte>
  );
}
