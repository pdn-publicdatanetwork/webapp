-- Notifications de sécurité DataParl' (webapp)
-- Appliqué le 31/10/2026 sur le projet auth (kuywydrsfuixppchugpe) via
-- l'outil Supabase ; ce fichier documente les changements.

-- 1) Pays des connexions : détection « appareil / pays jamais vus »
--    (app/api/journal-connexion + lib/geoIp.ts).
alter table public.journal_connexions
  add column if not exists pays text;

-- Bloc GRANT (règle du 30/10/2026 : obligatoire dans chaque migration).
grant select, insert, update, delete on public.journal_connexions to service_role;
grant select, insert, update, delete on public.journal_connexions to postgres;

-- 2) Bucket privé du fichier de géolocalisation : « dbip-country-lite.mmdb »
--    (db-ip.com, licence CC BY 4.0). À télécharger chaque mois et à déposer
--    dans ce bucket (Storage, privé) ; absent = détection de pays inactive,
--    aucune erreur.
insert into storage.buckets (id, name, public)
  values ('geoip', 'geoip', false)
  on conflict (id) do nothing;

-- Aucune autre dépendance : les notifications 2FA et méthodes de connexion
-- passent par /api/compte/securite/evenement (vérification serveur de l'état
-- réel du compte), pas par des webhooks de base.
