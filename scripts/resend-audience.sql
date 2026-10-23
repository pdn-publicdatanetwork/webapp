-- Synchronisation des comptes Supabase → Resend Audience (dataparl-auth)
-- ---------------------------------------------------------------------------
-- Objectif : chaque compte utilisateur confirmé de auth.users est ajouté
-- automatiquement comme contact dans une Audience Resend (resend.com/audience),
-- pour pouvoir envoyer des e-mails de masse (Broadcasts) depuis Resend.
--
-- À exécuter dans le SQL Editor du projet Supabase « dataparl-auth »
-- (kuywydrsfuixppchugpe). Aucune ressource Vercel mobilisée : tout tourne
-- côté base de données (trigger + pg_net).
--
-- Prérequis (à faire AVANT d'exécuter ce script) :
--   1. Dans Resend → Audience : créer une audience (ex. « Comptes DataParl' »)
--      et noter son identifiant (format uuid). Gratuit jusqu'à 1 000 contacts.
--   2. Dans Resend → API Keys : créer une clé (droits full access ou
--      sending + contacts selon ce que propose le plan).
--
-- ⚠️ Seuls les comptes CONFIRMÉS sont synchronisés : les doublons non
-- confirmés créés par les échecs OTP (cf. diagnostics SMTP) ne polluent pas
-- l'audience. La confirmation tardive d'un compte déclenche l'ajout via le
-- trigger UPDATE.

-- ─── 0. Réglages — à personnaliser ─────────────────────────────────────────
-- Remplace les deux valeurs ci-dessous :
create table if not exists public.parametres_resend (id int primary key default 1, audience_id text not null);
insert into public.parametres_resend (id, audience_id) values (1, 'REMPLACER_PAR_L_ID_DAUDIENCE')
  on conflict (id) do update set audience_id = excluded.audience_id;

-- Clé API Resend stockée chiffrée dans le Vault (jamais en clair dans le SQL).
-- Exécuter une fois, séparément :
--   select vault.create_secret('re_xxxxxxxxxxxxxxxx', 'resend_api_key');
-- (la ligne ci-dessous ne sert qu'à vérifier qu'elle existe)
--   select name, created_at from vault.decrypted_secrets where name = 'resend_api_key';

grant select on public.parametres_resend to service_role;
revoke all on public.parametres_resend from anon, authenticated;

-- ─── 1. Extension réseau ──────────────────────────────────────────────────
create extension if not exists pg_net;

-- ─── 2. Fonction de synchronisation ────────────────────────────────────────
create or replace function public.resend_sync_contact() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cle text;
  v_audience text;
begin
  select decrypted_secret into v_cle from vault.decrypted_secrets where name = 'resend_api_key';
  select audience_id into v_audience from public.parametres_resend where id = 1;
  if v_cle is null or v_audience is null then
    raise warning 'resend_sync_contact : clé Vault ou audience absente, contact % ignoré', new.email;
    return null;
  end if;

  if tg_op = 'DELETE' then
    -- Le compte disparaît → le contact est retiré de l'audience.
    perform net.http_delete(
      url := 'https://api.resend.com/audiences/' || v_audience || '/contacts/' || old.email,
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_cle),
      timeout_milliseconds := 5000
    );
    return null;
  end if;

  -- INSERT ou UPDATE : on ne synchronise que les comptes confirmés.
  if new.email_confirmed_at is null then
    return null;
  end if;
  -- UPDATE sans changement pertinent : déjà synchronisé, on évite les appels.
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null and new.email = old.email then
    return null;
  end if;

  -- L'API est idempotente sur l'e-mail : re-POST = mise à jour du contact.
  perform net.http_post(
    url := 'https://api.resend.com/audiences/' || v_audience || '/contacts',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_cle, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'email', new.email,
      'first_name', coalesce(new.raw_user_meta_data->>'prenom', ''),
      'last_name', coalesce(new.raw_user_meta_data->>'nom', '')
    ),
    timeout_milliseconds := 5000
  );
  return null;
end $$;

revoke execute on function public.resend_sync_contact() from anon, authenticated, public;

-- ─── 3. Triggers sur auth.users ────────────────────────────────────────────
drop trigger if exists resend_sync_apres_insert on auth.users;
create trigger resend_sync_apres_insert
  after insert on auth.users
  for each row execute function public.resend_sync_contact();

drop trigger if exists resend_sync_apres_update on auth.users;
create trigger resend_sync_apres_update
  after update of email, email_confirmed_at on auth.users
  for each row execute function public.resend_sync_contact();

drop trigger if exists resend_sync_apres_delete on auth.users;
create trigger resend_sync_apres_delete
  after delete on auth.users
  for each row execute function public.resend_sync_contact();

-- ─── 4. Rattrapage initial (comptes existants) ─────────────────────────────
-- À lancer une fois, après le point 0 et le vault.create_secret.
-- pg_net est asynchrone : les requêtes partent en file d'attente.
do $$
declare
  v_cle text;
  v_audience text;
  c record;
begin
  select decrypted_secret into v_cle from vault.decrypted_secrets where name = 'resend_api_key';
  select audience_id into v_audience from public.parametres_resend where id = 1;
  if v_cle is null or v_audience is null then
    raise exception 'Clé Vault ou audience absente — configure le point 0 avant le rattrapage.';
  end if;
  for c in
    select id, email, raw_user_meta_data
    from auth.users
    where email_confirmed_at is not null
  loop
    perform net.http_post(
      url := 'https://api.resend.com/audiences/' || v_audience || '/contacts',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_cle, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'email', c.email,
        'first_name', coalesce(c.raw_user_meta_data->>'prenom', ''),
        'last_name', coalesce(c.raw_user_meta_data->>'nom', '')
      ),
      timeout_milliseconds := 5000
    );
  end loop;
end $$;

-- Vérification (quelques secondes après) : les appels passés et leurs codes.
--   select id, status_code, error_msg from net._http_response order by id desc limit 20;
