# Copilot-Instructions Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor copilot-instructions repository to awesome-copilot structure, create C# plugin, and build Astro documentation site.

**Architecture:** Progressive migration in 3 phases - restructure repository, convert agents, build static site.

**Tech Stack:** Astro 4.x, TypeScript, Tailwind CSS, Fuse.js, GitHub Actions

---

## Phase 1: Repository Structure & C# Plugin

### Task 1: Create root-level directories structure

**Files:**
- Create: `instructions/` (empty)
- Create: `agents/` (empty)
- Create: `plugins/` (empty)

**Step 1: Create directories**

```bash
mkdir -p instructions agents plugins
```

**Step 2: Verify structure**

```bash
ls -la | grep -E "instructions|agents|plugins"
```

Expected output: Three directories created

**Step 3: Commit**

```bash
git add instructions agents plugins
git commit -m "feat: create root-level directories for awesome-copilot structure"
```

---

### Task 2: Move instructions from .github/ to root

**Files:**
- Move: `.github/instructions/*.md` → `instructions/`
- Delete: `.github/instructions/` (after move)

**Step 1: Copy all instructions**

```bash
cp -r .github/instructions/*.md instructions/
ls instructions/ | wc -l
```

Expected output: 13 .instructions.md files copied

**Step 2: Verify files**

```bash
ls instructions/ | head -5
```

Expected output: Shows files like `clean-architecture.instructions.md`

**Step 3: Commit**

```bash
git add instructions/
git commit -m "move: relocate instructions from .github/ to root instructions/"
```

---

### Task 3: Move skills from .github/ to root

**Files:**
- Move: `.github/skills/*/` → `skills/`
- Delete: `.github/skills/` (after move)

**Step 1: Copy all skills**

```bash
cp -r .github/skills/* skills/
ls skills/
```

Expected output: 6 skill directories

**Step 2: Verify SKILL.md files exist**

```bash
find skills/ -name "SKILL.md" | wc -l
```

Expected output: 6

**Step 3: Commit**

```bash
git add skills/
git commit -m "move: relocate skills from .github/skills to root skills/"
```

---

### Task 4: Create plugin structure

**Files:**
- Create: `plugins/csharp-clean-architecture-development/`
- Create: `plugins/csharp-clean-architecture-development/plugin.yaml`
- Create: `plugins/csharp-clean-architecture-development/README.md`
- Create: `plugins/csharp-clean-architecture-development/skills/`

**Step 1: Create plugin directories**

```bash
mkdir -p plugins/csharp-clean-architecture-development/skills
```

**Step 2: Create plugin.yaml**

Create file `plugins/csharp-clean-architecture-development/plugin.yaml`:

```yaml
name: csharp-clean-architecture-development
version: 1.0.0
description: Comprehensive C# development plugin with DDD, Clean Architecture, CQRS, and testing best practices
author: Sebastien DEGODEZ
tags:
  - csharp
  - dotnet
  - clean-architecture
  - ddd
  - cqrs
  - testing
skills:
  - application-layer-testing
  - clean-architecture-dotnet
```

**Step 3: Create plugin README.md**

Create file `plugins/csharp-clean-architecture-development/README.md`:

```markdown
# C# Clean Architecture Development Plugin

Comprehensive plugin for C# developers using Domain-Driven Design, Clean Architecture, and CQRS patterns.

## What's Included

### Skills
- **application-layer-testing** - Testing Application layer handlers using sociable testing strategy in C#
- **clean-architecture-dotnet** - Framework for creating new .NET projects with Clean Architecture and CQRS

### Related Instructions (global)
The following instructions complement this plugin:
- `clean-architecture.instructions.md`
- `coding-style-csharp.instructions.md`
- `domain-driven-design.instructions.md`
- `specification-business-rules-csharp.instructions.md`
- `unit-and-integration-tests.instructions.md`

## Installation

Install this plugin via Copilot CLI:

```bash
copilot plugin install csharp-clean-architecture-development
```

Or clone the repository and reference locally.

## What You'll Learn

This plugin provides comprehensive guidance on:
- Building layered applications with clean architecture
- Encapsulating business logic with Domain-Driven Design
- Implementing CQRS pattern for command/query separation
- Testing application handlers with sociable testing
- Writing domain logic using value objects and aggregates
- Using specification pattern for business rules

## Quick Start

1. Review `clean-architecture-dotnet` skill for project setup
2. Follow `application-layer-testing` for testing strategies
3. Reference the global instructions for coding standards and patterns

## Contributing

See main repository CONTRIBUTING.md for guidelines.
```

