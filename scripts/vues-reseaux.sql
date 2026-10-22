-- Journal des vues des pages mentionnant les canaux WhatsApp et Telegram
-- (DataParl' Daily) : chaque consultation est enregistrée côté serveur
-- (proxy.ts → lib/vuesReseaux.ts), connectés comme visiteurs anonymes, avec
-- horodatage, adresse IP, navigateur et page d'origine. Consultation réservée
-- à l'admin (Journal → Vues canaux). Conservation 13 mois (durée CNIL des
-- logs techniques), purge automatique dans lib/vuesReseaux.ts.
-- À exécuter dans le projet Supabase dataparl-auth (SQL Editor).

create table if not exists public.vues_reseaux (
  id bigint generated always as identity primary key,
  chemin text not null check (char_length(chemin) between 1 and 300),
  ip text,
  user_agent text,
  referer text,
  le timestamptz not null default now()
);

create index if not exists vues_reseaux_chemin_le_idx on public.vues_reseaux (chemin, le desc);
create index if not exists vues_reseaux_le_idx on public.vues_reseaux (le);

-- Aucun accès via la clé publique : insertions et lectures uniquement par
-- la clé service_role (API webapp et admin).
alter table public.vues_reseaux enable row level security;

comment on table public.vues_reseaux is
  'Vues des pages WhatsApp/Telegram : horodatage, IP, navigateur, provenance — 13 mois (CNIL), purge dans lib/vuesReseaux.ts.';
