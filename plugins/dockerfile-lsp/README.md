# 🐳 dockerfile-lsp

> Diagnostics, complétion et bonnes pratiques **Dockerfile** grâce au **Docker Language Server** officiel de Docker Inc.

![GitHub Copilot CLI](https://img.shields.io/badge/GitHub_Copilot_CLI-compatible-8957e5?logo=githubcopilot&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-compatible-d97757?logo=anthropic&logoColor=white)
![Agent Plugins](https://img.shields.io/badge/Agent_Plugins-1.0-0969da)
![Licence](https://img.shields.io/badge/licence-Apache_2.0-green)

Ce plugin branche le serveur de langage **Docker Language Server** sur votre agent IA. Au lieu de deviner la structure du code par recherche textuelle, l'agent interroge le serveur comme le ferait un IDE : résultats plus **précis**, plus **rapides** et moins coûteux en **contexte**.

## ✨ Ce que votre agent sait faire avec ce plugin

| Capacité | Exemple de demande |
|---|---|
| 🎯 Aller à la définition | « Où est défini ce symbole ? » |
| 🔎 Trouver les références | « Qui appelle cette fonction ? » |
| ✏️ Renommer un symbole | « Renomme cette classe dans tout le projet » |
| 🩺 Diagnostics | « Corrige les erreurs signalées dans ce fichier » |
| 💬 Survol (types, documentation) | « Quel est le type de cette variable ? » |
| 🗺️ Symboles du document et de l'espace de travail | « Liste les classes de ce module » |

> Les capacités réellement disponibles dépendent de ce que le serveur implémente.

## 🧩 Compatibilité

| Agent | Fichier de configuration LSP | Format |
|---|---|---|
| **GitHub Copilot CLI** | `com.github.copilot/lsp.json` | [Agent Plugins 1.0](https://github.com/agentplugins/agent-plugins-spec) (`plugin.json` racine) |
| **Claude Code** | `.lsp.json` | Plugin Claude Code (`.claude-plugin/plugin.json`) |

Les deux fichiers décrivent le même serveur (`docker-language-server start --stdio`). Ils existent en double car les deux agents n'utilisent pas les mêmes noms de champs (`fileExtensions` pour Copilot, `extensionToLanguage` pour Claude).

## 📋 Prérequis

- Aucun pour les binaires précompilés, ou **Go 1.24+** pour une installation via `go install`

## ⚙️ 1. Installer le serveur de langage

Le plugin ne contient que la configuration : le serveur doit être installé sur votre machine et accessible dans le `PATH`.

**Go**

```bash
go install github.com/docker/docker-language-server/cmd/docker-language-server@latest
```

**Binaire précompilé (Linux x64)**

```bash
VERSION=$(curl -fsSL https://api.github.com/repos/docker/docker-language-server/releases/latest | grep -oP '"tag_name": "\K[^"]+')
curl -fsSL -o ~/.local/bin/docker-language-server \
  "https://github.com/docker/docker-language-server/releases/download/${VERSION}/docker-language-server-linux-amd64-${VERSION}"
chmod +x ~/.local/bin/docker-language-server
```

## 📦 2. Installer le plugin

### GitHub Copilot CLI

```bash
copilot plugin marketplace add SebastienDegodez/copilot-instructions
copilot plugin install dockerfile-lsp@copilot-instructions-sebastien-degodez
```

Ou directement, sans passer par la marketplace :

```bash
copilot plugin install SebastienDegodez/copilot-instructions:plugins/dockerfile-lsp
```

### Claude Code

```text
/plugin marketplace add SebastienDegodez/copilot-instructions
/plugin install dockerfile-lsp@copilot-instructions-sebastien-degodez
```

## ✅ 3. Vérifier que tout fonctionne

**Dans GitHub Copilot CLI** :

```text
/lsp list
/lsp test docker
```

**Dans Claude Code** : ouvrez une nouvelle session dans votre projet, puis demandez par exemple « Trouve toutes les références de `maFonction` ». En cas de souci, `claude --debug` affiche les journaux de démarrage du serveur.

## 🗂️ Fichiers pris en charge

| Extension | Identifiant de langage |
|---|---|
| `.dockerfile` | `dockerfile` |
| `.containerfile` | `dockerfile` |

## 💡 Conseils

- ⚠️ **Limitation** : les agents associent un fichier à un serveur par son **extension**. Un fichier nommé simplement `Dockerfile` (sans extension) n'est donc pas pris en charge. Préférez des noms comme `api.dockerfile` ou `Containerfile` renommé en `app.containerfile`, puis `docker build -f api.dockerfile .`.
- Le serveur sait aussi analyser Compose et Bake, mais ce plugin ne lui envoie que les Dockerfiles pour ne pas entrer en conflit avec `yaml-lsp`.

## 🛠️ Dépannage

| Symptôme | Solution |
|---|---|
| `/lsp test docker` échoue avec « command not found » | Le binaire n'est pas dans le `PATH` : relancez l'étape 1 et ouvrez un nouveau terminal. |
| Aucun diagnostic sur `Dockerfile` | Normal : sans extension, le fichier n'est pas routé. Renommez-le avec l'extension `.dockerfile`. |

Pour désactiver ce serveur dans un dépôt précis (Copilot CLI), ajoutez dans `.github/lsp.json` :

```json
{ "lspServers": { "docker": { "disabled": true } } }
```

## 📁 Structure du plugin

```text
dockerfile-lsp/
├── plugin.json                      # Manifeste Agent Plugins 1.0 (Copilot CLI)
├── .claude-plugin/
│   └── plugin.json                  # Manifeste Claude Code
├── .lsp.json                        # Serveur LSP pour Claude Code
├── com.github.copilot/
│   └── lsp.json                     # Serveur LSP pour Copilot CLI
├── plugin.yaml                      # Métadonnées du site de documentation
└── README.md
```

## 🔗 Liens utiles

- [Docker Language Server](https://github.com/docker/docker-language-server)
- [Releases](https://github.com/docker/docker-language-server/releases)
- [Serveurs LSP dans GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli/set-up-copilot-cli/add-lsp-servers)
- [Plugins Claude Code](https://code.claude.com/docs/en/plugins-reference)

---

Auteur : **Sebastien DEGODEZ** · Licence : Apache 2.0
