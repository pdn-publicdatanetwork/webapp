import "server-only";

// Client Buffer (API GraphQL, api.buffer.com, clé personnelle Bearer).
// Utilisé par la commande Slack /post : récupère les canaux connectés
// et crée les posts (file d'attente, publication immédiate ou brouillon).
// Documentation : developers.buffer.com (createPost, channels, account).

const API = "https://api.buffer.com";

async function gql(query: string): Promise<Record<string, unknown>> {
  const cle = process.env.BUFFER_API_KEY ?? "";
  if (!cle) throw new Error("BUFFER_API_KEY absente : connecte Buffer dans publish.buffer.com/settings/api.");
  const r = await fetch(API, {
    method: "POST",
    headers: { Authorization: "Bearer " + cle, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error("Buffer HTTP " + r.status);
  const j = (await r.json()) as { errors?: { message: string }[] } & Record<string, unknown>;
  if (j.errors?.length) throw new Error("Buffer : " + j.errors.map((e) => e.message).join(", "));
  return j.data as Record<string, unknown>;
}

export type CanalBuffer = { id: string; nom: string; service: string };

// Canaux connectés du compte Buffer (toutes organisations).
export async function canaux(): Promise<CanalBuffer[]> {
  const d = (await gql("query { account { organizations { id } } }")) as { account?: { organizations?: { id: string }[] } };
  const orgs = (d.account?.organizations ?? []).map((o) => o.id);
  const tous: CanalBuffer[] = [];
  for (const organizationId of orgs) {
    const c = (await gql("query { channels(input: { organizationId: \"" + organizationId + "\" }) { id name service } }")) as { channels?: { id: string; name: string; service: string }[] };
    for (const x of c.channels ?? []) tous.push({ id: x.id, nom: x.name, service: x.service });
  }
  return tous;
}

export type ModePost = "file" | "maintenant" | "brouillon";

// Crée un post sur un canal. Le texte contient déjà le lien court dédié
// au réseau (tracking par réseau dans liens_clics).
export async function creerPost(canal: string, texte: string, mode: ModePost): Promise<{ id: string } | { erreur: string }> {
  const r = await gql(
    "mutation { createPost(input: { text: " + JSON.stringify(texte) + ", channelId: " + JSON.stringify(canal) + ", schedulingType: automatic, mode: " +
      (mode === "maintenant" ? "shareNow" : "addToQueue") + (mode === "brouillon" ? ", saveToDraft: true" : "") + " }) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }",
  );
  const p = r.createPost as { post?: { id: string }; message?: string };
  if (p?.post?.id) return { id: p.post.id };
  return { erreur: p?.message ?? "réponse inattendue de Buffer" };
}
