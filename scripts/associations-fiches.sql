-- Association compte ↔ fiche collaborateur + profil CV déclaré.
-- À exécuter dans le projet Supabase dataparl-auth (SQL Editor).
-- Conventions : RLS activée sans policy (accès service_role uniquement),
-- bloc GRANT explicite obligatoire (règle du 30/10/2026).

create table if not exists public.associations_fiches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  collab_slug text not null,
  collab_id text not null,
  code_hash text not null,
  expire_le timestamptz not null,
  statut text not null default 'attente_email'
    check (statut in ('attente_email','a_traiter','verifie','refuse','gele')),
  echecs int not null default 0,
  gel_jusqu_a timestamptz null,
  verifie_par text null check (verifie_par in ('email_auto','manuel')),
  verifie_le timestamptz null,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  unique (user_id, collab_slug)
);
create index if not exists associations_fiches_collab_idx on public.associations_fiches (collab_slug, statut);
create index if not exists associations_fiches_user_idx on public.associations_fiches (user_id);

-- Profil CV déclaré : publication immédiate (éléments futurs par
-- visible_a_partir_de), suppression douce (supprime_le : retiré du site,
-- conservé en base comme sauvegarde interne, restaurable sur demande).
create table if not exists public.collab_declarations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  collab_id text not null,
  categorie text not null check (categorie in ('formation','carriere','autre_activite','langues')),
  libelle text not null check (char_length(libelle) between 1 and 120),
  precision_text text null check (precision_text is null or char_length(precision_text) <= 240),
  periode text null check (periode is null or char_length(periode) <= 60),
  etablissement text null check (etablissement is null or char_length(etablissement) <= 120),
  visible_a_partir_de date null,
  supprime_le timestamptz null,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
create index if not exists collab_declarations_collab_idx
  on public.collab_declarations (collab_id, categorie) where supprime_le is null;

-- Journal des décisions d'association (automatiques et manuelles) :
-- qui, quoi, quand, avec quel résultat.
create table if not exists public.associations_journal (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  collab_id text not null,
  evenement text not null,
  detail jsonb not null default '{}',
  le timestamptz not null default now()
);
create index if not exists associations_journal_user_idx
  on public.associations_journal (user_id, le desc);

alter table public.associations_fiches enable row level security;
alter table public.collab_declarations enable row level security;
alter table public.associations_journal enable row level security;

-- Règle du 30/10/2026 : bloc GRANT explicite dans la même migration.
-- Ces tables ne passent jamais par une clé publique (anon/authenticated) :
-- tout passe par l'API webapp avec la clé service_role.
grant select, insert, update, delete on public.associations_fiches to service_role;
grant select, insert, update, delete on public.collab_declarations to service_role;
grant select, insert, update, delete on public.associations_journal to service_role;

-- TODO follow-up : bucket storage « photos-profils » (photo de la fiche,
-- dépôt réservé aux associations vérifiées, consentement RGPD explicite).