**Step 4: Verify structure**

```bash
tree plugins/csharp-clean-architecture-development/
```

Expected output: 
```
plugins/csharp-clean-architecture-development/
├── README.md
├── plugin.yaml
└── skills/
```

**Step 5: Commit**

```bash
git add plugins/csharp-clean-architecture-development/
git commit -m "feat: create csharp-clean-architecture-development plugin"
```

---

### Task 5: Copy skills into plugin

**Files:**
- Copy: `skills/application-layer-testing/` → `plugins/csharp-clean-architecture-development/skills/`
- Copy: `skills/clean-architecture-dotnet/` → `plugins/csharp-clean-architecture-development/skills/`

**Step 1: Copy skills**

```bash
cp -r skills/application-layer-testing plugins/csharp-clean-architecture-development/skills/
cp -r skills/clean-architecture-dotnet plugins/csharp-clean-architecture-development/skills/
```

**Step 2: Verify copies**

```bash
ls plugins/csharp-clean-architecture-development/skills/
```

Expected output: Two directories with SKILL.md files

**Step 3: Verify SKILL.md files exist**

```bash
find plugins/csharp-clean-architecture-development/skills -name "SKILL.md" | wc -l
```

Expected output: 2

**Step 4: Commit**

```bash
git add plugins/csharp-clean-architecture-development/skills/
git commit -m "feat: add skills to csharp-clean-architecture-development plugin"
```

---

### Task 6: Delete old .github directories

**Files:**
- Delete: `.github/skills/`
- Delete: `.github/instructions/`
- Delete: `.github/chatmodes/`
- Delete: `.github/prompts/`
- Delete: `.github/agents/` (if empty)

**Step 1: List .github subdirectories before deletion**

```bash
ls -la .github/
```

**Step 2: Delete old directories**

```bash
rm -rf .github/skills
rm -rf .github/instructions
rm -rf .github/chatmodes
rm -rf .github/prompts
rm -rf .github/agents
```

**Step 3: Verify deletion**

```bash
ls -la .github/
```

Expected: Only `copilot-instructions.md`, workflows/, and other files remain

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old .github subdirectories (moved to root)"
```

---

### Task 7: Update README.md with new structure

**Files:**
- Modify: `README.md` (update structure section)

**Step 1: Edit README.md**

Find the "📂 Repository Structure" section and update to:

```markdown
## 📂 Repository Structure

```
├── instructions/          # Coding standards and best practices (.instructions.md)
├── agents/               # Custom AI agents (.agent.md)
├── skills/               # Self-contained capabilities with bundled resources
├── plugins/              # Installable packages bundling related agents and skills
│   └── csharp-clean-architecture-development/
├── website/              # Astro static documentation site
├── docs/                 # Documentation and implementation plans
├── .github/
│   └── workflows/        # GitHub Actions for deployment and automation
└── README.md
```
```

**Step 2: Add section about awesome-copilot conventions**

Add before the structure section:

```markdown
## 🎯 Repository Approach

