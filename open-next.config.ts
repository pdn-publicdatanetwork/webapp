import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Migration Cloudflare Workers : configuration OpenNext minimale.
// (defineCloudflareConfig fournit les valeurs par defaut exigees par
//  l'adaptateur depuis la v1.20+: export default obligatoire.)
export default defineCloudflareConfig({});
