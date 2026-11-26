import "server-only";
import { timingSafeEqual } from "node:crypto";

// Vérification du jeton des routes machine-to-machine (apps Slack, webmail).
// Le jeton est accepté via l'en-tête « x-maintenance-token » (recommandé :
// il ne se retrouve pas dans les journaux d'infra, contrairement à une
// query string) ou, par compatibilité avec les URL déjà configurées côté
// Slack, via le paramètre « ?t= » ; pour les commandes slash, le champ
// « token » du corps de la requête compte aussi (secret partagé
// supplémentaire posé par Slack). Comparaison en temps constant
// (durcissement, audit du 26/11).
export function jetonMaintenanceValide(req: Request, attendu: string, u: URL, corps?: URLSearchParams): boolean {
  if (!attendu) return false;
  const recu = req.headers.get("x-maintenance-token") ?? u.searchParams.get("t") ?? corps?.get("token") ?? "";
  if (!recu) return false;
  const a = Buffer.from(attendu, "utf8");
  const r = Buffer.from(recu, "utf8");
  return a.length === r.length && timingSafeEqual(a, r);
}
