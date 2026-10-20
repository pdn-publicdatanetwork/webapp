import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { blocsStats, collecterStats, publierSlack, texteStats } from "@/lib/slackStats";
import { copieSlack } from "@/lib/slack";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Digest quotidien vers #monitoring (cron Vercel, 07 h 45 — juste après
// l'envoi des alertes). Publié en blocs riches via SLACK_WEBHOOK_URL
// (incoming webhook de l'app Slack, pointé sur #monitoring) ; à défaut,
// e-mail texte vers l'adresse du canal (SLACK_MONITORING), en repli.

function autorise(req: Request): boolean {
  const s = process.env.CRON_SECRET ?? "";
  const recu = req.headers.get("authorization") ?? "";
  const attendu = `Bearer ${s}`;
  return !!s && recu.length === attendu.length && timingSafeEqual(Buffer.from(recu), Buffer.from(attendu));
}

export async function GET(req: Request) {
  if (!autorise(req)) return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  const s = await collecterStats();
  const ok = await publierSlack({ blocks: blocsStats(s) });
  if (!ok) {
    // Repli e-mail : texte seul vers le canal.
    const cible = process.env.SLACK_MONITORING ?? "";
    if (cible) {
      await copieSlack(cible, {
        subject: "📊 Digest quotidien DataParl'",
        corpsHtml: `<pre>${texteStats(s)}</pre>`,
        text: texteStats(s),
      }).catch(() => {});
    }
  }
  return NextResponse.json({ ok: true, publie: ok, pages_24h: s.site.pagesJour });
}
