# Changelog

Historique des évolutions de la webapp DataParl' (dataparl.fr).

## 2026-10-19

- **Fiches groupes : « L'équipe du groupe » (PR #36)** : nouvelle section sur
  les fiches de groupes (secrétaire général, adjoints, collaborateurs de
  groupe), alimentée par la table Supabase `equipes_groupes` (sources
  officielles, datées, avec niveau de confiance) ; au Parlement européen, les
  assistants « (groupement) » déjà en base complètent l'affichage. Suivi des
  collectes restantes : issue #37.

## 2026-10-14

- **Perf CPU (PR #28)** : allongement des délais `revalidate` ISR — 24 h pour
  les fiches parlementaires/collaborateurs, listes, hubs, gouv, groupes, partis,
  sénatoriales, sitemaps et images opengraph ; 1 h pour mouvements et daily ;
  10 min pour sheets et search. Divise par ~24 les régénérations SSR de fond
  (limite Fluid Active CPU du plan Vercel atteinte en octobre).
- **Revalidation à la demande (PR #29)** : endpoint `POST /api/revalidate`
  protégé par `REVALIDATE_SECRET`, appelé par le workflow « Synchro Supabase »
  du dépôt collaborateurs après le run du matin — les pages vitrines se
  rafraîchissent au bon moment, sans burst de CPU.
- **Sitemap permanences (PR #27)** : page `/parlementaires/map` (carte des
  permanences) inscrite au registre des pages et au sitemap.
- **Fix build** : retrait d'une ligne parasite en tête de
  `lib/pagesRegistre.ts` qui cassait le build Turbopack.

## 2026-10-13

- Monitoring : heartbeat Better Stack sur le cron des alertes
  (`BETTERSTACK_HEARTBEAT_URL`), browser check Checkly « parcours public »,
  identifiant Clarity (`NEXT_PUBLIC_CLARITY_ID`).
- Page interstitielle `acces-ressource` entre data.gouv.fr et la connexion.

> Note : l'historique antérieur de ce fichier a été perdu lors d'un commit
> défectueux (13/10). Les entrées ci-dessus reconstituent l'essentiel ;
> compléter au besoin depuis les messages de commits (`git log --oneline`).