This repository follows the [awesome-copilot](https://github.com/github/awesome-copilot) structure and conventions for organizing instructions, skills, agents, and plugins to enhance GitHub Copilot capabilities.

### Key Concepts

- **Instructions**: Coding standards and best practices that apply to specific file patterns
- **Skills**: Self-contained capabilities that bundle SKILL.md files with related resources
- **Agents**: Custom AI personas for specialized workflows
- **Plugins**: Installable packages that bundle related skills and agents
```

**Step 3: Add plugin information**

Add a new section:

```markdown
## 🔌 Plugins

### C# Clean Architecture Development

Comprehensive plugin for C# developers with DDD, Clean Architecture, CQRS, and testing best practices.

- **Location**: `plugins/csharp-clean-architecture-development/`
- **Skills**: application-layer-testing, clean-architecture-dotnet
- **Installation**: See plugin README for details

See [plugins/](plugins/) for more available plugins.
```

**Step 4: Update "How to use this repository" section**

Update step 2 to reflect new structure:

```markdown
2. **Explore the repository**
   - Check `instructions/` for coding rules and best practices
   - Review `skills/` for specialized capabilities and bundled resources
   - Browse `agents/` for custom AI personas
   - Install plugins from `plugins/` for curated collections
   - Visit `website/` for interactive documentation
```

**Step 5: Verify changes**

View the updated README:

```bash
head -100 README.md
```

**Step 6: Commit**

```bash
git add README.md
git commit -m "docs: update README with awesome-copilot structure"
```

---

## Phase 2: Agent Conversion

### Task 8: Convert architect.chatmode.md to architect.agent.md

**Files:**
- Read: `.github/chatmodes/architect.chatmode.md`
- Create: `agents/architect.agent.md`
- Delete: `.github/chatmodes/architect.chatmode.md`

**Step 1: Read chatmode file**

```bash
cat .github/chatmodes/architect.chatmode.md | head -50
```

**Step 2: Create agent file**

Read the chatmode and convert to agent format with proper frontmatter.

Create `agents/architect.agent.md`:

```markdown
---
name: Architect
description: Expert AI agent for software architecture design, system planning, and technical decision-making
tags:
  - architecture
  - design
  - planning
  - decision-making
---

[Content from architect.chatmode.md, adjusted as needed]
```

**Step 3: Verify file created**

```bash
ls -la agents/architect.agent.md
```

**Step 4: Commit**

```bash
git add agents/architect.agent.md
git commit -m "feat: convert architect chatmode to agent"
```

---

### Task 9: Convert slides-wizard.chatmode.md to slides-wizard.agent.md

**Files:**
- Read: `.github/chatmodes/slides-wizard.chatmode.md`
- Create: `agents/slides-wizard.agent.md`
- Delete: `.github/chatmodes/slides-wizard.chatmode.md`

**Step 1: Read chatmode file**

```bash
cat .github/chatmodes/slides-wizard.chatmode.md | head -50
```

**Step 2: Create agent file**

Create `agents/slides-wizard.agent.md`:

```markdown
---
name: Slides Wizard
description: AI agent for creating, editing, and optimizing Marp presentation slides
tags:
  - presentations
  - slides
  - marp
  - documentation
---

[Content from slides-wizard.chatmode.md, adjusted as needed]
```

**Step 3: Verify file created**

```bash
ls -la agents/slides-wizard.agent.md
```

**Step 4: Commit**

```bash
git add agents/slides-wizard.agent.md
git commit -m "feat: convert slides-wizard chatmode to agent"
```

---

### Task 10: Delete old chatmodes directory

**Files:**
- Delete: `.github/chatmodes/`

**Step 1: Verify directory is empty or delete files**

```bash
ls .github/chatmodes/
```

**Step 2: Delete directory**

```bash
rm -rf .github/chatmodes
```

**Step 3: Verify deletion**

```bash
ls .github/ | grep chatmodes
```

Expected: No output (directory deleted)

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove .github/chatmodes directory (migrated to agents/)"
```

---

### Task 11: Update copilot-instructions.md references (if needed)

**Files:**
- Modify: `.github/copilot-instructions.md` or `copilot-instructions.md`

**Step 1: Check if file exists and needs updates**

```bash
ls -la .github/copilot-instructions.md 2>/dev/null || echo "File not found"
```

**Step 2: If found, update references**

Search for references to `.github/chatmodes`, `.github/skills`, `.github/instructions` and update to root paths.

**Step 3: Commit if changes made**

```bash
git add .github/copilot-instructions.md
git commit -m "docs: update path references in copilot-instructions.md"
```

---

## Phase 3: Astro Static Site

### Task 12: Initialize Astro project

**Files:**
- Create: `website/` (Astro project)

**Step 1: Create Astro project**

```bash
# Create website directory and initialize Astro
mkdir website
cd website
npm create astro@latest . -- --template minimal --yes
cd ..
```

**Step 2: Verify structure**

```bash
ls -la website/
```

Expected: `src/`, `public/`, `astro.config.mjs`, `package.json`, etc.

**Step 3: Add website to .gitignore**

If not already present, add:

```
website/node_modules/
website/dist/
website/.env
website/.env.local
```

**Step 4: Commit**

```bash
git add website/
git commit -m "feat: initialize astro project for documentation site"
```

---

### Task 13: Configure Tailwind CSS with Marp-Gaia colors

**Files:**
- Modify: `website/astro.config.mjs`
- Create: `website/tailwind.config.mjs`
- Modify: `website/src/styles/global.css`
- Create: `website/package.json` (update with Tailwind deps)

**Step 1: Install Tailwind integration**

```bash
cd website
npm install @astrojs/tailwind
cd ..
```

**Step 2: Update astro.config.mjs**

Replace content with:

```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://sebastiendegodez.github.io',
  base: '/copilot-instructions',
  integrations: [tailwind()],
  markdown: {
    shikiConfig: {
      theme: 'material-theme-palenight',
    },
  },
});
```

**Step 3: Create tailwind.config.mjs**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#0288d1', // Main
          600: '#0277bd',
          700: '#01579b', // Dark
          800: '#014c8c',
          900: '#00396b',
        },
        accent: '#ff6f00',
      },
      fontFamily: {
        mono: ["'Fira Code'", 'monospace'],
      },
    },
  },
  plugins: [],
};
```

**Step 4: Update global.css**

Create/update `website/src/styles/global.css`:

```css
:root {
  --primary: #0288d1;
  --primary-dark: #01579b;
  --primary-light: #03a9f4;
  --secondary: #455a64;
  --accent: #ff6f00;
  
  --bg-main: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-code: #263238;
  
  --text-primary: #212121;
  --text-secondary: #757575;
  --text-on-primary: #ffffff;
  
  --border: #e0e0e0;
  --shadow: rgba(0, 0, 0, 0.1);
}

