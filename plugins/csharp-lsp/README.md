# 🟣 csharp-lsp

> Le serveur de langage C# **officiel de Microsoft**, basé sur **Roslyn** : le même moteur que l'extension C# et C# Dev Kit de VS Code.

![GitHub Copilot CLI](https://img.shields.io/badge/GitHub_Copilot_CLI-compatible-8957e5?logo=githubcopilot&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-compatible-d97757?logo=anthropic&logoColor=white)
![Agent Plugins](https://img.shields.io/badge/Agent_Plugins-1.0-0969da)
![Licence](https://img.shields.io/badge/licence-Apache_2.0-green)

Ce plugin branche le serveur de langage **Roslyn Language Server (Microsoft)** sur votre agent IA. Au lieu de deviner la structure du code par recherche textuelle, l'agent interroge le serveur comme le ferait un IDE : résultats plus **précis**, plus **rapides** et moins coûteux en **contexte**.

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

Les deux fichiers décrivent le même serveur (`roslyn-language-server --stdio --autoLoadProjects`). Ils existent en double car les deux agents n'utilisent pas les mêmes noms de champs (`fileExtensions` pour Copilot, `extensionToLanguage` pour Claude).

## 📋 Prérequis

- **.NET SDK 10+**

## ⚙️ 1. Installer le serveur de langage

Le plugin ne contient que la configuration : le serveur doit être installé sur votre machine et accessible dans le `PATH`.

**Outil .NET global**

```bash
dotnet tool install --global roslyn-language-server --prerelease
```

**Mise à jour**

```bash
dotnet tool update --global roslyn-language-server --prerelease
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

**Dans GitHub Copilot CLI** :

```text
/lsp list
/lsp test roslyn
```

**Dans Claude Code** : ouvrez une nouvelle session dans votre projet, puis demandez par exemple « Trouve toutes les références de `maFonction` ». En cas de souci, `claude --debug` affiche les journaux de démarrage du serveur.

## 🗂️ Fichiers pris en charge

| Extension | Identifiant de langage |
|---|---|
| `.cs` | `csharp` |

## 💡 Conseils

- Le paquet `roslyn-language-server` n'est publié qu'en **préversion** sur NuGet : l'option `--prerelease` est obligatoire.
- Vérifiez que `~/.dotnet/tools` est dans votre `PATH`.
- L'option `--autoLoadProjects` est indispensable : ni Copilot CLI ni Claude Code n'ouvrent la solution comme le fait VS Code. Sans elle, le serveur ne charge aucun projet et la navigation entre fichiers ne fonctionne pas.
- Ordre de chargement : `dotnet.defaultSolution` dans `.vscode/settings.json`, sinon l'**unique** `.sln`/`.slnx` à la racine, sinon tous les `.csproj` trouvés (500 au maximum, les dossiers `test`/`tests` étant écartés en premier).
- Sur un gros dépôt, fixez la solution à charger avec `"dotnet.defaultSolution": "src/MaSolution.slnx"` dans `.vscode/settings.json`.
- La télémétrie est activée par défaut ; ajoutez `"--telemetryLevel", "off"` dans `args` pour la désactiver.
- Exécutez `dotnet restore` avant la première session pour que les références NuGet soient résolues.
- Alternative communautaire : **csharp-ls** (`dotnet tool install --global csharp-ls`, commande `csharp-ls` sans argument), également basé sur Roslyn.

## 🛠️ Dépannage

| Symptôme | Solution |
|---|---|
| `/lsp test roslyn` échoue avec « command not found » | Le binaire n'est pas dans le `PATH` : relancez l'étape 1 et ouvrez un nouveau terminal. |
| `roslyn-language-server: command not found` | Ajoutez `export PATH="$PATH:$HOME/.dotnet/tools"` à votre profil shell. |
| « Aller à la définition » ne trouve rien dans les autres fichiers | Aucun projet n'est chargé : vérifiez la présence de `--autoLoadProjects` et qu'il n'y a pas plusieurs `.sln` à la racine sans `dotnet.defaultSolution`. |
| Références NuGet en erreur | Lancez `dotnet restore` puis redémarrez le serveur (`/lsp reload` dans Copilot CLI). |

Pour désactiver ce serveur dans un dépôt précis (Copilot CLI), ajoutez dans `.github/lsp.json` :

```json
{ "lspServers": { "roslyn": { "disabled": true } } }
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
├── plugin.yaml                      # Métadonnées du site de documentation
└── README.md
```

## 🔗 Liens utiles

- [roslyn-language-server sur NuGet](https://www.nuget.org/packages/roslyn-language-server)
- [Roslyn](https://github.com/dotnet/roslyn)
- [SDK .NET](https://dotnet.microsoft.com/download)
- [Serveurs LSP dans GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/copilot-cli/set-up-copilot-cli/add-lsp-servers)
- [Plugins Claude Code](https://code.claude.com/docs/en/plugins-reference)

---

Auteur : **Sebastien DEGODEZ** · Licence : Apache 2.0
