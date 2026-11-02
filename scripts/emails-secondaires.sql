-- Adresses email secondaires associees a un compte (confirmation par code
-- a 6 chiffres, seul le hash SHA-256 du code est stocke). Acces reserve au
-- service_role (routes serveur /api/compte/*) : aucune policy RLS.
create table if not exists public.emails_secondaires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  code_hash text,
  dernier_envoi_le timestamptz,
  confirme_le timestamptz,
  cree_le timestamptz not null default now(),
  unique (user_id, email)
);
alter table public.emails_secondaires enable row level security;
