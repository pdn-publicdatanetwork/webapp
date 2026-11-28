-- Rapports DMARC agrégés (rua) : dossier « dmarc » dédié, hors webmail.
-- Migration « emails_folder_dmarc » appliquée sur dataparl-auth le 28/11/2026 :
-- les rapports quotidiens (google.com, microsoft.com, yahoo.fr, laposte.net…)
-- arrivent sur hello@dataparl.fr et polluaient les Reçus de l'espace équipe.
-- Ils restent stockés (consultables en SQL : where folder = 'dmarc') mais
-- n'apparaissent plus dans la webmail (console, Slack /mail, accusés).

alter table public.emails drop constraint if exists emails_folder_check;
alter table public.emails add constraint emails_folder_check
  check (folder = any (array['inbox'::text, 'sent'::text, 'archive'::text, 'trash'::text, 'dmarc'::text]));

-- Rattrapage des rapports déjà importés en « inbox » (idempotent).
update public.emails set folder = 'dmarc'
where folder = 'inbox'
  and (subject ~* 'report domain:' or from_addr ~* 'dmarc');
