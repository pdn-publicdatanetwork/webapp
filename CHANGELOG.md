# Changelog

Historique des évolutions de la webapp DataParl' (dataparl.fr).

## 2026-10-30

- **Accueil v2** : page d'accueil refondue, plus aérée et hiérarchisée — hero
  resserré (« Qui travaille pour vos élus ? »), quatre chiffres clés avec icônes
  (collaborateurs suivis, Assemblée, Sénat, Parlement européen), les cinq
  derniers mouvements avec badges en pastilles (arrivée / départ / transfert)
  et boutons « Voir les mouvements du jour » / « Voir l'historique », carte
  « Recevoir les mouvements par email », et grille « Explorer » de huit cartes
  (Mouvements, Collaborateurs, Parlementaires, Gouvernement, VigiParl',
  MixiParl', Sénatoriales 2026, Alertes). Fin des flèches « → » systématiques ;
  hovers légers, transitions courtes, grille responsive (4 / 2 / 1 colonnes),
  chiffres et mouvements toujours dynamiques (ISR 300 s).

- **Accueil v2, retours design** : suppression du liseré jaune sur la carte
  « Recevoir les mouvements par email » (fond très léger à la place), logos
  officiels des institutions sur les cartes de chiffres (Assemblée nationale,
  Sénat, Parlement européen — SVG dans `public/logos/`), wordmarks VigiParl' et
  MixiParl' en lieu et place des icônes génériques dans la grille Explorer, et
  badges arrivée / départ / transfert plus contrastés.

- **Accueil v2, retours (2)** : description des cartes VigiParl' et MixiParl'
  repoussée sous le wordmark (fin du texte collé au nom), hauteur des logos
  officiels harmonisée (32 px, retrait identique), badges arrivée / départ /
  transfert renforcés (32 %), hover des cartes Explorer adouci (bordure bleue
  plus discrète, ombre légère, sans translation).

- **Accueil v2, retours (3)** : section « Derniers mouvements » refaite —
  badges compacts et contrastés, nom du collaborateur en gras, élu + groupe en
  texte secondaire, chambre + date très discrets, séparations fines entre
  lignes (fin des gros blocs arrondis) ; section « Explorer » homogénéisée —
  icônes sobres identiques dans des pastilles neutres (fin du jaune massif),
  descriptions de longueur uniforme, wordmarks VigiParl' / MixiParl' alignés
  sur la même hauteur que les icônes.

## 2026-10-19

- **Fiches groupes : « L'équipe du groupe » (PR #36)** : nouvelle section sur
  les fiches de groupes (secrétaire général, adjoints, collaborateurs de
  groupe), alimentée par la table Supabase `equipes_groupes` (sources
  officielles, datées, avec niveau de confiance) ; au Parlement européen, les
  assistants « (groupement) » déjà en base complètent l'affichage. Suivi des
  collectes restantes : issue #37.

## 2026-10-14

- **Perf CPU (PR #28)** : allongement des délais `revalidate` ISR — 24 h pour
  les fiches parlementaires/collaborateurs, listes, hubs, gouv, groupes, partis,
  sénatoriales, sitemaps et images opengraph ; 1 h pour mouvements et daily ;
  10 min pour sheets et search. Divise par ~24 les régénérations SSR de fond
  (limite Fluid Active CPU du plan Vercel atteinte en octobre).
- **Revalidation à la demande (PR #29)** : endpoint `POST /api/revalidate`
  protégé par `REVALIDATE_SECRET`, appelé par le workflow « Synchro Supabase »
  du dépôt collaborateurs après le run du matin — les pages vitrines se
  rafraîchissent au bon moment, sans burst de CPU.
- **Sitemap permanences (PR #27)** : page `/parlementaires/map` (carte des
  permanences) inscrite au registre des pages et au sitemap.
- **Fix build** : retrait d'une ligne parasite en tête de
  `lib/pagesRegistre.ts` qui cassait le build Turbopack.

## 2026-10-13

- Monitoring : heartbeat Better Stack sur le cron des alertes
  (`BETTERSTACK_HEARTBEAT_URL`), browser check Checkly « parcours public »,
  identifiant Clarity (`NEXT_PUBLIC_CLARITY_ID`).
- Page interstitielle `acces-ressource` entre data.gouv.fr et la connexion.

## 2026 — historique reconstitué (avant le 2026-10-13)

> Note : l'historique antérieur de ce fichier a été perdu lors d'un commit
> défectueux (13/10). Les entrées ci-dessous le reconstituent d'après les
> messages de commits (`git log --oneline`).

### Ajouté

- Trombinoscopes et listes de collaborateurs interactifs : recherche,
  filtre par initiale, tri des colonnes, groupement par élu, pagination,
  initiales sur les cartes ; état vide explicatif pour le Parlement
  européen (collecte récente).
- Masquage temporaire des fausses arrivées Sénat du 2026-10-09 (listes,
  Daily, emails Daily/Weekly) — exclusions centralisées dans
  `lib/exclusions.ts`.
- SEO partis : `lib/partisNoms.ts` (sigle → nom complet, repli sigle),
  fiches `/parti/<slug>` réécrites (H1, réponse directe, FAQ dynamique,
  JSON-LD `ItemList` + `FAQPage` + `BreadcrumbList`) pour ranker sur
  « élu RN », « élu Rassemblement National »…
- Pages « collaborateurs par parti » (`/collab/parti` et fiches) avec
  `TableauCollabs`, FAQ et JSON-LD (« Collaborateurs des élus du
  Rassemblement National »).
- Pages Turnover par chambre (`/vigiparl/{an,senat,pe}`) : vraies pages
  « Turnover <Chambre> » (H1 mot-clé, chiffres, top 10 `ClassementTop`,
  JSON-LD) au lieu d'une redirection ; fix `/mixiparl/pe`.
- Hubs chambre : aperçu chiffré (« L'aperçu … aujourd'hui » : mixité
  moyenne, top 5 renouvellement 12 mois, 5 derniers mouvements) ;
  `ClassementTop` (classements visuels en barres) ; légende du taux de
  mixité (formule 1 − |2 × part de femmes − 1|) sur MixiParl'.
- Fiches élu : H2 « Ses collaborateurs », title enrichi ; fiche parti :
  title « Parti X : ses élus et leurs collaborateurs ».
- DataParl' Chat en pop-up sur le site public (moteur `dataparl/dpchat`,
  domaine chat.dataparl.fr) : rendu Markdown complet, aux couleurs de la
  charte, CGU dédiées avec acceptation obligatoire, mention de la
  journalisation des questions.
- Communiqués depuis Notion (CMS headless) : `lib/notion.ts` (API REST,
  blocs → Markdown, sous-puces parcourues), action admin « sync-notion »,
  cron quotidien, webhook `/api/webhooks/notion` (signature vérifiée,
  anti-rafales 60 s) ; éditeur de rédaction avec barre d'outils, liens
  Markdown cliquables dans les emails et sur la page publique.
- Vercel Web Analytics (pages vues sans cookie ni identificateur
  cross-site, cohérent avec la promesse « sans pistage »).
- Portail API : fiche du jeu de données (`/donnees`), page
  réutilisations (`/reutilisations`), navigation et sitemaps dédiés,
  message d'accueil à la manière des portails open data.
- API v1 : filtre `?groupe=` sur `/v1/mouvements`, filtre
  collaborateur, filtres combinables, `/v1/status`, playground et feuille
  de route.
- OpenAPI 1.2.0 : contrat complet après audit + script d'audit Python
  (`scripts/audit_openapi.py`).
- Page « lexique des collaborateurs parlementaires » (`/lexique`) :
  définitions en une phrase — collaborateur de député, régime du Sénat,
  assistants accrédités et locaux du Parlement européen, groupements, tiers
  payants, prestataires, mouvements, turnover (VigiParl'), mixité
  (MixiParl'), mandat et mandature — plus une section « devenir
  collaborateur parlementaire » ; référencée dans le plan du site, le
  sitemap XML et les hubs collaborateurs.
- Fichier `llms.txt` à la racine du site (format llmstxt.org) :
  guide des pages réponses de DataParl' pour les assistants IA et les
  agents (listes de collaborateurs, tiers payants, prestataires, VigiParl',
  MixiParl', méthode et sources).
- Pages « par scrutin de renouvellement » au Sénat : `/groupe/senat/serie-1/2023`,
  `/groupe/senat/serie-2/2020`… et par groupe (`/groupe/senat-lr/serie-1/2023`) —
  les sénateurs élus lors de chaque scrutin organisé depuis 2010 (2011 et 2014
  compris), avec le groupe de l'époque et les renommages harmonisés (UMP → LR…).
  Data-driven : une page n'existe que si des mandats élus cette année-là sont
  enregistrés ; les pages de série (`/groupe/senat/serie-1`) listent les
  scrutins disponibles, et le sitemap XML référence chaque scrutin.
- Pages d'accueil par chambre : `/an`, `/senat`, `/pe` — tout
  ce que DataParl' publie sur chaque chambre (mouvements, collaborateurs,
  parlementaires, groupes et mandatures, VigiParl', MixiParl', et
  sénatoriales 2026 pour le Sénat). Synonymes en redirection :
  `/assemblee-nationale` → `/an` ; `/EP`,
  `/parlement-europeen` et `/parlement-europeen` → `/pe`.
- Pages d'accueil des collaborateurs par chambre (`/collab/an`,
  `/collab/senat`, `/collab/pe`) : liste complète des
  collaborateurs en poste de chaque chambre (`/collab/pe/liste`…),
  entrées par parti (`/parti`) et par groupe (`/groupe`),
  recherche des équipes, et pour le Parlement européen les tiers payants,
  les prestataires et le réseau ; VigiParl' et MixiParl' étendus au
  Parlement européen (`/vigiparl/pe` et `/mixiparl/pe`),
  classements élu par élu désormais reliés entre les trois chambres.
- Pages « groupes par mandature » : une chambre pendant une mandature
  (`/groupe/an/xvii`, `/groupe/pe/10e`, `/groupe/senat/serie-1`…)
  et un groupe pendant une mandature (`/groupe/pe-renew/10e`,
  `/groupe/an-rn/xvii`…), avec le groupe de l'époque de chaque élu ;
  renommages harmonisés (FN → RN, UMP → LR, LFI → LFI-NFP, ALDE → Renew,
  ID et EF → Patriots…) et mandatures déduites des mandats enregistrés
  (« jusqu'où on a les valeurs ») ; au Sénat, qui n'a pas de législature
  numérotée, les pages suivent les deux séries de renouvellement
  (série 1, renouvelée en 2023 ; série 2, renouvelée en 2020 puis 2026).
  Les fiches de groupes, l'index `/groupe` et le sitemap XML pointent
  vers ces pages.
- Schémas Table Schema des jeux de données data.gouv.fr (membres des
  gouvernements, turnover annuel, mixité annuelle, parlementaires) : dossier
  `public/schemas/`, servis sur `raw.dataparl.fr/schemas/…`.
- Feuille « Parlementaires (2017 → aujourd'hui) » dans DataParl' Sheets.
- Fichiers de gouvernance du dépôt : `LICENSE` (MIT), `SECURITY.md`,
  `CHANGELOG.md`.
- Enquête utilisateurs : questionnaire survey.dataparl.fr (3 notes —
  expérience, contenu de fond, globale — et un commentaire), proposé sur le
  site après 4 minutes à un visiteur connecté (une fois, lien par jeton
  rattaché au compte) ; réponses et notes dans l'admin (Contenu → Enquête
  utilisateurs). Table : scripts/survey.sql.

### Modifié

- Perf : AdSense (`ca-pub-6168263680630864`) chargé uniquement après
  consentement via `chargerPub()` (~220 Ko évités par défaut) ; GA4
  (G-GC1JD019GY) déployé via le conteneur GTM (GTM-KW3MJMTK) seul, plus
  gtag.js en direct — fin de la double mesure (~450 Ko de scripts en
  moins au chargement).
- Sitemap XML et plan du site : `/collab/parti`, pages Turnover par
  chambre, trombinoscopes, classements, `/donnees` et `/reutilisations`.
- SEO « liste des collaborateurs » : titres, H1 et réponses directes
  chiffrées (effectif en poste, mois et date de génération calculés) sur
  `/collab`, `/collab/an`, `/collab/senat`, `/collab/pe`,
  les listes par chambre et `/collab/liste` ; FAQ citable sur chaque hub
  et données structurées JSON-LD (`Dataset`, `FAQPage`,
  `BreadcrumbList`) pour les moteurs de recherche et les assistants IA.
- `/collab/liste` : correction du texte d'introduction, de la pagination
  et de la clé des lignes du tableau qui affichaient littéralement
  `${…}` (expressions jamais évaluées) depuis la création de la page.
- Plan du site (`/sitemap`) et `sitemap.xml` : ajout des pages du Parlement
  européen — tiers payants, prestataires, réseau des collaborateurs, et une
  URL par fiche structure dans le plan XML.
- Accueil : le compteur détaille les trois chambres (Assemblée, Sénat,
  Parlement européen) et « Explorer » pointe vers les mouvements du
  Parlement européen (`/mouvements/europarl`).
- Carte SIREN des structures du Parlement européen : la section « Qui
  encaisse l'argent ? » devient « Qui dirige la structure ? »
  (formulation neutre, mêmes informations : dirigeants et bénéficiaires
  effectifs).
- Pages « structures du Parlement européen » : tiers payants, prestataires
  et réseau vivent désormais sous `/collab/pe/` (segment chambre `pe`,
  comme les photos des élus) ; les anciens chemins `/collab/tiers-payants`,
  `/collab/prestataires` et `/collab/reseau` redirigent en 308, fiches
  comprises.
- Le tableur DataParl' Sheets vit désormais sur `media.dataparl.fr/sheets`
  (et `/search`) ; `www.dataparl.fr/sheets` et l'ancien domaine
  `drive.dataparl.fr` redirigent en 308 vers `media`.
- Interstitiel sur `media.dataparl.fr` : tout chemin autre que les photos
  et le tableur affiche un message pendant 15 secondes avant la bascule
  automatique vers la même adresse sur `www.dataparl.fr` (page
  `redirection-media`, compte à rebours).
- Site de l'API : pied de page dédié («© 2026 DataParl' API : DataParl' au
  format brut. ») avec Plan du site (api.dataparl.fr/sitemap, nouvelle page)
  et Informations légales (CGU API sur www, avec retour vers l'API).
- Polices DM Sans et Spectral auto-hébergées via next/font (préchargées,
  police de repli aux métriques ajustées) : fin du reflow au chargement des
  polices Google (CLS 0,27 → ~0 sur l'accueil, mesuré PageSpeed). DM Sans pour
  le corps de texte, Spectral pour les titres — visuel inchangé.
- Emails d'alertes : nouvel en-tête épuré (fini le bandeau bleu nuit du
  DataParl' Daily/Weekly), pied de page réduit à une ligne, et expéditeurs
  dédiés `dataparl-daily@dataparl.fr` / `dataparl-weekly@dataparl.fr`
  (à valider dans Resend).
- Alertes : fréquences cumulables (Daily ET Weekly, cases à cocher ;
  scripts/alertes-frequences.sql), champs Prénom/Nom retirés du réglage (la
  ligne « À l'attention de » prend les infos du compte), filtres Parti et
  Commission en attente retirés de la page, lien « Mon compte » dans le pied
  des emails.
- En-tête www : logo à gauche, recherche au centre, menu déroulant à droite
  sur toutes les tailles d'écran.
- Session : rafraîchissement explicite du jeton avant chaque action —
  fin des « non connecté » après une inactivité (onglet en arrière-plan).
- Cron Vercel `/api/cron/jorf` retiré (DILA injoignable depuis les IP Vercel).

## 2026 — précédents

Le projet a démarré sans journal de versions : l'historique git fait foi
(site, alertes, compte, administration, webmail, API v1, DataParl' Sheets).
