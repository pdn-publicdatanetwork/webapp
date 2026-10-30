import { NextResponse } from "next/server";
import { audit, checkAdmin, refus } from "@/lib/adminAuth";
import { deciderManuellement } from "@/lib/association";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Revue des associations de fiches : la file « à traiter » (contrôle non
// concluant) et les décisions manuelles valider/refuser/dissocier.
// Page admin : /admin/users/matchprofile. Module « comptes » requis.

const ACTIONS = ["valider", "refuser", "dissocier"] as const;

export async function GET(req: Request) {
  const a = await checkAdmin(req);
  if (!a.ok) return refus(a);
  if (!a.modules.includes("comptes")) return NextResponse.json({ error: "accès refusé" }, { status: 403 });
  const db = authAdmin();
  const { data: demandes } = await db.from("associations_fiches")
    .select("id, user_id, collab_slug, collab_id, statut, echecs, gel_jusqu_a, expire_le, verifie_par, verifie_le, cree_le")
    .in("statut", ["attente_email", "a_traiter", "verifie", "gele", "refuse"])
    .order("cree_le", { ascending: false }).limit(200);
  const userIds = [...new Set((demandes ?? []).map((d: any) => d.user_id))];
  const { data: comptes } = userIds.length
    ? await db.from("comptes_utilisateurs").select("user_id, email").in("user_id", userIds)
    : { data: null };
  const emails = new Map((comptes ?? []).map((c: any) => [c.user_id, c.email]));
  return NextResponse.json({
    demandes: (demandes ?? []).map((d: any) => ({
      ...d,
      email: emails.get(d.user_id) ?? null,
      // Le résultat des contrôles serveur n'est jamais exposé hors admin.
    })),
  });
}

export async function POST(req: Request) {
  const a = await checkAdmin(req);
  if (!a.ok) return refus(a);
  if (!a.modules.includes("comptes")) return NextResponse.json({ error: "accès refusé" }, { status: 403 });
  const { id, action } = await req.json().catch(() => ({}));
  if (!id || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "paramètres invalides" }, { status: 400 });
  }
  const r = await deciderManuellement(a, id, action);
  if (!r.ok) return NextResponse.json({ error: r.error ?? "erreur" }, { status: 400 });
  await audit(a, "association." + action, id);
  return NextResponse.json({ ok: true });
}
