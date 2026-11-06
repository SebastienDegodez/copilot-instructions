# 📝 markdown-lsp

> Liens vérifiés, navigation entre titres et références dans la documentation **Markdown** grâce à **Marksman**. Idéal pour les `SKILL.md`, `AGENTS.md` et fichiers d'instructions.

![GitHub Copilot CLI](https://img.shields.io/badge/GitHub_Copilot_CLI-compatible-8957e5?logo=githubcopilot&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-compatible-d97757?logo=anthropic&logoColor=white)
![Agent Plugins](https://img.shields.io/badge/Agent_Plugins-1.0-0969da)
![Licence](https://img.shields.io/badge/licence-Apache_2.0-green)

Ce plugin branche le serveur de langage **Marksman** sur votre agent IA. Au lieu de deviner la structure du code par recherche textuelle, l'agent interroge le serveur comme le ferait un IDE : résultats plus **précis**, plus **rapides** et moins coûteux en **contexte**.

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

Les deux fichiers décrivent le même serveur (`marksman server`). Ils existent en double car les deux agents n'utilisent pas les mêmes noms de champs (`fileExtensions` pour Copilot, `extensionToLanguage` pour Claude).

## 📋 Prérequis

- Aucun (binaire autonome)

## ⚙️ 1. Installer le serveur de langage

Le plugin ne contient que la configuration : le serveur doit être installé sur votre machine et accessible dans le `PATH`.

**macOS (Homebrew)**

```bash
brew install marksman
```

**Linux x64**

```bash
curl -fsSL -o ~/.local/bin/marksman \
  https://github.com/artempyanykh/marksman/releases/latest/download/marksman-linux-x64
chmod +x ~/.local/bin/marksman
```

**Windows (Scoop)**

```bash
scoop install marksman
```

## 📦 2. Installer le plugin

### GitHub Copilot CLI

```bash
copilot plugin marketplace add SebastienDegodez/copilot-instructions
copilot plugin install markdown-lsp@copilot-instructions-sebastien-degodez
```

Ou directement, sans passer par la marketplace :

```bash
copilot plugin install SebastienDegodez/copilot-instructions:plugins/markdown-lsp
```

### Claude Code

```text
/plugin marketplace add SebastienDegodez/copilot-instructions
/plugin install markdown-lsp@copilot-instructions-sebastien-degodez
```

## ✅ 3. Vérifier que tout fonctionne

**Dans GitHub Copilot CLI** :

```text
/lsp list
/lsp test marksman
```

**Dans Claude Code** : ouvrez une nouvelle session dans votre projet, puis demandez par exemple « Trouve toutes les références de `maFonction` ». En cas de souci, `claude --debug` affiche les journaux de démarrage du serveur.

## 🗂️ Fichiers pris en charge

| Extension | Identifiant de langage |
|---|---|
| `.md` | `markdown` |
| `.markdown` | `markdown` |

## 💡 Conseils

- Marksman signale les liens cassés vers des fichiers ou des titres (`[texte](autre.md#titre)`).
- Les liens de type wiki `[[page]]` sont pris en charge.
- Ajoutez un fichier `.marksman.toml` (même vide) pour marquer la racine d'un projet de documentation.

## 🛠️ Dépannage

| Symptôme | Solution |
|---|---|
| `/lsp test marksman` échoue avec « command not found » | Le binaire n'est pas dans le `PATH` : relancez l'étape 1 et ouvrez un nouveau terminal. |
| Liens vers d'autres dossiers non résolus | Créez un `.marksman.toml` à la racine du dépôt. |

Pour désactiver ce serveur dans un dépôt précis (Copilot CLI), ajoutez dans `.github/lsp.json` :

```json
{ "lspServers": { "marksman": { "disabled": true } } }
```

## 📁 Structure du plugin

```text
markdown-lsp/
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

- [Marksman](https://github.com/artempyanykh/marksman)
- [Releases](https://github.com/artempyanykh/marksman/releases)
- [Serveurs LSP dans GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli/set-up-copilot-cli/add-lsp-servers)
- [Plugins Claude Code](https://code.claude.com/docs/en/plugins-reference)

---

Auteur : **Sebastien DEGODEZ** · Licence : Apache 2.0
