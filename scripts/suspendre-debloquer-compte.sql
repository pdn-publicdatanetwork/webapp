-- Suspendre / débloquer un compte (fonctions security definer)
-- Appliqué sur kuywydrsfuixppchugpe le 03/11/2026.
-- Ban à date finie uniquement : jamais 'infinity', qui fait échouer GoTrue
-- en 500 (audit-comptes.md, incident 03/11/2026).

create or replace function public.suspendre_compte(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update auth.users set banned_until = now() + interval '876000 hours' where id = uid;
end $$;

create or replace function public.debloquer_compte(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update auth.users set banned_until = null where id = uid;
end $$;

revoke all on function public.suspendre_compte(uuid) from public, anon, authenticated;
revoke all on function public.debloquer_compte(uuid) from public, anon, authenticated;
grant execute on function public.suspendre_compte(uuid) to service_role;
grant execute on function public.debloquer_compte(uuid) to service_role;
