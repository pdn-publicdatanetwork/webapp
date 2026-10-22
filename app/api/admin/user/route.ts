import { avecAdmin, erreur } from "@/lib/adminRoute";
import { authAdmin, dataAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// GET /api/admin/user?id=<uuid> : fiche complète d'un compte — clés API et
// consommation, journal des requêtes API, connexions (IP, appareil), pages
// vues (avec origine et IP), téléchargements Sheets, événements de cycle de
// vie du compte. Le compte est aussi associé à Clarity (tag dp_user_id) :
// ses replays sont filtrables par ce tag dans le dashboard Clarity.
export async function GET(req: Request) {
  return avecAdmin(req, async () => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!UUID.test(id)) return erreur(400, "identifiant invalide");
    const db = authAdmin();

    const { data: user, error: errUser } = await db.auth.admin.getUserById(id);
    if (errUser || !user?.user) return erreur(404, "compte introuvable");
    const u = user.user;
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;

    const { data: cles } = await db.from("api_keys")
      .select("id, nom, prefixe, quota_jour, created_at, last_used_at, revoked_at")
      .eq("user_id", id).order("created_at");
    const ids = (cles ?? []).map((c) => c.id as string);

    const { data: usage } = ids.length
      ? await db.from("api_usage").select("key_id, jour, requetes").in("key_id", ids).order("jour", { ascending: false }).limit(400)
      : { data: [] as { key_id: string; jour: string; requetes: number }[] };
    const { data: journal } = ids.length
      ? await db.from("api_journal")
          .select("id, key_id, journalise_le, endpoint, methode, parametres, ip, user_agent, statut, duree_ms, erreur")
          .in("key_id", ids).order("journalise_le", { ascending: false }).limit(500)
      : { data: [] as Record<string, unknown>[] };
    const { data: connexions } = await db.from("journal_connexions")
      .select("le, ip, user_agent, appareil, fournisseur")
      .eq("user_id", id).order("le", { ascending: false }).limit(200);
    const { data: vues } = await db.from("pages_vues")
      .select("id, chemin, le, ip, origine").eq("user_id", id).order("le", { ascending: false }).limit(500);
    const { data: evenements } = await db.from("audit_comptes")
      .select("evenement, email, created_at_compte, supprime_le, journalise_le")
      .eq("user_id", id).order("journalise_le", { ascending: false }).limit(50);
    const { data: telechargements } = await dataAdmin().from("telechargements")
      .select("feuille, lignes, cree_le, ip").eq("user_id", id).order("cree_le", { ascending: false }).limit(200);

    const totalApi = (usage ?? []).reduce((n, x) => n + (x.requetes ?? 0), 0);
    return {
      compte: {
        id: u.id, email: u.email,
        nom: (meta.full_name as string) ?? (meta.name as string) ?? null,
        cree_le: u.created_at, derniere_connexion: u.last_sign_in_at,
        fournisseurs: (u.identities ?? []).map((i) => i.provider),
      },
      cles: cles ?? [], usage: usage ?? [], journal: journal ?? [], vues: vues ?? [],
      connexions: connexions ?? [], evenements: evenements ?? [], telechargements: telechargements ?? [],
      stats: { requetes_api_total: totalApi, pages_vues: vues?.length ?? 0, telechargements: telechargements?.length ?? 0 },
    };
  }, "comptes");
}