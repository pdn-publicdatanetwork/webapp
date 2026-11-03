import { z } from "zod";
import { audit } from "@/lib/adminAuth";
import { avecAdmin, EDITION, corps, erreur } from "@/lib/adminRoute";
import { majOffre, supprimerOffre } from "@/lib/jobsFirestore";

export const dynamic = "force-dynamic";

const Maj = z.object({
  decision: z.enum(["valider", "rejeter"]).optional(),
  titre: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(50000).optional(),
  type_poste: z.string().max(100).optional(),
  localisation: z.string().max(100).optional(),
  groupe_politique: z.string().max(100).optional(),
  parlementaire_slug: z.string().max(200).optional(),
  chambre: z.enum(["an", "senat", "pe"]).optional(),
  departement: z.string().max(100).optional(),
  elu_prenom: z.string().max(100).optional(),
  elu_nom: z.string().max(100).optional(),
  publie_le: z.string().max(10).optional(),
  expire_le: z.string().max(10).optional(),
  statut: z.enum(["active", "expiree", "pourvue", "rejetee"]).optional(),
  review_note: z.string().max(2000).optional(),
});

const v = (s: string | undefined) => (!s || !s.trim() ? null : s.trim());

// Validation ou correction d'une offre en revue, et changement de statut
// (pourvue, expirée) des offres publiées.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return avecAdmin(req, async (a) => {
    const { id } = await params;
    const p = Maj.safeParse(await corps(req));
    if (!p.success) return erreur(400, "requête invalide");
    const d = p.data;
    const champs: Record<string, unknown> = {};
    if (d.titre !== undefined) champs.titre = d.titre;
    if (d.description !== undefined) champs.description = d.description;
    for (const k of ["type_poste", "localisation", "groupe_politique", "parlementaire_slug", "departement", "elu_prenom", "elu_nom", "publie_le", "expire_le", "review_note"] as const) {
      if (d[k] !== undefined) champs[k] = v(d[k]);
    }
    if (d.chambre !== undefined) champs.chambre = d.chambre;
    if (d.statut !== undefined) champs.statut = d.statut;
    if (d.decision === "valider") { champs.review_status = "approved"; champs.statut = "active"; }
    if (d.decision === "rejeter") { champs.review_status = "rejected"; champs.statut = "rejetee"; }
    if (Object.keys(champs).length === 0) return erreur(400, "rien à modifier");
    const trouve = await majOffre(id, champs);
    if (!trouve) return erreur(404, "offre introuvable");
    await audit(a, "jobs.maj", id, { decision: d.decision, statut: champs.statut ?? null });
    return { ok: true };
  }, EDITION);
}

// Suppression définitive d'une offre (revue, publiée ou archivée).
// Irréversible : le fingerprint est libéré, donc une annonce supprimée peut
// être recollectée plus tard (c'est voulu ; supprimer n'est pas rejeter :
// rejeter empêche la republication, supprimer efface la trace).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return avecAdmin(req, async (a) => {
    const { id } = await params;
    const titre = await supprimerOffre(id);
    if (titre === null) return erreur(404, "offre introuvable");
    await audit(a, "jobs.suppression", id, { titre });
    return { ok: true };
  }, EDITION);
}
