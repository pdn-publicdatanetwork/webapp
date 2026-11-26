import { NextResponse } from "next/server";
import { dataQueryTout, normaliser } from "@/lib/data";
import { emailCollab, emailElu } from "@/lib/emails";
import { idParlementaire } from "@/lib/format";
import { authAdmin } from "@/lib/supabaseAdmin";
import { siglesDe } from "@/lib/familles";
import { cleElus } from "@/lib/referentiel";
import { utilisateur } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

type Ligne = {
  chambre: string; elu_cle: string; elu_id: string; elu_nom: string; elu_groupe: string;
  collab_cle: string; collab_nom: string; collab_prenom: string; collab_civilite: string; fonction: string; statut: string;
};

const TEXTE = /^[\p{L}\p{N} .'’/&_-]{1,80}$/u; // pas de parenthèses : le texte alimente des expressions or()/and() PostgREST
const q_ = (v: string) => `"${v.replace(/"/g, "")}"`;

// Équipes actuelles, avec adresses déduites. Réservé aux comptes connectés.
export async function GET(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const chambre = q.get("chambre") ?? "";
  const groupe = q.get("groupe") ?? "";
  const elu = q.get("elu") ?? "";
  const texte = q.get("q")?.trim() ?? "";
  if (chambre && !["assemblee", "senat", "europarl"].includes(chambre)) return NextResponse.json({ error: "chambre invalide" }, { status: 400 });
  for (const v of [groupe, elu, texte]) if (v && !TEXTE.test(v)) return NextResponse.json({ error: "filtre invalide" }, { status: 400 });
  if (!chambre && !groupe && !elu && !texte) {
    return NextResponse.json({ error: "choisis au moins un filtre (chambre, groupe, élu ou nom)" }, { status: 400 });
  }

  const p = new URLSearchParams({
    select: "chambre,elu_cle,elu_id,elu_nom,elu_groupe,collab_cle,collab_nom,collab_prenom,collab_civilite,fonction,statut",
    order: "elu_nom,collab_nom",
  });
  if (chambre) p.set("chambre", `eq.${chambre}`);
  if (groupe) p.set("elu_groupe", `in.(${siglesDe(groupe, chambre || undefined).map(q_).join(",")})`);
  if (elu) {
    const liste = (await cleElus(elu)).map(q_).join(",");
    p.set("or", `(elu_cle.in.(${liste}),elu_id.in.(${liste}))`);
  }
  if (texte) {
    const et = texte.split(/[\s-]+/).filter(Boolean).slice(0, 6).map((m) => {
      const n = normaliser(m).replace(/ /g, "");
      return `or(collab_cle.ilike."*${n}*",elu_nom.ilike."*${m.replace(/["*]/g, "")}*")`;
    });
    p.set("and", `(${et.join(",")})`);
  }

  let lignes: Ligne[];
  try {
    lignes = await dataQueryTout<Ligne>("affectations", p, 3600);
  } catch {
    return NextResponse.json({ error: "données indisponibles" }, { status: 503 });
  }

  const { data: opp } = await authAdmin().from("opposition_emails").select("chambre, collab_cle");
  const masques = new Set((opp ?? []).map((o) => `${o.chambre}|${o.collab_cle}`));

  const equipes = new Map<string, {
    chambre: string; elu_id: string; elu_cle: string; elu_nom: string; elu_groupe: string; elu_email: string | null; id_page: string;
    collabs: { nom: string; prenom: string; civilite: string; fonction: string; statut: string; email: string | null }[];
  }>();
  for (const l of lignes) {
    const k = `${l.chambre}|${l.elu_cle}`;
    if (!equipes.has(k)) {
      equipes.set(k, {
        chambre: l.chambre, elu_id: l.elu_id, elu_cle: l.elu_cle, elu_nom: l.elu_nom, elu_groupe: l.elu_groupe,
        elu_email: emailElu(l.chambre, l.elu_nom), id_page: idParlementaire(l.chambre, l.elu_id, l.elu_cle, l.elu_nom), collabs: [],
      });
    }
    equipes.get(k)!.collabs.push({
      nom: l.collab_nom, prenom: l.collab_prenom, civilite: l.collab_civilite, fonction: l.fonction, statut: l.statut,
      email: masques.has(`${l.chambre}|${l.collab_cle}`) ? null : emailCollab(l.chambre, l.collab_prenom, l.collab_nom),
    });
  }
  return NextResponse.json(
    { equipes: [...equipes.values()], n_collabs: lignes.length },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
