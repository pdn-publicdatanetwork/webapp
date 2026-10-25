# CRM campagnes — Listmonk (crm.dataparl.fr)

Interface de campagnes auto-hébergée (remplace l'e-mailing dans l'admin .fr) :
l'admin `admin.dataparl.fr/crm` reste la **source de vérité** (`crm_contacts`),
Listmonk gère campagnes programmées, tracking et désinscription. Zéro charge
Vercel supplémentaire.

## 1. Hébergement — Oracle Cloud Always Free (0 €)

1. Créer un compte OCI, puis une instance **VM.Standard.E2.1.Micro**
   (Always Free : 1/8 OCPU, 1 Go RAM — suffisant : listmonk ~57 Mo + Postgres).
   Ubuntu 22.04+, clé SSH. (Les Ampere A1 4 OCPU/24 Go sont aussi Always Free
   mais le quota est souvent indisponible ; inutile ici.)
2. **Security List** du VCN : ouvrir uniquement **22 (SSH)** et **80/443**.
   Le port 9000 de Listmonk n'est exposé que via le reverse proxy (le compose
   l'attache à 127.0.0.1).
3. Sur l'instance :
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 caddy git
git clone https://github.com/pdn-publicdatanetwork/webapp && cd webapp/infra/listmonk
cp .env.example .env && nano .env      # POSTGRES_PASSWORD + RESEND_API_KEY
docker compose up -d
docker compose exec listmonk /listmonk/listmonk --install
```
4. `/etc/caddy` : `crm.dataparl.fr { reverse_proxy 127.0.0.1:9000 }`
   puis `sudo systemctl reload caddy` (Caddy fait le HTTPS Let's Encrypt).
5. DNS : `crm.dataparl.fr A <IP publique de l'instance>`.
6. Listmonk (`https://crm.dataparl.fr/admin`) : créer l'admin, **désactiver
   les inscriptions publiques** (Settings), créer la liste « Newsletter »,
   générer un token API (Settings → API).

## 2. Envoi via Resend (+ Forge)

- SMTP déjà posé dans le compose : `smtp.resend.com`, user `resend`,
  mot de passe = `RESEND_API_KEY`, port 587.
- Expéditeur : `newsletter@dataparl.fr` (domaine déjà vérifié Resend) ;
  idéalement un sous-domaine dédié (ex. `mail.dataparl.fr`) vérifié dans
  Resend pour isoler la réputation des campagnes des mails transactionnels.
- **Resend Forge** (nouvelle infra d'envoi Resend, activable par domaine via
  un CNAME) : l'activer sur le domaine des campagnes donne la délivrabilité
  99 %+ / latence p99 ÷129, sans changer le code ni le SMTP.
- ⚠️ **Incompatibilité actuelle** : le tracking open/clic de Resend n'est pas
  encore supporté sur Forge. Recommandation : activer Forge sur le domaine
  campagnes **et désactiver le tracking Resend de ce domaine** — le tracking
  est assuré par Listmonk (ci-dessous), sans doublon de pixel.

## 3. Tracking (Listmonk)

Listmonk tracke nativement : ouvertures (pixel), clics (liens réécrits via
`crm.dataparl.fr`), bounces et désinscriptions, par campagne et par abonné.
Activer dans Listmonk → Settings. Ces données alimentent les segments SQL
(ex. « a cliqué sur les 3 dernières campagnes »).

## 4. Sync des contacts (GitHub Action)

`.github/workflows/sync-listmonk.yml` (cron 2×/jour) :
- lit `crm_contacts` et `newsletter_subscribers` sur **dataparl-auth** via
  l'API Supabase (clé service_role en secret) ;
- upsert dans Listmonk avec attributs `statut`, `tags`, `note` ;
- optout des désinscrits .fr ; désinscrits Listmonk archivés en retour.

Secrets à créer sur ce dépôt :
- `SUPABASE_AUTH_URL` / `SUPABASE_AUTH_SERVICE_KEY` (dataparl-auth)
- `LISTMONK_URL` (https://crm.dataparl.fr) / `LISTMONK_TOKEN` (token API)
- variable `LISTMONK_LIST_ID` (id de la liste « Newsletter »)

## 5. RGPD / promesse « sans pistage »

Le tracking nominatif (pixel + clics) doit figurer dans le tableau des
traitements Données personnelles : base légale = consentement à l'inscription
newsletter, finalité = mesure d'engagement, durée de conservation, lien de
désinscription Listmonk actif dans chaque campagne. Cohérence à revoir avec
la promesse « sans pistage » du site (suivi PR #50).
