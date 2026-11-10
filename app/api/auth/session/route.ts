import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { utilisateur } from "@/lib/userAuth";
import { authAdmin, compteAuthParEmail } from "@/lib/supabaseAdmin";

// Échange un id token Firebase vérifié contre l'identité Postgres du compte.
// Le jeton est vérifié par lib/userAuth (SDK admin, aud = dataparl-auth),
// puis le compte auth.users est retrouvé par e-mail (les uid Firebase ont été
// importés à l'identique : même uuid Postgres ; un nouvel arrivant est créé,
// uid = nouvel uuid Postgres, les clés étrangères des 33 tables restent
// raccordées). Le prénom/nom saisis à la création sont enregistrés ici pour
// que /api/compte/consentement (mail de bienvenue, copie Slack) les voie.

const Corps = z.object({
  idToken: z.string().min(20).max(4000),
  prenom: z.string().trim().max(60).optional(),
  nom: z.string().trim().max(60).optional(),
});

export async function POST(req: Request) {
  const corps = Corps.safeParse(await req.json().catch(() => null));
  if (!corps.success) return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "jeton invalide" }, { status: 401 });

  const admin = authAdmin();
  const trouve = await compteAuthParEmail(user.email!);
  const existant = trouve ? (trouve as unknown as { id: string; user_metadata?: Record<string, unknown> }) : null;

  if (!existant) {
    const { data: cree, error } = await admin.auth.admin.createUser({
      email: user.email!,
      email_confirm: true,
      user_metadata: { prenom: corps.data.prenom ?? "", nom: corps.data.nom ?? "" },
    });
    if (error || !cree?.user) return NextResponse.json({ error: "création impossible" }, { status: 502 });
    return NextResponse.json({ ok: true, id: cree.user.id });
  }

  // Compte déjà connu : on complète l'identité si elle manquait (première
  // connexion post-bascule d'un compte importé sans prénom/nom).
  const meta = (existant.user_metadata ?? {}) as { prenom?: string; nom?: string };
  const p = meta.prenom || corps.data.prenom;
  const n = meta.nom || corps.data.nom;
  if ((p && !meta.prenom) || (n && !meta.nom)) {
    await admin.auth.admin.updateUserById(existant.id, { user_metadata: { prenom: p ?? "", nom: n ?? "" } });
  }
  return NextResponse.json({ ok: true, id: existant.id });
}
