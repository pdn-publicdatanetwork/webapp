import "server-only";
import { authAdmin } from "./supabaseAdmin";
import { copieSlack, SLACK_MAINTENANCE } from "./slack";

// Bascule du mode maintenance. Source de vérité : table maintenance_etat
// (dataparl-auth), lue par le proxy (webapp) et dpchat — un changement est
// appliqué en moins de 30 s, sans redéploiement. La bascule synchronise
// aussi la page de statut Better Stack (status.dataparl.fr) et envoie une
// copie d'information sur le canal Slack de maintenance.
//
// Vercel : BETTERSTACK_API_KEY (sans elle, la page de statut n'est pas
// synchronisée — le site bascule quand même) et, au choix,
// BETTERSTACK_STATUS_PAGE_ID (sinon la page est retrouvée par son domaine).

export type EtatMaintenance = {
  active: boolean; ouvert_le: string | null; ferme_le: string | null;
  par: string | null; motif: string | null;
};

export async function lireMaintenance(): Promise<EtatMaintenance> {
  const { data, error } = await authAdmin().from("maintenance_etat")
    .select("active, ouvert_le, ferme_le, par, motif").eq("id", 1).single();
  if (error) throw error;
  return data as EtatMaintenance;
}

// ── Better Stack ────────────────────────────────────────────────────────────

const BS = "https://uptime.betterstack.com/api/v2";

type BsRapport = { id: string; attributes: { report_type: string; ends_at: string | null } };

async function bsFetch(chemin: string, init?: RequestInit): Promise<unknown> {
  const r = await fetch(`${BS}${chemin}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.BETTERSTACK_API_KEY}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Better Stack ${r.status} : ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function pageStatut(): Promise<string | null> {
  const liste = (await bsFetch("/status-pages")) as { data: { id: string; attributes: { subdomain: string | null; custom_domain: string | null } }[] };
  const idEnv = process.env.BETTERSTACK_STATUS_PAGE_ID;
  return (liste.data ?? []).find((p) =>
    (!!idEnv && p.id === idEnv) || p.attributes.subdomain === "status" ||
    (p.attributes.custom_domain ?? "").includes("status.dataparl.fr"),
  )?.id ?? null;
}

async function rapportsEnCours(pageId: string): Promise<BsRapport[]> {
  const liste = (await bsFetch(`/status-pages/${pageId}/status-reports`)) as { data: BsRapport[] };
  const maintenant = Date.now();
  return (liste.data ?? []).filter((r) =>
    r.attributes.report_type === "maintenance" &&
    (!r.attributes.ends_at || Date.parse(r.attributes.ends_at) > maintenant));
}

export async function betterstackMaintenance(active: boolean, motif?: string): Promise<{ ok: boolean; message: string; rapportId?: string }> {
  if (!process.env.BETTERSTACK_API_KEY) return { ok: false, message: "BETTERSTACK_API_KEY absente : page de statut non synchronisée (le site a bien basculé)." };
  try {
    const pageId = await pageStatut();
    if (!pageId) return { ok: false, message: "Page de statut introuvable côté Better Stack (ni BETTERSTACK_STATUS_PAGE_ID, ni sous-domaine « status »)." };
    if (active) {
      const enCours = await rapportsEnCours(pageId);
      if (enCours.length) return { ok: true, message: "Maintenance déjà affichée sur status.dataparl.fr.", rapportId: enCours[0].id };
      const ressources = (await bsFetch(`/status-pages/${pageId}/resources`)) as { data: { id: string }[] };
      const affectes = (ressources.data ?? []).map((r) => ({ status_page_resource_id: String(r.id), status: "maintenance" }));
      const cree = (await bsFetch(`/status-pages/${pageId}/status-reports`, {
        method: "POST",
        body: JSON.stringify({
          title: "Maintenance en cours",
          message: motif?.trim() || "DataParl' est momentanément indisponible : le recensement des élus et de leurs collaborateurs n'a pas bougé, toutes les données sont intactes et le site sera de retour très vite.",
          report_type: "maintenance",
          // Fin indicative à 24 h : la réouverture depuis l'admin ou Slack
          // clôt le rapport plus tôt.
          ends_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
          affected_resources: affectes,
        }),
      })) as { data: { id: string } };
      return { ok: true, message: "Maintenance affichée sur status.dataparl.fr (abonnés notifiés).", rapportId: cree.data.id };
    }
    // Réouverture : clôturer le(s) rapport(s) de maintenance en cours.
    const enCours = await rapportsEnCours(pageId);
    if (!enCours.length) return { ok: true, message: "Aucune maintenance à clôturer sur status.dataparl.fr." };
    for (const r of enCours) {
      await bsFetch(`/status-pages/${pageId}/status-reports/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ends_at: new Date().toISOString() }),
      });
    }
    return { ok: true, message: "Maintenance clôturée sur status.dataparl.fr." };
  } catch (e) {
    return { ok: false, message: `Better Stack : ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ── Bascule ────────────────────────────────────────────────────────────────

export async function basculeMaintenance(active: boolean, par: string, motif?: string) {
  const etat = await lireMaintenance();
  const maintenant = new Date().toISOString();
  const patch: Record<string, unknown> = { active, par, motif: motif?.trim() || null };
  if (active) patch.ouvert_le = maintenant; else patch.ferme_le = maintenant;
  const { error } = await authAdmin().from("maintenance_etat").update(patch).eq("id", 1);
  if (error) throw error;

  const bs = await betterstackMaintenance(active, motif);
  if (bs.rapportId) {
    await authAdmin().from("maintenance_etat").update({ betterstack_report_id: bs.rapportId }).eq("id", 1);
  }

  // Copie Slack non bloquante (canal de maintenance).
  await copieSlack(SLACK_MAINTENANCE, {
    subject: active ? "Maintenance activée sur dataparl.fr" : "Site rétabli — maintenance terminée",
    corpsHtml: `<p><strong>${active ? "Le site est passé en maintenance" : "Le site est rétabli"}</strong> (par ${par}).${motif ? ` Motif : ${motif}.` : ""}</p><p>${bs.message}</p>`,
    text: `${active ? "Maintenance activée" : "Site rétabli"} (par ${par}). ${bs.message}`,
  });

  return { ok: true, active, precedent: etat.active, betterstack: bs };
}
