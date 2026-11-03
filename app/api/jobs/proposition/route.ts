import { createHash } from "crypto";
import { z } from "zod";
import { utilisateur } from "@/lib/userAuth";
import { domaineAutorise } from "@/lib/jobs";
import { deposerOffre } from "@/lib/jobsFirestore";

export const dynamic = "force-dynamic";

// Dépôt public d'une offre depuis /jobs/proposer, pour les comptes connectés
// dont l'email appartient à un domaine parlementaire (voir lib/jobs.ts).
// L'offre arrive en file de revue (pending) : rien n'est publié sans
// validation humaine dans l'admin.

const Proposition = z.object({
  titre: z.string().trim().min(1).max(300),
  description: z.string().max(50000).default(""),
  source_url: z.string().url().max(1000),
  type_poste: z.string().max(100).optional(),
  localisation: z.string().max(100).optional(),
  groupe_politique: z.string().max(100).optional(),
  chambre: z.enum(["an", "senat", "pe"]).optional(),
  departement: z.string().max(100).optional(),
  elu_prenom: z.string().max(100).optional(),
  elu_nom: z.string().max(100).optional(),
  publie_le: z.string().max(10).optional(),
  expire_le: z.string().max(10).optional(),
});

const v = (s: string | undefined) => (!s || !s.trim() ? null : s.trim());

export async function POST(req: Request) {
  const user = await utilisateur(req);
  if (!user?.email) return Response.json({ erreur: "connexion requise" }, { status: 401 });
  if (!domaineAutorise(user.email))
    return Response.json(
      { erreur: "adresse parlementaire requise (assemblee-nationale.fr, clb-an.fr, senat.fr, clb-senat.fr, europarl.europa.eu, ep.europa.eu, europa.eu)" },
      { status: 403 }
    );
  const p = Proposition.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ erreur: "requête invalide" }, { status: 400 });
  const d = p.data;
  const empreinte = createHash("sha256")
    .update(d.titre.toLowerCase().replace(/\s+/g, " ").trim() + "|" + d.source_url)
    .digest("hex");
  try {
    const resultat = await deposerOffre(
      {
        titre: d.titre,
        description: d.description,
        source_url: d.source_url,
        type_poste: v(d.type_poste),
        localisation: v(d.localisation),
        groupe_politique: v(d.groupe_politique),
        chambre: d.chambre ?? null,
        departement: v(d.departement),
        elu_prenom: v(d.elu_prenom),
        elu_nom: v(d.elu_nom),
        publie_le: v(d.publie_le),
        expire_le: v(d.expire_le),
        statut: "active",
        review_status: "pending",
        source_connector: "proposition",
        review_note: "Proposée depuis le formulaire par " + user.email,
      },
      empreinte,
    );
    if (resultat === "doublon") return Response.json({ erreur: "offre déjà enregistrée (doublon)" }, { status: 409 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ erreur: "erreur d'enregistrement" }, { status: 500 });
  }
}
