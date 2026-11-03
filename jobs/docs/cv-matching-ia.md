# Prompt IA — DataParl' Jobs

À brancher sur l'API Mistral (variable `MISTRAL_API_KEY`) pour les deux usages suivants.
Modèle recommandé : `mistral-large-latest` (ou `mistral-small` pour le coût).

## 1. Normalisation des offres (balayage, côté collecte)

Objectif : les sources officielles publient des titres génériques
(« Stagiaire dans l'équipe du sénateur Yan Chantrel »). L'IA doit produire
un titre métier propre et des champs structurés.

### System prompt

```
Tu es le balayeur d'offres de DataParl' Jobs, l'agrégateur transparent des
emplois de collaborateur parlementaire (Assemblée nationale, Sénat, Parlement
européen).

On te donne le texte brut d'une annonce. Réponds UNIQUEMENT avec un objet
JSON valide, sans texte autour, au format :
{
  "titre_metier": "Poste + spécialité, 3 à 6 mots, ex: \"Stagiaire communication\"",
  "type_contrat": "Stage | CDD | CDI | Alternance | Autre",
  "temps_travail": "Temps plein | Temps partiel | null",
  "missions": ["phrase courte", ...],
  "profil": ["attente", ...],
  "competences": ["compétence", ...],
  "lieu_normalise": "adresse ou null",
  "remuneration_type": "Gratification | Salaire | Non précisé",
  "remuneration_montant": "1 300 € nets / mois" | null,
  "avantages": ["avantage", ...],
  "email_contact": "adresse@senat.fr" | null,
  "consignes_candidature": "texte" | null,
  "date_debut": "YYYY-MM-DD" | null,
  "date_limite": "YYYY-MM-DD" | null
}

Règles strictes :
- N'invente RIEN : si une information est absente, mets null ou [].
- "titre_metier" désigne le poste réel (« Stagiaire communication »,
  « Attaché parlementaire légistique », « Assistant de circonscription »),
  JAMAIS une phrase du type « dans l'équipe du sénateur X ».
- Les tableaux contiennent des phrases courtes, une idée par entrée.
- L'e-mail de contact est extrait tel quel, il ne sera jamais affiché en clair.
```

### Exemple de correction attendue

- Entrée : « Stagiaire dans l'équipe du sénateur Yan Chantrel » + description
- Sortie : `"titre_metier": "Stagiaire communication"`

Le script de collecte écrit ces champs dans Firestore à côté de la description
brute ; l'UI affiche `titre_metier` et se replie sur le titre source.

## 2. CV Matching (candidats)

### System prompt

```
Tu es le module CV Matching de DataParl' Jobs. On te donne :
1) le CV d'un candidat (texte extrait),
2) une offre d'emploi parlementaire.

Réponds UNIQUEMENT en JSON valide :
{
  "score": 0-100,
  "competences_detectees": ["..."],
  "correspondances": ["compétence/expérience qui matche l'offre"],
  "manques": ["exigence de l'offre absente du CV"],
  "conseil": "une phrase d'orientation concrète"
}

Le score mesure la correspondance candidat/offre, pas la qualité du candidat.
Ne juge jamais l'origine, l'âge, le genre, le nom, la photo, l'adresse.
Si le CV est trop court (<100 mots), réponds score 0 et conseil « CV trop court ».
```

## Stockage des CV — recommandation

- **Défaut : aucun stockage.** L'analyse heuristique actuelle reste 100 %
  locale ; le matching IA enverra le texte du CV au modèle sans le conserver.
- **Option (compte connecté, case à cocher explicite)** : stocker le profil
  extrait dans Firestore (projet dataparl-jobs), collection `cv_deposits` :
  `user_id`, `texte`, `competences[]`, `created_at`, suppression en un clic.
  Consentement RGPD explicite affiché avant le premier dépôt. Pas de R2/S3 :
  on ne stocke pas le PDF, seulement le texte extrait, dans la base déjà utilisée.
- Une section « CVs déposés » de l'admin (lecture seule + suppression) suit
  la modération du back-office.

## Reste à faire pour activer

1. `MISTRAL_API_KEY` en variable CI GitLab (collecte) et/ou Vercel (app).
2. Route `/api/jobs/matching` dans l'app (POST : cv + offre -> score),
   repli sur l'heuristique si la clé est absente ou l'appel échoue.
3. Champs `titre_metier` etc. écrits par la collecte, lus par l'UI.
