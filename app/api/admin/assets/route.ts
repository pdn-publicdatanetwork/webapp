import { avecAdmin, EDITION, erreur } from "@/lib/adminRoute";
import { DATA_SUPABASE_URL, secret } from "@/lib/env";

// Dépôt de fichiers de l'équipe : uploads, liste et suppressions dans le bucket
// public Supabase « assets » (projet dataparl). Les fichiers sont servis par
// media.dataparl.fr/assets/<chemin> (route app/media/assets/...) et en direct
// par Supabase en /storage/v1/object/public/assets/<chemin>.

export const dynamic = "force-dynamic";

const BUCKET = "assets";

const api = (p: string) => `${DATA_SUPABASE_URL}/storage/v1${p}`;
const tete = (json: boolean) => {
  const c = secret("DATA_SUPABASE_SERVICE_ROLE_KEY");
  const h: Record<string, string> = { apikey: c, Authorization: `Bearer ${c}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
};

// Le bucket est créé au premier usage s'il manque (public, même nom des deux côtés).
async function assurerBucket() {
  const r = await fetch(api(`/bucket/${BUCKET}`), { headers: tete(false) });
  if (r.ok) return;
  const c = await fetch(api("/bucket"), {
    method: "POST", headers: tete(true),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  }).catch(() => null);
  if (!c || !c.ok) {
    throw new Error(`bucket « ${BUCKET} » introuvable et impossible à créer : créer un bucket public « assets » dans le projet Supabase`);
  }
}

// Chemin sûr : lettres, chiffres, tirets, points, « / », jamais « .. » ni slash initial.
function safe(p: string): string | null {
  if (!p || p.startsWith("/") || p.includes("..") || !/^[a-zA-Z0-9._/-]+$/.test(p)) return null;
  return p.replace(/\/+$/, "").replace(/\/+/, "/");
}

export async function GET(req: Request) {
  return avecAdmin(req, async () => {
    const prefix = safe(new URL(req.url).searchParams.get("prefix")?.replace(/\/+$/, "") ?? "") ?? "";
    const r = await fetch(api(`/object/list/${BUCKET}`), {
      method: "POST", headers: tete(true),
      body: JSON.stringify({ limit: 500, offset: 0, prefix, sortBy: { column: "name", order: "asc" } }),
    });
    if (!r.ok) throw new Error(`liste impossible : ${(await r.text()).slice(0, 200)}`);
    const brut = (await r.json()) as { name: string; id: string | null; updated_at: string | null; metadata?: { size?: number } | null }[];
    const entrees = brut
      .filter((e) => e.id) // les dossiers n'ont pas d'id : fichiers seulement
      .map((e) => ({
        chemin: `${prefix ? prefix + "/" : ""}${e.name}`,
        taille: e.metadata?.size ?? null,
        maj: e.updated_at,
      }));
    return { entrees };
  }, EDITION);
}

export async function POST(req: Request) {
  return avecAdmin(req, async () => {
    const form = await req.formData();
    const dossier = safe(String(form.get("dossier") ?? "").trim()) || "logos";
    const fichiers = form.getAll("fichiers").filter((f): f is File => f instanceof File);
    if (!fichiers.length) throw new Error("aucun fichier reçu");
    if (fichiers.reduce((n, f) => n + f.size, 0) > 25_000_000) throw new Error("trop volumineux : 25 Mo max par dépôt");
    await assurerBucket();
    const deposes: { nom: string; media: string; supabase: string }[] = [];
    for (const f of fichiers) {
      const nom = safe(f.name);
      if (!nom) throw new Error(`nom de fichier refusé : ${f.name}`);
      const chemin = `${dossier}/${nom}`;
      const r = await fetch(api(`/object/${BUCKET}/${chemin}`), {
        method: "POST",
        headers: { ...tete(false), "Content-Type": f.type || "application/octet-stream", "x-upsert": "true" },
        body: await f.arrayBuffer(),
      });
      if (!r.ok) throw new Error(`dépôt de ${f.name} échoué : ${(await r.text()).slice(0, 200)}`);
      deposes.push({
        nom: f.name,
        media: `https://media.dataparl.fr/assets/${chemin}`,
        supabase: `${DATA_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${chemin}`,
      });
    }
    return { deposes };
  }, EDITION);
}

export async function DELETE(req: Request) {
  return avecAdmin(req, async () => {
    const { chemin } = (await req.json().catch(() => ({}))) as { chemin?: string };
    const p = safe(chemin ?? "");
    if (!p) return erreur(400, "chemin invalide");
    const r = await fetch(api(`/object/${BUCKET}/${p}`), { method: "DELETE", headers: tete(false) });
    if (!r.ok) throw new Error(`suppression impossible : ${(await r.text()).slice(0, 200)}`);
    return { ok: true };
  }, EDITION);
}
