# Captures presse

Images des cartes de la revue de presse, page /presse/ils-parlent-de-nous.

Le champ `capture` de `app/(site)/presse/mentions.ts` contient le chemin servi,
racine du site comprise : `public/presse/exemple.png` se note `/presse/exemple.png`.

Pour ajouter une capture :

1. Déposer l'image ici (PNG, 600 à 1200 px de large, idéalement moins de 500 Ko).
2. Dans `app/(site)/presse/mentions.ts`, remplir :
   - `capture` : le chemin servi (commence par `/presse/`) ;
   - `legendeCapture` : la légende affichée sous l'image ;
   - `creditCapture` : le crédit, obligatoire pour une image de presse.
3. La carte passe en deux colonnes (capture à gauche) automatiquement.

## Logos de médias

Le sous-dossier `logos/` contient les logotypes officiels des médias cités,
idéalement en SVG. Le champ `logo` de `mentions.ts` contient le chemin servi
(`/presse/logos/exemple.svg`). Le logo s'affiche dans l'en-tête de la carte,
à la place du nom du média, sur une pastille colorée par la marque du média
(voir `.mention-logo` dans `app/(site)/_styles/presse.css`).

Droits : pour une capture d'article, créditer le média et le photographe et
garder le lien vers l'article original. Une capture de l'interface DataParl'
(fiche certifiée) ne pose aucun problème de droits.
