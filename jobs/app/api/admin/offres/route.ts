
import { fileRevue, offresActivesAdmin, offresArchiveesAdmin, deciderOffre, type Offre } from "@/lib/firestore";

export const dynamic = "force-dynamic";

// Back-office DataParl' : accès réservé à l'équipe (compte @dataparl.fr).
// Limite connue (identique au reste du site) : le compte vient du client ;
// la vérification serveur de la session Supabase reste à brancher.

// Comptes autorisés : le compte admin de DataParl' (table staff, seul membre
// theo@dataparl.fr). Variable optionnelle ADMIN_JOBS_EMAILS (séparée par des
// virgules) pour ajouter d'autres comptes sans redéployer le code.
const AUTORISES = (process.env.ADMIN_JOBS_EMAILS ?? "theo@dataparl.fr")
  .split(",")
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);
const EQUIPE = (compte: string) => AUTORISES.includes(compte.trim().toLowerCase());

const reduire = (o: Offre) => ({
  fingerprint: String(o.fingerprint ?? ""),
  id: String(o.id ?? ""),
  titre: String(o.titre ?? ""),
  elu: [o.elu_prenom, o.elu_nom].filter(Boolean).join(" "),
  chambre: String(o.chambre ?? ""),
  type_poste: String(o.type_poste ?? ""),
  localisation: String(o.localisation ?? ""),
  salaire: String(o.salaire ?? ""),
  source_connector: String(o.source_connector ?? "collecte"),
  created_at: String(o.created_at ?? ""),
  publie_le: String(o.publie_le ?? ""),
  statut: String(o.statut ?? ""),
  review_status: String(o.review_status ?? ""),
});

export async function GET(req: Request) {
  const compte = new URL(req.url).searchParams.get("compte") ?? "";
  if (!EQUIPE(compte)) return Response.json({ erreur: "réservé au compte admin DataParl'" }, { status: 401 });
  try {
    const [revue, actives, archives] = await Promise.all([fileRevue(), offresActivesAdmin(), offresArchiveesAdmin()]);
    return Response.json({
      revue: revue.map(reduire),
      actives: actives.map(reduire),
      archives: archives.map(reduire).slice(0, 60),
    });
  } catch {
    return Response.json({ erreur: "lecture impossible" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const c = (await req.json().catch(() => null)) ?? {};
  const compte = typeof c.compte === "string" ? c.compte : "";
  const empreinte = typeof c.empreinte === "string" ? c.empreinte : "";
  const action = c.action;
  if (!EQUIPE(compte)) return Response.json({ erreur: "réservé au compte admin DataParl'" }, { status: 401 });
  if (action !== "valider" && action !== "archiver" && action !== "rejeter") {
    return Response.json({ erreur: "action inconnue" }, { status: 400 });
  }
  try {
    const ok = await deciderOffre(empreinte, action, compte);
    if (!ok) return Response.json({ erreur: "offre introuvable" }, { status: 404 });
    if (process.env.SLACK_WEBHOOK_URL) {
      fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Jobs admin : offre " + empreinte.slice(0, 8) + " → " + action + " (par " + compte + ")" }),
      }).catch(() => {});
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ erreur: "action impossible" }, { status: 500 });
  }
}
