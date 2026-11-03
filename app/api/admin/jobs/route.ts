import { createHash } from "crypto";
import { z } from "zod";
import { audit } from "@/lib/adminAuth";
import { avecAdmin, EDITION, corps, erreur } from "@/lib/adminRoute";
import { deposerOffre, fileRevue, offresActivesAdmin, offresArchiveesAdmin } from "@/lib/jobsFirestore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return avecAdmin(req, async () => {
    const vue = new URL(req.url).searchParams.get("vue") ?? "revue";
    const offres =
      vue === "actives" ? await offresActivesAdmin() : vue === "archivees" ? await offresArchiveesAdmin() : await fileRevue();
    return { offres };
  }, EDITION);
}

const Soumission = z.object({
  titre: z.string().trim().min(1).max(300),
  description: z.string().max(50000).default(""),
  source_url: z.string().url().max(1000),
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
  source_connector: z.string().max(50).default("manuel"),
  source_raw: z.string().max(100000).optional(),
});

const v = (s: string | undefined) => (!s || !s.trim() ? null : s.trim());

// Empreinte stable : deux fois la même offre (même titre, même source) ne crée
// jamais de doublon, quel que soit le canal d'entrée.

export async function POST(req: Request) {
  return avecAdmin(req, async (a) => {
    const p = Soumission.safeParse(await corps(req));
    if (!p.success) return erreur(400, "requête invalide");
    const d = p.data;
    const empreinte = createHash("sha256").update(d.titre.toLowerCase().replace(/\s+/g, " ").trim() + "|" + d.source_url).digest("hex");
    const resultat = await deposerOffre(
      {
        titre: d.titre,
        description: d.description,
        source_url: d.source_url,
        type_poste: v(d.type_poste),
        localisation: v(d.localisation),
        groupe_politique: v(d.groupe_politique),
        parlementaire_slug: v(d.parlementaire_slug),
        chambre: d.chambre ?? null,
        departement: v(d.departement),
        elu_prenom: v(d.elu_prenom),
        elu_nom: v(d.elu_nom),
        publie_le: v(d.publie_le),
        expire_le: v(d.expire_le),
        statut: "active",
        review_status: "pending",
        source_connector: d.source_connector,
        source_raw: v(d.source_raw),
      },
      empreinte,
    );
    if (resultat === "doublon") return erreur(409, "offre déjà enregistrée (doublon)");
    await audit(a, "jobs.soumission", undefined, { titre: d.titre, source: d.source_connector });
    return { ok: true };
  }, EDITION);
}
