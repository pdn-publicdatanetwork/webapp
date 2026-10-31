import { NextResponse } from "next/server";
import { utilisateur, fournisseurs } from "@/lib/userAuth";
import { normalizeEmail } from "@/lib/tokens";
import { paysDepuisIp } from "@/lib/geoIp";
import { mailConnexionInhabituelle } from "@/lib/securiteMail";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/journal-connexion : appelé par JournalConnexion à chaque nouvelle
// session détectée côté client. Journalise l'événement avec IP, user-agent,
// appareil déduit et pays (base locale, cf. lib/geoIp.ts) dans
// public.journal_connexions. Détecte les connexions inhabituelles :
//   - appareil jamais vu pour ce compte (l'IP seule ne compte pas : les
//     adresses mobiles tournent sans cesse, ce serait du bruit) ;
//   - pays jamais vu, mais seulement une fois qu'au moins une connexion
//     passée a déjà un pays enregistré (sinon tous les comptes existants
//     déclencheraient une fausse alerte au premier passage) ;
//   - jamais la toute première connexion du compte (rien à comparer).
// Un e-mail d'information part alors depuis securite@dataparl.fr, plafonné
// à un par 24 h par l'anti-doublon de lib/securiteMail.ts.
// Dédoublonnage journal : un triple identique (compte, IP, user-agent) dans
// les 5 minutes est ignoré.

function appareilDepuis(ua: string): string {
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux" : "OS inconnu";
  const nav = /CriOS|Chrome\//.test(ua) ? "Chrome"
    : /FxiOS|Firefox\//.test(ua) ? "Firefox"
    : /Edg(e|A|iOS)?\//.test(ua) ? "Edge"
    : /Safari\//.test(ua) ? "Safari" : "navigateur inconnu";
  const type = /Mobi|iPhone|iPad|Android/.test(ua) ? "mobile" : "ordinateur";
  return `${type}, ${os}, ${nav}`;
}

export async function POST(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non_connecte" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  const appareil = ua ? appareilDepuis(ua) : null;
  const db = authAdmin();

  // Dédoublonnage 5 minutes (compte + IP + user-agent identiques).
  const { data: recente } = await db.from("journal_connexions")
    .select("id")
    .eq("user_id", user.id)
    .eq("ip", ip ?? "")
    .gte("le", new Date(Date.now() - 5 * 60_000).toISOString())
    .limit(1);
  if (recente?.length) return NextResponse.json({ ok: true, deduplique: true });

  const pays = await paysDepuisIp(ip);

  // Détection d'une connexion inhabituelle, avant d'écrire la nouvelle ligne.
  let suspect = false;
  const { count: total } = await db.from("journal_connexions").select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((total ?? 0) > 0) {
    if (appareil) {
      // Appareil jamais vu : nouveau navigateur, nouveau téléphone…
      const { count: appareilDejaVu } = await db.from("journal_connexions").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("appareil", appareil);
      suspect = (appareilDejaVu ?? 0) === 0;
    }
    if (!suspect && pays) {
      // Pays jamais vu, seulement si l'historique du compte connaît déjà
      // au moins un pays (base de géolocalisation en place de son côté).
      const [{ count: avecPays }, { count: paysDejaVu }] = await Promise.all([
        db.from("journal_connexions").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).not("pays", "is", null),
        db.from("journal_connexions").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).eq("pays", pays),
      ]);
      suspect = (avecPays ?? 0) > 0 && (paysDejaVu ?? 0) === 0;
    }
  }

  const { error } = await db.from("journal_connexions").insert({
    user_id: user.id,
    ip,
    user_agent: ua ? ua.slice(0, 400) : null,
    appareil,
    pays,
    fournisseur: fournisseurs(user).join(", ") || null,
  });
  if (error) return NextResponse.json({ error: "insertion_impossible" }, { status: 500 });

  // L'activité du compte (consultable dans /mon-compte/activite) reçoit aussi
  // l'événement, marqué comme une vraie connexion (et non une simple visite).
  await db.from("activite_connexions").insert({
    user_id: user.id, email: normalizeEmail(user.email!), ip, agent: ua ? ua.slice(0, 200) : null, type: "connexion",
  });

  if (suspect) await mailConnexionInhabituelle(user.id, { ip, appareil, pays });

  return NextResponse.json({ ok: true, ...(suspect ? { suspect: true } : {}) });
}
