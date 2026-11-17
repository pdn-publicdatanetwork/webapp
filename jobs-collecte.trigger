# Déclencheur de la collecte : toute modification de ce fichier lance
# le workflow « Collecte Jobs » (filtre paths du déclencheur push).
# Contenu libre, dater chaque modification.
2026-11-13T00:15Z : run de rattrapage après l'épuisement du quota CI GitLab (collecte arrêtée depuis le 09/11).
2026-11-17T13:28:04.226Z : test du jeton GitLab remis par OIDC (route ci-jeton du webapp), après la compromission du 17/11.
2026-11-17T13:48:30Z : 2e test OIDC, route ci-jeton instrumentée (journal ci_jeton_journal) : refus raison « jwks » (URL .well-known/jwks.json en 404).
2026-11-17T14:05:00Z : 3e test après fix JWKS (/.well-known/jwks sans .json).
