import { z } from "zod";
import { audit } from "@/lib/adminAuth";
import { avecAdmin, corps, erreur } from "@/lib/adminRoute";
import { authAdmin } from "@/lib/supabaseAdmin";

// Inscriptions « prévenez-moi du retour » collectées sur la page de
// maintenance (table maintenance_prevenus, one-shot : ces adresses ne
// reçoivent que l'email de réouverture).

export const dynamic = "force-dynamic";

const PAGE = 50;

export async function GET(req: Request) {
  return avecAdmin(req, async () => {
    const u = new URL(req.url).searchParams;
    const page = Math.max(Number(u.get("page") ?? 0) || 0, 0);
    const q = (u.get("q") ?? "").trim().toLowerCase().replace(/[%,()*]/g, "");
    let req1 = authAdmin().from("maintenance_prevenus")
      .select("id, email, confirmed, confirmed_at, created_at, notified_at, source", { count: "exact" })
      .order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (q) req1 = req1.ilike("email", `%${q}%`);
    const { data: prevenus, count, error } = await req1;
    if (error) throw error;
    const confirme = (prevenus ?? []).filter((x) => x.confirmed).length;
    return { total: count ?? 0, confirme, page, par_page: PAGE, prevenus: prevenus ?? [] };
  }, "comptes");
}

const Suppression = z.object({ email: z.string().email() });

export async function DELETE(req: Request) {
  return avecAdmin(req, async (a) => {
    const p = Suppression.safeParse(await corps(req));
    if (!p.success) return erreur(400, "requête invalide");
    const email = p.data.email.toLowerCase();
    await authAdmin().from("maintenance_prevenus").delete().eq("email", email);
    await audit(a, "maintenance.prevenu.suppression", email);
    return { ok: true };
  }, "comptes");
}
