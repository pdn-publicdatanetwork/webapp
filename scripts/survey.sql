-- Enquête utilisateurs (survey.dataparl.fr) : une ligne par invitation ouverte
-- depuis le site, liée au compte connecté ; les notes sont enregistrées quand
-- le questionnaire est rempli. À exécuter dans le projet Supabase
-- dataparl-auth (SQL Editor).
create extension if not exists pgcrypto;

create table if not exists public.survey_reponses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,                       -- compte connecté au moment de l'invitation
  email text not null,
  jeton_hash text not null unique,    -- seul le hash du jeton du lien est stocké
  note_experience int check (note_experience between 1 and 5),
  note_contenu int check (note_contenu between 1 and 5),
  note_global int check (note_global between 1 and 5),
  priorites text[],                   -- priorités d'amélioration choisies (interface DataForm')
  commentaire text,
  cree_le timestamptz not null default now(),
  repondu_le timestamptz
);

create index if not exists survey_reponses_email_idx on public.survey_reponses (email);
create index if not exists survey_reponses_user_idx on public.survey_reponses (user_id);

-- Le service role fait tout ; personne d'autre ne lit ni n'écrit ces lignes
-- (le questionnaire passe par les routes API du site).
alter table public.survey_reponses enable row level security;

-- Migration de la table existante (questionnaire interface DataForm',
-- novembre 2026) : ajout des priorités sans toucher aux données.
alter table public.survey_reponses
  add column if not exists priorites text[];
