import { avecAdmin, erreur } from "@/lib/adminRoute";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/admin/anon[?id=<visiteur>] : visites des utilisateurs SANS compte
// (vues_anonymes, consenties, 90 jours). Sans id : la liste des visiteurs
// anonymes (regroupés par identifiant local, pages vues, dernière activité).
// Avec id : le parcours détaillé d'un visiteur.
const VISITEUR = /^[a-z0-9-]{8,40}$/;

export async function GET(req: Request) {
  return avecAdmin(req, async () => {
    const db = authAdmin();
    const id = new URL(req.url).searchParams.get("id") ?? "";

    if (id) {
      if (!VISITEUR.test(id)) return erreur(400, "identifiant invalide");
      const { data: vues, error } = await db.from("vues_anonymes")
        .select("id, chemin, origine, ip, user_agent, le")
        .eq("visiteur", id).order("le", { ascending: false }).limit(1000);
      if (error) throw error;
      return { visiteur: id, vues: vues ?? [] };
    }

    // Dernières 5 000 vues, regroupées côté serveur par visiteur.
    const { data: vues, error } = await db.from("vues_anonymes")
      .select("visiteur, chemin, ip, le").order("le", { ascending: false }).limit(5000);
    if (error) throw error;
    const parVisiteur = new Map<string, { visiteur: string; pages: number; premiere: string; derniere: string; ip: string | null; chemins: string[] }>();
    for (const v of vues ?? []) {
      let e = parVisiteur.get(v.visiteur);
      if (!e) {
        e = { visiteur: v.visiteur, pages: 0, premiere: v.le, derniere: v.le, ip: v.ip, chemins: [] };
        parVisiteur.set(v.visiteur, e);
      }
      e.pages += 1;
      if (v.le < e.premiere) e.premiere = v.le;
      if (!e.chemins.includes(v.chemin) && e.chemins.length < 5) e.chemins.push(v.chemin);
    }
    return { total: parVisiteur.size, visiteurs: [...parVisiteur.values()].sort((a, b) => (a.derniere < b.derniere ? 1 : -1)) };
  }, "comptes");
}