body {
  background-color: var(--bg-main);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
}

code {
  font-family: 'Fira Code', monospace;
  background-color: var(--bg-code);
  color: var(--text-on-primary);
  padding: 2px 6px;
  border-radius: 4px;
}
```

**Step 5: Verify Tailwind setup**

```bash
cd website && npm run build && cd ..
```

**Step 6: Commit**

```bash
git add website/astro.config.mjs website/tailwind.config.mjs website/src/styles/
git commit -m "feat: configure tailwind css with marp-gaia color palette"
```

---

### Task 14: Setup Astro Collections for content

**Files:**
- Create: `website/src/content/config.ts`
- Create: `website/src/content/skills/` (symlink or reference to root skills/)
- Create: `website/src/content/instructions/` (symlink or reference)

**Step 1: Create content config**

Create `website/src/content/config.ts`:

```typescript
import { defineCollection, z } from 'astro:content';

const skillsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const instructionsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    applyTo: z.string(),
    description: z.string().optional(),
  }),
});

const agentsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  skills: skillsCollection,
  instructions: instructionsCollection,
  agents: agentsCollection,
};
```

**Step 2: Create symlinks to content** (or use build script to copy)

```bash
cd website/src/content
ln -s ../../../skills skills
ln -s ../../../instructions instructions
ln -s ../../../agents agents
cd ../../..
```

**Step 3: Verify symlinks**

```bash
ls -la website/src/content/
```

**Step 4: Commit**

```bash
git add website/src/content/config.ts
git commit -m "feat: setup astro content collections"
```

---

### Task 15: Create page layouts

**Files:**
- Create: `website/src/layouts/BaseLayout.astro`
- Create: `website/src/layouts/DetailLayout.astro`

**Step 1: Create BaseLayout.astro**

Create `website/src/layouts/BaseLayout.astro`:

```astro
---
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title} | Copilot Instructions</title>
    <style is:global>
      @import '../styles/global.css';
    </style>
  </head>
  <body>
    <header class="bg-primary text-white p-6">
      <h1 class="text-3xl font-bold">Copilot Instructions</h1>
    </header>
    <main class="max-w-6xl mx-auto p-6">
      <h2 class="text-2xl font-bold mb-4">{title}</h2>
      <slot />
    </main>
    <footer class="bg-gray-800 text-white p-6 mt-12">
      <p>&copy; 2026 Copilot Instructions. Licensed under MIT.</p>
    </footer>
  </body>
