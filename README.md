# GT Auto Privé

Application web du club d'investissement automobile. Le front est une SPA React servie en statique. Les données de démonstration vivent dans le navigateur (`src/data/seed.js`) : il n'y a ni API, ni base de données, ni migration.

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

Aucune variable applicative : le build n'utilise que `import.meta.env.PROD`, fourni par Vite. Pas de secret à renseigner.

### Lancer

Depuis la racine du dépôt, sur le serveur :

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f web
curl -fsS http://127.0.0.1:8093/health
curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8093/
```

`/health` doit répondre `ok`. La racine doit répondre `200`.

Il n'y a pas de seed ni de migration à exécuter. Le jeu de données de démo est compilé dans le JavaScript.

### Mettre à jour

```bash
git pull
docker compose up -d --build
```

`/sw.js`, `/manifest.webmanifest` et `index.html` ne sont pas mis en cache longtemps, pour que la PWA prenne le nouveau build. Les fichiers sous `/assets/` (noms hashés par Vite) sont cachés un an.
