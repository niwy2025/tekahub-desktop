# TekaHub Desktop

Application desktop installable (Electron + React + TypeScript + Vite) avec :

1. **Shell** installé une fois (runtime, fenêtre, IPC, auto-update, sécurité)
2. **Packs dynamiques** téléchargés dans le dossier utilisateur (hors Program Files / Applications)

## Architecture

```
teka-desktop/
├── apps/desktop/          # Electron main + preload + renderer React
├── packages/shared/       # Types, schéma packs, crypto, versions
├── scripts/               # Clés, manifest, publish pack
├── example-packs/         # Exemple de contenu pack
└── manifests/             # Exemples JSON de release
```

### Données utilisateur (packs / cache / config)

| OS | Chemin |
|----|--------|
| Windows | `%APPDATA%/TekaHub/` |
| macOS | `~/Library/Application Support/TekaHub/` |
| Linux | `~/.config/TekaHub/` |

Sous-dossiers : `packs/`, `cache/`, `config/`.

Layout d’un pack :

```
packs/<packId>/
  version-1.0.0/
  version-1.0.1/
  current.json          # pointeur atomique (+ previous* pour rollback)
```

## Prérequis

- Node.js ≥ 20
- npm 10+
- Pour packager : dépendances système electron-builder (selon OS)

## Démarrage rapide

```bash
cd teka-desktop
cp .env.example .env
# Éditer API_BASE_URL (ex: https://api-tekahub.niwytech.cloud)
npm install
npm run build:shared
npm run dev
```

Sous Linux, `npm run dev` désactive le sandbox Chromium (`ELECTRON_DISABLE_SANDBOX=1`) — requis quand `chrome-sandbox` n’est pas en setuid root. Alternative (une fois, avec sudo) :

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

### API & login

Le renderer ne parle **pas** directement à Laravel : le process main appelle `API_BASE_URL` (login, me, logout) et stocke le token chiffré via `safeStorage` dans `userData/config/`.

```env
API_BASE_URL=https://api-tekahub.niwytech.cloud
```

Sans cette variable, l’écran de connexion affiche un message de configuration.

## Scripts utiles

| Commande | Rôle |
|----------|------|
| `npm run dev` | Shell en mode développement |
| `npm run build` | Build shared + desktop |
| `npm run dist` | Installateurs via electron-builder |
| `npm run dist:linux` | AppImage |
| `npm run dist:win` | NSIS `.exe` |
| `npm run dist:mac` | `.dmg` |
| `npm run generate:keys` | Paire Ed25519 pour signer les packs |
| `npm run generate:manifest` | Manifest signé à partir d’un zip |
| `npm run publish:pack` | Zip + sign + prêt CDN |

## Variables d’environnement

Voir `.env.example`.

| Variable | Description |
|----------|-------------|
| `UPDATE_PROVIDER` | `github` (défaut) ou `generic` (S3/CDN) |
| `GH_OWNER` / `GH_REPO` | Repo GitHub des releases shell |
| `UPDATE_URL` | Base URL si `generic` (doit servir `latest.yml` / `latest-linux.yml`…) |
| `PACKS_UPDATE_URL` | Base URL des packs (`/<id>/manifest.json`) |
| `PACKS_PUBLIC_KEY` | Clé publique Ed25519 (base64 SPKI ou PEM) — **jamais** la privée |
| `TEKA_SKIP_UPDATE_CHECK=1` | Désactive l’auto-update shell |
| `TEKA_SKIP_PACK_CHECK=1` | Désactive le check packs |

Les secrets (`.env`, `keys/packs-private.pem`) sont gitignored.

## Auto-update du shell (electron-updater)

1. Configurer `publish` dans `apps/desktop/package.json` (GitHub) **ou** `UPDATE_URL` + provider `generic`.
2. Builder et publier une release :

```bash
# Exemple GitHub (nécessite GH_TOKEN avec droits releases)
export GH_TOKEN=ghp_xxx
npm run dist
# electron-builder upload vers la release taguée, ou upload manuel des artefacts + latest*.yml
```

3. Au lancement, l’app :
   - vérifie une mise à jour
   - télécharge en arrière-plan
   - affiche **Redémarrer pour appliquer**
   - `quitAndInstall` remplace le binaire **sans désinstaller**

### Tester l’auto-update en local

1. Publier une version `0.1.0` packagée.
2. Monter la version dans `apps/desktop/package.json` à `0.1.1`, rebuild, héberger les artefacts + `latest-linux.yml` (ou équivalent) sur un serveur local / dossier static.
3. Pointer `UPDATE_PROVIDER=generic` et `UPDATE_URL=http://127.0.0.1:8080/`.
4. Lancer l’**installateur** `0.1.0` (pas `npm run dev` — l’updater est désactivé hors package).
5. Vérifier le badge → Téléchargement… → Redémarrer pour appliquer.

Serveur static rapide :

```bash
npx serve -l 8080 ./apps/desktop/release
```

## Packs dynamiques

### Générer des clés

```bash
npm run generate:keys
# Copier PACKS_PUBLIC_KEY=... dans .env (et dans le pipeline de build)
```

### Publier un pack

```bash
npm run publish:pack -- \
  --id core-ui \
  --version 1.0.0 \
  --src ./example-packs/core-ui \
  --out ./dist-packs
```

Uploader sur le CDN :

```
$PACKS_UPDATE_URL/core-ui/manifest.json
$PACKS_UPDATE_URL/core-ui/core-ui-1.0.0.zip
```

### Flux client

1. Fetch `manifest.json`
2. Vérifier signature Ed25519 sur `id:version:sha256`
3. Télécharger l’archive → vérifier SHA-256
4. Extraire dans `version-X.tmp` → rename atomique → mettre à jour `current.json`
5. Conserver la version précédente pour **rollback**
6. UI : À jour / Téléchargement… / Redémarrer pour appliquer

Les packs **ne sont jamais** écrits dans le dossier d’installation.

## Sécurité

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Preload minimal via `contextBridge` (`window.teka`)
- CSP stricte (HTML + session)
- Packs refusés si hash ou signature invalides
- Pas d’exécution de code pack non vérifié côté main (le shell charge l’UI embarquée ; l’intégration d’un entrypoint pack dans une fenêtre dédiée se fait après validation)

## Packaging multi-OS

```bash
npm run dist:linux   # AppImage
npm run dist:win     # NSIS
npm run dist:mac     # dmg (sur macOS)
```

Artefacts dans `apps/desktop/release/`.

Pour la signature code (Windows Authenticode / macOS notarization), configurer les variables electron-builder (`CSC_LINK`, `CSC_KEY_PASSWORD`, Apple ID, etc.) — hors scope de ce dépôt (secrets CI).