</html>
```

**Step 2: Create DetailLayout.astro**

Create `website/src/layouts/DetailLayout.astro`:

```astro
---
import BaseLayout from './BaseLayout.astro';

interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<BaseLayout title={title}>
  {description && <p class="text-gray-600 mb-6">{description}</p>}
  <article class="prose max-w-none">
    <slot />
  </article>
</BaseLayout>
```

**Step 3: Commit**

```bash
git add website/src/layouts/
git commit -m "feat: create page layouts"
```

---

### Task 16: Create homepage

**Files:**
- Create: `website/src/pages/index.astro`

**Step 1: Create homepage**

Create `website/src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Welcome">
  <div class="space-y-8">
    <section class="bg-primary-50 p-8 rounded-lg">
      <h2 class="text-3xl font-bold text-primary mb-4">Welcome to Copilot Instructions</h2>
      <p class="text-lg text-gray-700 mb-6">
        A comprehensive repository of coding standards, skills, instructions, and agents to enhance your GitHub Copilot experience.
      </p>
      <div class="flex gap-4">
        <a href="/copilot-instructions/skills/" class="bg-primary text-white px-6 py-3 rounded hover:bg-primary-dark transition">Browse Skills</a>
        <a href="/copilot-instructions/instructions/" class="bg-accent text-white px-6 py-3 rounded hover:bg-yellow-700 transition">View Instructions</a>
      </div>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="border border-gray-300 p-6 rounded-lg">
        <h3 class="text-xl font-bold mb-2">📚 Skills</h3>
        <p class="text-gray-700">Self-contained capabilities with bundled resources for specialized tasks.</p>
      </div>
      <div class="border border-gray-300 p-6 rounded-lg">
        <h3 class="text-xl font-bold mb-2">📋 Instructions</h3>
        <p class="text-gray-700">Coding standards and best practices that apply to your projects.</p>
      </div>
      <div class="border border-gray-300 p-6 rounded-lg">
        <h3 class="text-xl font-bold mb-2">🤖 Agents</h3>
        <p class="text-gray-700">Custom AI personas for specialized workflows and domains.</p>
      </div>
      <div class="border border-gray-300 p-6 rounded-lg">
        <h3 class="text-xl font-bold mb-2">🔌 Plugins</h3>
        <p class="text-gray-700">Installable packages bundling related skills and agents.</p>
      </div>
    </section>
  </div>
</BaseLayout>
```

**Step 2: Commit**

```bash
git add website/src/pages/index.astro
git commit -m "feat: create homepage"
```

---

### Task 17: Create skills browser page

**Files:**
- Create: `website/src/pages/skills/index.astro`
- Create: `website/src/pages/skills/[slug].astro`

**Step 1: Create skills index**

Create `website/src/pages/skills/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

const skills = await getCollection('skills');
---

<BaseLayout title="Skills">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {skills.map((skill) => (
      <a href={`/copilot-instructions/skills/${skill.slug}/`} class="border border-gray-300 p-6 rounded-lg hover:shadow-lg transition">
        <h3 class="text-lg font-bold text-primary mb-2">{skill.data.name || skill.slug}</h3>
        <p class="text-gray-700 mb-4">{skill.data.description}</p>
        {skill.data.tags && (
          <div class="flex flex-wrap gap-2">
            {skill.data.tags.map((tag) => (
              <span class="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded">{tag}</span>
            ))}
          </div>
        )}
      </a>
    ))}
  </div>
