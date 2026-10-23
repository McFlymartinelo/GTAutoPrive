# GT Auto Privé — application réelle (API + base de données)

Club privé d'investissement automobile. Deux modes :

- **Application réelle** (`/`) : comptes, connexion, base SQLite, fichiers privés, API Express.
- **Mode démo** (`/#demo`) : données fictives en mémoire, sans backend.

## Démarrage (développement)

```bash
npm install
npm run create-admin        # crée le compte administrateur (e-mail + mot de passe)
npm run server:dev          # API sur http://localhost:3001
npm run dev                 # front sur http://localhost:5173 (proxy /api -> 3001)
```

## Production (un seul processus)

```bash
npm run build
COOKIE_SECURE=1 TRUST_PROXY=1 npm start   # sert l'API + le front compilé sur le port 3001
```

Variables : `PORT` (3001), `DATA_DIR` (`./data` : base `club.db` + `uploads/`), `COOKIE_SECURE=1` (derrière HTTPS), `TRUST_PROXY=1` (derrière un reverse proxy).
**Sauvegardez `DATA_DIR` régulièrement** (il contient les pièces KYC).

## Parcours

1. Candidat : onglet « Candidater » → reçoit un **numéro de dossier** (`GT-XXXXXXXX`).
2. Admin : « Valider vers Étape 2 » (limite 149 membres vérifiée côté serveur).
3. Candidat : « Mon dossier » → numéro de dossier → crée son compte (e-mail, mot de passe) + dépose RIB / identité / domicile.
4. Candidat : signe la charte (tracé + mot de passe) → membre actif.
5. Membre : promesses, convention + virement, etc. Admin : pointage des virements, commercialisation, clôture.

## Sécurité en place

Mots de passe scrypt, sessions par cookie httpOnly (empreinte SHA-256 en base), limitation des tentatives, contrôle des rôles côté serveur,
montants en centimes et règles métier (plafond des promesses, passage à 100 %) appliquées côté serveur, uploads filtrés (type + signature de fichier),
fichiers servis uniquement après contrôle d'accès, journal d'audit (table `audit`), cache PWA exclu de l'API.

## Reste à faire avant ouverture publique

Réinitialisation de mot de passe par e-mail, signature qualifiée (Yousign/DocuSign) à la place de « tracé + mot de passe »,
chiffrement/rétention des pièces KYC (RGPD), HTTPS + sauvegardes, validation juridique des modèles (charte, convention), revue sécurité par la DSI.
