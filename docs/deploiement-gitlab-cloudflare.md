# Déploiement DataParl' : GitLab + Cloudflare Workers

Objectif : quitter Vercel. Le code vit sur GitLab (nouveau compte
« public data network »), le site tourne sur un Cloudflare Workers d'un
nouveau compte Cloudflare (ni tmcws, ni martytheo).

## Pourquoi ces fichiers

- `worker.ts` : OpenNext n'exporte que le handler HTTP de Next.js ; ce worker
  l'enrichit avec `scheduled()`, appelé par les Cron Triggers Cloudflare. Les
  crons appellent les routes `/api/cron/*` en interne avec l'en-tête
  `Authorization: Bearer $CRON_SECRET` attendu par chaque route.
- `wrangler.jsonc` : configuration du Worker (compatibilité Node, assets,
  crons). Mêmes horaires que Vercel, l'anti-abus en horaire.
- `open-next.config.ts` : config OpenNext (par défaut).
- `.gitlab-ci.yml` : build (OpenNext) puis `wrangler deploy` sur main.
- `app/layout.tsx` : imports `@vercel/analytics` et `@vercel/speed-insights`
  retirés (ces paquets ne fonctionnent pas hors Vercel).
- `tsconfig.json` : `worker.ts` exclu du `tsc --noEmit` (il importe un fichier
  généré au moment du build OpenNext ; wrangler le compile séparément).

## 1. Créer le compte GitLab

1. https://gitlab.com/users/sign_up (nouveau compte dédié, pas tmcws/martytheo).
2. Créer un groupe « public-data-network » (public).
3. Créer le projet « dataparl » dans ce groupe.
4. Importer le dépôt : New project > Import project > GitHub, ou ajouter le
   dépôt GitHub comme remote supplémentaire :
   `git remote add gitlab https://gitlab.com/public-data-network/dataparl.git && git push gitlab main`.

## 2. Créer le compte Cloudflare

1. https://dash.cloudflare.com/sign-up (nouveau compte dédié).
2. Récupérer l'Account ID (dashboard, page d'accueil Workers & Pages).
3. Créer un token API : My Profile > API Tokens > Create Token >
   template « Edit Cloudflare Workers », restreint à ce compte.

## 3. Variables GitLab CI (Settings > CI/CD > Variables)

| Variable | Masquée | Source |
| --- | --- | --- |
| CLOUDFLARE_API_TOKEN | oui | token créé en 2.3 |
| CLOUDFLARE_ACCOUNT_ID | oui | dashboard Cloudflare |
| CRON_SECRET | oui | réglages Vercel actuels |
| NEXT_PUBLIC_SITE_URL | non | réglages Vercel |
| NEXT_PUBLIC_AUTH_SUPABASE_URL | non | idem |
| NEXT_PUBLIC_AUTH_SUPABASE_KEY | non | idem |
| NEXT_PUBLIC_DATA_SUPABASE_URL | non | idem |
| NEXT_PUBLIC_DATA_SUPABASE_KEY | non | idem |
| NEXT_PUBLIC_TURNSTILE_SITEKEY | non | idem |
| NEXT_PUBLIC_LIENS_BASE | non | idem |
| NEXT_PUBLIC_MEDIA_BASE | non | idem |
| NEXT_PUBLIC_DPCHAT_URL | non | idem |
| NEXT_PUBLIC_ADSENSE_CLIENT | non | idem |
| NEXT_PUBLIC_ADSENSE_SLOT | non | idem |
| NEXT_PUBLIC_APPLIXIR_API_KEY | non | idem |
| NEXT_PUBLIC_CLARITY_ID | non | idem |
| SENTRY_AUTH_TOKEN | oui | idem (upload des sourcemaps au build) |

Les NEXT_PUBLIC_* sont intégrées au bundle au build : elles doivent être
définies côté CI. Les secrets serveur sont, eux, des secrets du Worker (étape 5).

## 4. Secrets du Worker

Tous les `process.env.*` serveur (voir `docs/deploiement-gitlab-cloudflare.md`,
liste complète dans le code : SUPABASE service role, RESEND_API_KEY, CRON_SECRET,
NOTION_TOKEN, SLACK_*, GOOGLE_CLIENT_*, etc.) deviennent des secrets Worker :
dashboard Cloudflare > Workers > dataparl > Settings > Variables and Secrets
(un par variable, type « Secret »), ou en CLI :
`npx wrangler secret put NOM --name dataparl`.

## 5. Domaine dataparl.fr

1. Dans le nouveau compte Cloudflare : Add a domain > dataparl.fr (plan gratuit).
2. Cloudflare donne deux nameservers : les déclarer chez le registrar du
   domaine (IONOS). ATTENTION : ce changement bascule TOUT le DNS d'un coup —
   à faire hors pic, avec les enregistrements existants (webmail, admin…)
   recopiés dans Cloudflare AVANT le changement.
3. Workers > dataparl > Settings > Domains & Routes > Add > Custom domain :
   www.dataparl.fr (et dataparl.fr en redirection vers www, à configurer dans
   Workers Routes ou une règle de redirection).
4. Vérifier : OTP de connexion, Turnstile, crons (onglet Cron Triggers),
   envoyés de mails.

## 6. Mise en service, dans l'ordre

1. Sur GitLab, les pipelines build/deploy tournent à chaque push sur main.
2. Définir tous les secrets Worker AVANT le premier deploy.
3. Bascule DNS (étape 5), puis observation pendant 48 h.
4. Une fois stable : supprimer le projet Vercel, les crons `vercel.json`
   (le fichier peut rester en souvenir mais n'est plus lu), et éventuellement
   retirer `https://vercel.live` de la CSP dans `next.config.ts`.

## Limites connues à surveiller

- Cron Triggers Cloudflare : 5 par compte en plan gratuit — DataParl' en
  utilise exactement 5. Pas de marge.
- Invocation cron plafonnée à 15 min ; la route anti-abus pagine tous les
  comptes, prévoir CPU/temps suffisants.
- Sentry : `@sentry/nextjs` n'est pas conçu pour workerd ; la partie serveur
  devra être adaptée (guide Sentry + OpenNext) si les erreurs ne remontent plus.
- `maxmind`, `postal-mime` : vérifier qu'ils se chargent en nodejs_compat.
