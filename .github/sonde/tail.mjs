// Sonde CI DataParl' : tail WebSocket (trace-v1) d'un Worker Cloudflare.
// Usage : node tail.mjs <nom-du-worker> <duree-ms>
// Environnement : CF_TOKEN, CF_ACCOUNT. Necessite Node >= 22 (WebSocket natif).
const token = process.env.CF_TOKEN ?? "";
const account = process.env.CF_ACCOUNT ?? "";
const worker = process.argv[2] ?? "";
const duree = Number(process.argv[3] ?? "15000");
if (!token || !account || !worker) {
  console.log("TAIL_ARGS_MANQUANTS");
  process.exit(0);
}
const res = await fetch(
  "https://api.cloudflare.com/client/v4/accounts/" + account + "/workers/scripts/" + worker + "/tails",
  { method: "POST", headers: { Authorization: "Bearer " + token } },
);
const j = await res.json().catch(() => null);
if (!j?.success || !j?.result?.url) {
  console.log("TAIL_INIT_ECHEC", JSON.stringify(j?.errors ?? j).slice(0, 300));
  process.exit(0);
}
let evenements = 0;
const ws = new WebSocket(j.result.url, "trace-v1");
ws.addEventListener("message", (ev) => {
  const donnees = typeof ev.data === "string" ? ev.data : "";
  if (!donnees) return;
  evenements++;
  for (const ligne of donnees.split("\n")) {
    if (!ligne.trim()) continue;
    try {
      const e = JSON.parse(ligne);
      if (Array.isArray(e.exceptions)) {
        for (const x of e.exceptions) console.log("EXC:", JSON.stringify(x).slice(0, 700));
      }
      if (Array.isArray(e.logs)) {
        for (const l of e.logs) {
          const msg = Array.isArray(l.message) ? l.message.join(" ") : String(l.message ?? "");
          if (msg) console.log("LOG:", msg.slice(0, 500));
        }
      }
      if (e.outcome && e.outcome !== "ok") console.log("OUTCOME:", JSON.stringify(e).slice(0, 400));
    } catch {
      console.log("RAW:", ligne.slice(0, 250));
    }
  }
});
ws.addEventListener("open", () => console.log("TAIL_OUVERT", worker));
ws.addEventListener("error", (e) => console.log("TAIL_ERR", String((e as any).message ?? e).slice(0, 200)));
setTimeout(() => {
  console.log("TAIL_FIN", worker, evenements, "evenements");
  try { ws.close(); } catch {}
  process.exit(0);
}, duree);
