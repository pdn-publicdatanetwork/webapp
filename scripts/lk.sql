-- Lien court LinkedIn dataparl.fr/lk (campagne de lancement, décision 24/10/2026).
-- Le lien vit sur le domaine principal (abandon du sous-domaine l.dataparl.fr).
-- Clics journalisés automatiquement dans liens_clics (code « lk ·) par app/lk/route.ts.
insert into public.liens (code, destination, titre, actif)
values ('lk', 'https://www.dataparl.fr/', 'LinkedIn — série de lancement', true)
on conflict (code) do update set actif = true, destination = excluded.destination;
