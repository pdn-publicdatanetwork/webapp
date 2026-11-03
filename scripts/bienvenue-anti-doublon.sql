-- Verrou anti-doublon du mail de bienvenue (incident 03/11/2026) :
-- trois appels concurrents de la route /api/compte/consentement
-- (retries après 500 GoTrue) voyaient tous « 0 mail » dans la table
-- emails et partaient trois fois. Une clé primaire sur user_id rend
-- la prise de verrou atomique : un seul gagnant.
create table if not exists public.bienvenues_envoyees (
  user_id uuid primary key,
  email text not null,
  envoye_le timestamptz not null default now()
);
alter table public.bienvenues_envoyees enable row level security;
-- service_role uniquement : aucune politique RLS, aucun accès anon/authenticated
revoke all on public.bienvenues_envoyees from anon, authenticated;
grant select, insert, update, delete on public.bienvenues_envoyees to service_role;
comment on table public.bienvenues_envoyees is
  'Verrou atomique anti-doublon du mail de bienvenue : une ligne par compte, insérée avant envoi.';
