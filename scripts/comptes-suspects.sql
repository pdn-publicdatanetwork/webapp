-- Anti-abus : comptes dont l'adresse email ne passe pas le contrôle
-- automatique à l'inscription (décision du 02/11/2026). Relances et suspensions
-- gérées par le cron webapp /api/cron/anti-abus ; détection partagée dans
-- lib/antiAbus.ts (motifs locaux + domaines jetables).
-- Migration appliquée le 02/11/2026 sur dataparl-auth (kuywydrsfuixppchugpe).
create table if not exists public.comptes_suspects (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  motif text not null,
  marque_le timestamptz not null default now(),
  notifie_le timestamptz,
  suspendu_le timestamptz,
  regularise_le timestamptz
);
alter table public.comptes_suspects enable row level security;
-- service_role uniquement : aucune politique RLS, aucun accès anon/authenticated
-- (même convention que comptes_utilisateurs).
grant select, insert, update, delete on public.comptes_suspects to service_role;
