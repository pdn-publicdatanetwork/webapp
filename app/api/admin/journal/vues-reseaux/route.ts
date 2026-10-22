import { avecAdmin, erreur } from "@/lib/adminRoute";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Journal des vues des pages WhatsApp/Telegram (table vues_reseaux) :
// horodatage, IP, navigateur, provenance — comptes connectés comme visiteurs
// anonymes. Réservé aux administrateurs (module journal, réservé).
// Filtres facultatifs : ?chemin= (page exacte), ?ip= (adresse exacte).
// Conservation 13 mois (purge automatique dans lib/vuesReseaux.ts).

type Vue = { id: number; chemin: string; ip: string | null; user_agent: string | null; referer: string | null; le: string };

const compter = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((a, x) => { a[x] = (a[x] ?? 0) + 1; return a; }, {}))
  .sort((a, b) => b[1] - a[1]).map(([cle, n]) => ({ cle, n }));

export async function GET(req: Request) {
  return avecAdmin(req, async () => {
    const url = new URL(req.url);
    const chemin = (url.searchParams.get("chemin") ?? "").trim().slice(0, 300);
    const ip = (url.searchParams.get("ip") ?? "").trim().slice(0, 60);

    const db = authAdmin();
    let q = db.from("vues_reseaux")
      .select("id, chemin, ip, user_agent, referer, le", { count: "exact" })
      .order("le", { ascending: false }).limit(500);
    if (chemin) q = q.eq("chemin", chemin);
    if (ip) q = q.eq("ip", ip);

    const { data, count, error } = await q;
    if (error) return erreur(500, "lecture_impossible");
    const vues = (data ?? []) as Vue[];

    return {
      total: count ?? vues.length,
      parJour: compter(vues.map((v) => v.le.slice(0, 10))).slice(0, 30),
      parIp: compter(vues.map((v) => v.ip ?? "").filter(Boolean)).slice(0, 20),
      vues, // les 500 plus récentes (chronologie détaillée)
    };
  }, "journal");
}
