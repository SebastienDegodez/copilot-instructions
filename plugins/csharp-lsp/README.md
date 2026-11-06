# 🟣 csharp-lsp

> Navigation, diagnostics et refactorings C# basés sur **Roslyn** grâce à **csharp-ls**.

![GitHub Copilot CLI](https://img.shields.io/badge/GitHub_Copilot_CLI-compatible-8957e5?logo=githubcopilot&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-compatible-d97757?logo=anthropic&logoColor=white)
![Agent Plugins](https://img.shields.io/badge/Agent_Plugins-1.0-0969da)
![Licence](https://img.shields.io/badge/licence-Apache_2.0-green)

Ce plugin branche le serveur de langage **csharp-ls** sur votre agent IA. Au lieu de deviner la structure du code par recherche textuelle, l'agent interroge le serveur comme le ferait un IDE : résultats plus **précis**, plus **rapides** et moins coûteux en **contexte**.

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

Les deux fichiers décrivent le même serveur (`csharp-ls`). Ils existent en double car les deux agents n'utilisent pas les mêmes noms de champs (`fileExtensions` pour Copilot, `extensionToLanguage` pour Claude).

## 📋 Prérequis

- **.NET SDK 10+** (requis par les versions récentes de `csharp-ls`)

## ⚙️ 1. Installer le serveur de langage

Le plugin ne contient que la configuration : le serveur doit être installé sur votre machine et accessible dans le `PATH`.

**Outil .NET global (recommandé)**

```bash
dotnet tool install --global csharp-ls
```

**Mise à jour**

```bash
dotnet tool update --global csharp-ls
```

## 📦 2. Installer le plugin

### GitHub Copilot CLI

```bash
copilot plugin marketplace add SebastienDegodez/copilot-instructions
copilot plugin install csharp-lsp@copilot-instructions-sebastien-degodez
```

Ou directement, sans passer par la marketplace :

```bash
copilot plugin install SebastienDegodez/copilot-instructions:plugins/csharp-lsp
```

### Claude Code

```text
/plugin marketplace add SebastienDegodez/copilot-instructions
/plugin install csharp-lsp@copilot-instructions-sebastien-degodez
```

## ✅ 3. Vérifier que tout fonctionne

**Script de diagnostic** fourni avec le plugin (depuis un clone de ce dépôt) :

```bash
bash plugins/csharp-lsp/skills/csharp-lsp-setup/scripts/check.sh
```

**Dans GitHub Copilot CLI** :

```text
/lsp list
/lsp test csharp-ls
```

**Dans Claude Code** : ouvrez une nouvelle session dans votre projet, puis demandez par exemple « Trouve toutes les références de `maFonction` ». En cas de souci, `claude --debug` affiche les journaux de démarrage du serveur.

> 💡 Le plugin embarque la skill **`csharp-lsp-setup`** : demandez simplement à votre agent « Configure le LSP C# » et il vérifiera l'installation pour vous.

## 🗂️ Fichiers pris en charge

| Extension | Identifiant de langage |
|---|---|
| `.cs` | `csharp` |

## 💡 Conseils

- Vérifiez que `~/.dotnet/tools` est dans votre `PATH`.
- Le serveur charge la solution (`.sln` / `.slnx`) ou le projet trouvé à la racine. Si plusieurs solutions existent, ajoutez `"--solution", "MaSolution.sln"` dans `args`.
- Exécutez `dotnet restore` avant la première session pour que les références NuGet soient résolues.

## 🛠️ Dépannage

| Symptôme | Solution |
|---|---|
| `/lsp test csharp-ls` échoue avec « command not found » | Le binaire n'est pas dans le `PATH` : relancez l'étape 1 et ouvrez un nouveau terminal. |
| `csharp-ls: command not found` | Ajoutez `export PATH="$PATH:$HOME/.dotnet/tools"` à votre profil shell. |
| Références NuGet en erreur | Lancez `dotnet restore` puis redémarrez le serveur (`/lsp reload` dans Copilot CLI). |

Pour désactiver ce serveur dans un dépôt précis (Copilot CLI), ajoutez dans `.github/lsp.json` :

```json
{ "lspServers": { "csharp-ls": { "disabled": true } } }
```

## 📁 Structure du plugin

```text
csharp-lsp/
├── plugin.json                      # Manifeste Agent Plugins 1.0 (Copilot CLI)
├── .claude-plugin/
│   └── plugin.json                  # Manifeste Claude Code
├── .lsp.json                        # Serveur LSP pour Claude Code
├── com.github.copilot/
│   └── lsp.json                     # Serveur LSP pour Copilot CLI
├── skills/
│   └── csharp-lsp-setup/
│       ├── SKILL.md                 # Skill d'installation et de diagnostic
│       └── scripts/check.sh         # Vérifie la présence du serveur
├── plugin.yaml                      # Métadonnées du site de documentation
└── README.md
```

## 🔗 Liens utiles

- [csharp-ls](https://github.com/razzmatazz/csharp-language-server)
- [SDK .NET](https://dotnet.microsoft.com/download)
- [Serveurs LSP dans GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli/set-up-copilot-cli/add-lsp-servers)
- [Plugins Claude Code](https://code.claude.com/docs/en/plugins-reference)

---

Auteur : **Sebastien DEGODEZ** · Licence : Apache 2.0
