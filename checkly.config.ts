// @ts-nocheck : config Checkly, déployée par « npx checkly deploy » (pas compilée par la webapp).
// Checks as code : les browser checks vivent dans __checks__/ et sont
// synchronisés avec le compte Checkly (projet dataparl.fr) via le CLI.
// Voir https://checklyhq.com/docs/cli/ 
import { defineConfig } from "@checkly/cli/config";

export default defineConfig({
  projectName: "dataparl-webapp",
  logicalId: "dataparl-webapp",
  repoUrl: "https://github.com/dataparl/webapp",
  checks: {
    locations: ["eu-central-1"],
    frequency: 60, // toutes les heures
    browserChecks: { testMatch: "__checks__/**/*.spec.ts" },
  },
  // URL de base injectée dans les checks (ENVIRONMENT_URL) : la valeur par
  // défaut de chaque script reste www.dataparl.fr.
  env: [{ key: "ENVIRONMENT_URL", value: "https://www.dataparl.fr" }],
});

// deploy trigger 2026-10-19c
