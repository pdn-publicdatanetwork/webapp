-- Console Slack : saisies manuelles des chiffres publicitaires
-- (AppLixir, AdSense) quand les API ne sont pas branchées, ou pour les
-- corriger. RLS activée sans policy (accès service_role uniquement),
-- bloc GRANT explicite (règle du 30/10/2026).

create table if not exists public.pub_saisies (
  jour date primary key,
  applixir_eur numeric(10,2),
  adsense_eur numeric(10,2),
  videos integer,
  impressions integer,
  maj_le timestamptz not null default now(),
  maj_par text
);

comment on table public.pub_saisies is
  'Chiffres publicitaires saisis à la main (console Slack, publication) : AppLixir n''expose pas d''API de reporting ; AdSense peut y être corrigé.';

alter table public.pub_saisies enable row level security;

grant select, insert, update, delete on public.pub_saisies to service_role;
revoke all on public.pub_saisies from anon, authenticated;