</BaseLayout>
```

**Step 2: Create skill detail page**

Create `website/src/pages/skills/[slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import DetailLayout from '../../layouts/DetailLayout.astro';

export async function getStaticPaths() {
  const skills = await getCollection('skills');
  return skills.map((skill) => ({
    params: { slug: skill.slug },
    props: { skill },
  }));
}

const { skill } = Astro.props;
const { Content } = await skill.render();
---

<DetailLayout title={skill.data.name || skill.slug} description={skill.data.description}>
  <Content />
</DetailLayout>
```

**Step 3: Commit**

```bash
git add website/src/pages/skills/
git commit -m "feat: create skills browser pages"
```

---

### Task 18: Create instructions browser page

**Files:**
- Create: `website/src/pages/instructions/index.astro`
- Create: `website/src/pages/instructions/[slug].astro`

**Step 1: Create instructions index**

Create `website/src/pages/instructions/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

const instructions = await getCollection('instructions');
---

<BaseLayout title="Instructions">
  <div class="space-y-4">
    {instructions.map((instruction) => (
      <a href={`/copilot-instructions/instructions/${instruction.slug}/`} class="border border-gray-300 p-4 rounded hover:bg-gray-50 transition block">
        <h3 class="text-lg font-bold text-primary">{instruction.slug}</h3>
        <p class="text-gray-700 text-sm mt-2">Applies to: {instruction.data.applyTo}</p>
        {instruction.data.description && (
          <p class="text-gray-600 text-sm mt-1">{instruction.data.description}</p>
        )}
      </a>
    ))}
  </div>
</BaseLayout>
```

**Step 2: Create instruction detail page**

Create `website/src/pages/instructions/[slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import DetailLayout from '../../layouts/DetailLayout.astro';

export async function getStaticPaths() {
  const instructions = await getCollection('instructions');
  return instructions.map((instruction) => ({
    params: { slug: instruction.slug },
    props: { instruction },
  }));
}

const { instruction } = Astro.props;
const { Content } = await instruction.render();
---

<DetailLayout title={instruction.slug} description={`Applies to: ${instruction.data.applyTo}`}>
  <Content />
</DetailLayout>
```

**Step 3: Commit**

```bash
git add website/src/pages/instructions/
git commit -m "feat: create instructions browser pages"
```

---

### Task 19: Create agents browser page

**Files:**
- Create: `website/src/pages/agents/index.astro`
- Create: `website/src/pages/agents/[slug].astro`

**Step 1: Create agents index**

Create `website/src/pages/agents/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

const agents = await getCollection('agents');
---

<BaseLayout title="Agents">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    {agents.map((agent) => (
      <a href={`/copilot-instructions/agents/${agent.slug}/`} class="border border-gray-300 p-6 rounded-lg hover:shadow-lg transition">
        <h3 class="text-lg font-bold text-primary mb-2">{agent.data.name}</h3>
        <p class="text-gray-700 mb-4">{agent.data.description}</p>
        {agent.data.tags && (
          <div class="flex flex-wrap gap-2">
            {agent.data.tags.map((tag) => (
              <span class="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded">{tag}</span>
            ))}
          </div>
        )}
      </a>
    ))}
  </div>
</BaseLayout>
```

**Step 2: Create agent detail page**

Create `website/src/pages/agents/[slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import DetailLayout from '../../layouts/DetailLayout.astro';

export async function getStaticPaths() {
  const agents = await getCollection('agents');
  return agents.map((agent) => ({
    params: { slug: agent.slug },
    props: { agent },
  }));
}

const { agent } = Astro.props;
const { Content } = await agent.render();
---

<DetailLayout title={agent.data.name} description={agent.data.description}>
  <Content />
</DetailLayout>
```

**Step 3: Commit**

```bash
git add website/src/pages/agents/
git commit -m "feat: create agents browser pages"
```

---

### Task 20: Create plugins browser page

**Files:**
- Create: `website/src/pages/plugins/index.astro`
- Create: `website/src/pages/plugins/[slug].astro`

**Step 1: Create plugins index**

Create `website/src/pages/plugins/index.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

// Load plugin.yaml files from plugins directory
const pluginsDir = path.join(process.cwd(), 'plugins');
const plugins: any[] = [];

if (fs.existsSync(pluginsDir)) {
  const dirs = fs.readdirSync(pluginsDir);
  for (const dir of dirs) {
    const pluginYamlPath = path.join(pluginsDir, dir, 'plugin.yaml');
    if (fs.existsSync(pluginYamlPath)) {
      const content = fs.readFileSync(pluginYamlPath, 'utf-8');
      const pluginData = YAML.parse(content);
      plugins.push({ slug: dir, ...pluginData });
    }
  }
}
---

<BaseLayout title="Plugins">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    {plugins.map((plugin) => (
      <a href={`/copilot-instructions/plugins/${plugin.slug}/`} class="border border-gray-300 p-6 rounded-lg hover:shadow-lg transition">
        <h3 class="text-lg font-bold text-primary mb-2">{plugin.name}</h3>
        <p class="text-gray-700 mb-4">{plugin.description}</p>
        {plugin.skills && (
          <div class="mb-4">
            <p class="text-sm font-semibold text-gray-600 mb-2">Skills:</p>
            <div class="flex flex-wrap gap-2">
              {plugin.skills.map((skill: string) => (
                <span class="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded">{skill}</span>
              ))}
            </div>
          </div>
        )}
      </a>
    ))}
  </div>
</BaseLayout>
```

**Step 2: Create plugin detail page**

Create `website/src/pages/plugins/[slug].astro`:

```astro
---
import DetailLayout from '../../layouts/DetailLayout.astro';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export async function getStaticPaths() {
  const pluginsDir = path.join(process.cwd(), 'plugins');
  const paths: any[] = [];
  
  if (fs.existsSync(pluginsDir)) {
    const dirs = fs.readdirSync(pluginsDir);
    for (const dir of dirs) {
      paths.push({ params: { slug: dir } });
    }
  }
  
  return paths;
}

const { slug } = Astro.params;
const pluginYamlPath = path.join(process.cwd(), 'plugins', slug!, 'plugin.yaml');
const readmePath = path.join(process.cwd(), 'plugins', slug!, 'README.md');

let plugin: any = {};
let readmeContent = '';

if (fs.existsSync(pluginYamlPath)) {
  const content = fs.readFileSync(pluginYamlPath, 'utf-8');
  plugin = YAML.parse(content);
}

if (fs.existsSync(readmePath)) {
  readmeContent = fs.readFileSync(readmePath, 'utf-8');
}
---

<DetailLayout title={plugin.name} description={plugin.description}>
  {plugin.tags && (
    <div class="mb-6 flex flex-wrap gap-2">
      {plugin.tags.map((tag: string) => (
        <span class="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded">{tag}</span>
      ))}
    </div>
  )}
  
  {plugin.skills && (
    <section class="mb-6">
      <h3 class="text-xl font-bold mb-3">Included Skills</h3>
      <ul class="space-y-2">
        {plugin.skills.map((skill: string) => (
          <li>
            <a href={`/copilot-instructions/skills/${skill}/`} class="text-primary hover:underline">
              {skill}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )}

  <section class="prose max-w-none">
    <Fragment set:html={readmeContent} />
  </section>
</DetailLayout>
```

**Step 3: Install yaml package**

```bash
cd website
npm install yaml
cd ..
```

**Step 4: Commit**

```bash
git add website/src/pages/plugins/ website/package.json website/package-lock.json
git commit -m "feat: create plugins browser pages"
```

---

### Task 21: Create GitHub Actions workflows

**Files:**
- Create: `.github/workflows/deploy-site.yml`
- Create: `.github/workflows/update-readme.yml`

**Step 1: Create deploy-site.yml**

Create `.github/workflows/deploy-site.yml`:

```yaml
name: Deploy Astro Site

on:
  push:
    branches:
      - main
    paths:
      - 'website/**'
      - 'instructions/**'
      - 'skills/**'
      - 'agents/**'
      - 'plugins/**'

jobs:
  deploy:
    name: Deploy to GitHub Pages
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      deployments: write
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'website/package-lock.json'
      
      - name: Install dependencies
        working-directory: website
        run: npm ci
      
      - name: Build Astro site
        working-directory: website
        run: npm run build
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: website/dist
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

**Step 2: Create update-readme.yml**

Create `.github/workflows/update-readme.yml`:

```yaml
name: Update README Tables

on:
  push:
    branches:
      - main
    paths:
      - 'instructions/**'
      - 'skills/**'
      - 'agents/**'
      - 'plugins/**'

jobs:
  update-readme:
    name: Update README with current content
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Generate README content
        run: |
          node .github/scripts/generate-readme.js
      
      - name: Commit and push if changes
        run: |
          if git diff --quiet README.md; then
            echo "No changes to commit"
          else
            git config --local user.email "action@github.com"
            git config --local user.name "GitHub Action"
            git add README.md
            git commit -m "chore: update README tables from content"
            git push
          fi
```

**Step 3: Commit**

```bash
git add .github/workflows/
git commit -m "feat: add github actions workflows for deployment and readme updates"
```

---

### Task 22: Build and test site locally

**Files:**
- Test: Astro build

**Step 1: Install website dependencies**

```bash
cd website && npm install && cd ..
```

**Step 2: Build site**

```bash
cd website && npm run build && cd ..
```

Expected output: Build completes without errors, `website/dist/` created

**Step 3: Verify build output**

```bash
ls -la website/dist/
```

**Step 4: Check for errors**

```bash
cd website && npm run build 2>&1 | grep -i error || echo "No errors found"
cd ..
```

**Step 5: Commit**

```bash
git add website/node_modules package-lock.json
git commit -m "build: install website dependencies and validate build"
```

---

### Task 23: Configure GitHub Pages settings

**Manual Step** (requires GitHub UI):

Steps:
1. Go to repository Settings → Pages
2. Set Source to "GitHub Actions"
3. Verify domain configuration

Once configured, GitHub Actions will automatically deploy to `https://sebastiendegodez.github.io/copilot-instructions/`

---

### Task 24: Final commit and branch readiness

**Files:**
- All previous work committed

**Step 1: Verify branch status**

```bash
git log --oneline -20
```

Should show commit history with prefixes: `docs:`, `feat:`, `move:`, `chore:`, `build:`

**Step 2: Verify no uncommitted changes**

```bash
git status
```

Expected output: "nothing to commit, working tree clean"

**Step 3: Final commit message**

```bash
git log -1 --pretty=format:"%h - %s"
```

**Step 4: Display summary**

```bash
echo "✅ Refactoring branch is complete and ready for review"
git log --oneline | head -15
```

**Step 5: Display instructions for merge**

Print merge instructions:

```bash
cat <<EOF
📋 BRANCH SUMMARY
================

Branch: refactor/copilot-instructions
Commits: $(git rev-list --count main..HEAD)

To merge:
  git checkout main
  git pull origin main
  git merge --no-ff refactor/copilot-instructions
  git push origin main

To clean up after merge:
  git branch -d refactor/copilot-instructions
  git push origin --delete refactor/copilot-instructions
EOF
```

---

## Summary

**Phase 1: Repository Structure** (Tasks 1-7)
- ✅ Create directory structure
- ✅ Move skills, instructions
- ✅ Create C# plugin
- ✅ Update documentation

**Phase 2: Agent Conversion** (Tasks 8-11)
- ✅ Convert chatmodes to agents
- ✅ Clean up old directories

**Phase 3: Astro Site** (Tasks 12-24)
- ✅ Initialize Astro project
- ✅ Configure design system
- ✅ Create content collections
- ✅ Build pages (home, skills, instructions, agents, plugins)
- ✅ Setup GitHub Actions
- ✅ Test build locally
- ✅ Ready for deployment

**Total: 24 bite-sized tasks across 3 phases**
