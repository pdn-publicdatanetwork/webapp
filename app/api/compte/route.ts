import { NextResponse } from "next/server";
import { logConsent } from "@/lib/consent";
import { authAdmin } from "@/lib/supabaseAdmin";
import { normalizeEmail } from "@/lib/tokens";
import { fournisseurs, utilisateur } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

// GET : profil, méthodes de connexion et réglage des alertes. Le prénom et
// le nom viennent des métadonnées du compte (saisies à la création ou
// modifiées depuis Informations personnelles). `equipe` : membre actif de
// l'équipe (rubriques en préparation réservées).
export async function GET(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const email = normalizeEmail(user.email!);
  const db = authAdmin();
  const [{ data: prefs }, { data: subs }, { data: staff }] = await Promise.all([
    db.from("communication_preferences").select("alertes_enabled, newsletter_enabled, tracking_optout").eq("email", email).maybeSingle(),
    db.from("alert_subscriptions").select("frequence, frequences, chambres, types, groupes, elus, partis, commissions, active, prenom, nom").eq("email", email)
      .order("created_at", { ascending: false }).limit(1),
    db.from("staff").select("role, actif").eq("user_id", user.id).maybeSingle(),
  ]);
  const sub = subs?.[0];
  const meta = (user.user_metadata ?? {}) as { prenom?: string; nom?: string };
  return NextResponse.json({
    email,
    cree_le: user.created_at,
    fournisseurs: fournisseurs(user),
    prenom: meta.prenom ?? sub?.prenom ?? "",
    nom: meta.nom ?? sub?.nom ?? "",
    suivi_optout: prefs?.tracking_optout === true,
    equipe: !!staff?.actif,
    alertes: {
      actives: !!prefs?.alertes_enabled && !!sub?.active,
      frequences: sub && (sub.frequences ?? []).length ? sub.frequences : [sub?.frequence ?? "quotidienne"],
      chambres: sub?.chambres ?? ["assemblee", "senat"],
      types: sub?.types ?? ["arrivee", "depart", "transfert"],
      groupes: sub?.groupes ?? [],
      elus: sub?.elus ?? [],
      partis: sub?.partis ?? [],
      commissions: sub?.commissions ?? [],
      prenom: sub?.prenom ?? "",
      nom: sub?.nom ?? "",
    },
  });
}

// DELETE : suppression du compte et des données liées à l'adresse.
// L'historique des consentements est conservé (preuve, 3 ans), comme annoncé
// dans la politique de données personnelles.
export async function DELETE(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const email = normalizeEmail(user.email!);
  const db = authAdmin();
  await db.from("alert_subscriptions").delete().eq("email", email);
  await db.from("communication_preferences").delete().eq("email", email);
  await db.from("communication_tokens").delete().eq("email", email);
  await db.from("newsletter_subscribers").delete().eq("email", email);
  await db.from("activite_connexions").delete().eq("user_id", user.id);
  await logConsent(email, "account_delete", "compte");
  const { error } = await db.auth.admin.deleteUser(user.id); // supprime aussi profil et clés API (cascade)
  if (error) return NextResponse.json({ error: "suppression impossible, réessaie plus tard" }, { status: 500 });
  return NextResponse.json({ ok: true });
}