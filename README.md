# Ma Ludothèque (Débutant Friendly)

Application web pour gérer tes jeux vidéo :
- enregistrer les jeux en base
- grille de plateformes (style Big Picture) pour naviguer
- ouvrir une plateforme puis voir sa liste de jeux et en ajouter
- marquer un jeu comme terminé/non terminé
- indiquer si le jeu est en format physique ou numérique
- récupérer automatiquement des métadonnées (titre, plateformes, genre, image, description)
- ouvrir une fiche complète par jeu (description FR, année, éditeur, images, vidéos)
- exécution avec Docker

## Stack
- Backend: Flask + SQLAlchemy
- Base de données: PostgreSQL
- Frontend: HTML/CSS/JavaScript simple
- Métadonnées: IGDB (auth Twitch)
- Conteneurisation: Docker + Docker Compose

## Structure du projet
```text
app/
  __init__.py            # Factory Flask
  config.py              # Chargement centralisé de la config (env)
  constants.py           # Constantes métier
  db_init.py             # Initialisation/compatibilité schéma DB
  extensions.py          # Extensions Flask (SQLAlchemy)
  models.py              # Modèles SQLAlchemy
  routes.py              # Endpoints API + vues
  igdb.py                # Client IGDB/Twitch + normalisation
  services/
    game_sheet_service.py
    metadata_service.py
  static/
  templates/
```

Règles appliquées:
- Pas de valeurs magiques dans les routes (constantes/config partagées).
- Initialisation DB séparée de la factory Flask.
- Logique métier réutilisable dans `services/`.

## Prérequis
- Docker
- Docker Compose
- Identifiants IGDB/Twitch (`IGDB_CLIENT_ID` et `IGDB_CLIENT_SECRET`)

## Lancer le projet
1. Copier le fichier d'environnement:
```bash
cp .env.example .env
```
2. Éditer `.env` et ajouter:
- `IGDB_CLIENT_ID`
- `IGDB_CLIENT_SECRET`
3. Lancer:
```bash
docker compose up --build
```
4. Ouvrir:
- http://localhost:5001

## Utilisation
1. Depuis la grille, choisis une plateforme (ou crée-la).
2. Dans la page plateforme, recherche les métadonnées d'un jeu.
3. Clique sur "Utiliser ces métadonnées", puis ajoute le jeu.
4. Clique sur une carte jeu pour ouvrir sa fiche complète.

## API principale
- `GET /api/games`
- `POST /api/games`
- `PATCH /api/games/<id>`
- `DELETE /api/games/<id>`
- `GET /api/platforms`
- `GET /api/metadata/search?query=...`
- `GET /api/metadata/details/<igdb_id>`
- `GET /api/metadata/by-title?title=...&platform=...`
- `GET /api/games/<id>/sheet`

## Remarques
- Si les variables IGDB ne sont pas définies, l'ajout manuel fonctionne toujours.
- La table est créée automatiquement au démarrage de l'app.
- `SHEET_CACHE_TTL_SECONDS` permet d'ajuster le cache des fiches (en secondes).
