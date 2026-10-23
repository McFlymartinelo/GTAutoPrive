# GT Auto Privé

Application web du club d'investissement automobile : SPA React (nginx) + API Express/SQLite (conteneur `api`). `/#demo` reste un mode démo en mémoire. Voir `docs/APPLICATION-REELLE.md`.

## Déploiement

Cible : Debian, Docker Compose, tunnel Cloudflare vers `http://localhost:8093` (sous-domaine `gtautoprive.martylab.fr`). HTTPS est terminé par Cloudflare. Seul nginx est joignable depuis l'hôte, et uniquement en loopback.

### Variables

Copier le modèle puis l'ajuster si besoin :

```bash
cp .env.example .env
```

| Variable | Exemple | Rôle |
| --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | `gtautoprive` | Nom du projet Compose |
| `WEB_PORT` | `8093` | Port hôte publié sur `127.0.0.1`. Doit rester `8093` pour le tunnel actuel |
| `DOCKER_NETWORK` | `gtautoprive` | Nom du réseau Docker interne |

Les variables de l'API (`COOKIE_SECURE`, `TRUST_PROXY`, `DATA_DIR=/data`) sont fixées dans `compose.yaml`. La base et les pièces KYC vivent dans le volume Docker `gtdata` : **à sauvegarder**.

### Lancer

Depuis la racine du dépôt, sur le serveur :

```bash
docker compose up -d --build
docker compose exec api node server/create-admin.js   # premier lancement : crée l'administrateur
docker compose ps
docker compose logs -f web
curl -fsS http://127.0.0.1:8093/health
curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8093/
```

`/health` doit répondre `ok`. La racine doit répondre `200`.

Le schéma SQLite est créé automatiquement au démarrage de l'API.

### Mettre à jour

```bash
git pull
docker compose up -d --build
```

`/sw.js`, `/manifest.webmanifest` et `index.html` ne sont pas mis en cache longtemps, pour que la PWA prenne le nouveau build. Les fichiers sous `/assets/` (noms hashés par Vite) sont cachés un an.
