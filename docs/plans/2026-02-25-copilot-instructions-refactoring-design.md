# Copilot-Instructions Repository Refactoring Design

**Goal:** Refactor the copilot-instructions repository to follow the awesome-copilot structure, create a C# Clean Architecture plugin, and build a static documentation website with Astro.

**Architecture:** Progressive migration in 3 phases - restructure repository to match awesome-copilot conventions, convert chatmodes to agents, build Astro static site with GitHub Pages deployment.

**Tech Stack:** Astro 4.x, TypeScript, Tailwind CSS, Fuse.js, GitHub Actions

---

## 1. Final Repository Structure

The repository will be reorganized from a `.github/`-centric structure to a flat, root-level structure matching awesome-copilot conventions:

### Current Structure
```
copilot-instructions/
└── .github/
    ├── skills/              # 6 skill directories
    ├── instructions/        # 13 instruction files
    ├── chatmodes/          # 2 chatmode files
    ├── prompts/            # 2 prompt files (already converted to skills)
    ├── agents/             # Empty folder
    └── copilot-instructions.md
```

### Target Structure
```
copilot-instructions/
├── instructions/              # 13 .instructions.md files (moved from .github/)
├── agents/                    # 2 .agent.md files (converted from chatmodes)
├── skills/                    # 6 skill directories (moved from .github/)
│   ├── application-layer-testing/
│   ├── clean-architecture-dotnet/
│   ├── generate-microcks-openapi-samples/
│   ├── migrating-prompts-to-skills/
│   ├── rg-code-search/
│   └── setup-husky-dotnet/
├── plugins/                   # NEW - bundled resources
│   └── csharp-clean-architecture-development/
│       ├── plugin.yaml        # Plugin metadata
│       ├── README.md          # Plugin documentation
│       └── skills/            # Copied skills
│           ├── application-layer-testing/
│           └── clean-architecture-dotnet/
├── website/                   # NEW - Astro static site
│   ├── src/
│   │   ├── pages/            # Routes: /, /skills/, /instructions/, etc.
│   │   ├── layouts/          # Page layouts
│   │   ├── components/       # Reusable components
│   │   └── styles/           # Global styles with Marp-Gaia palette
│   ├── public/               # Static assets
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   ├── tsconfig.json
│   └── package.json
├── docs/
│   └── plans/                # Design & implementation plans
├── .github/
│   └── workflows/            # ONLY GitHub Actions workflows
│       ├── deploy-site.yml   # Astro → GitHub Pages
│       └── update-readme.yml # Auto-update README tables
├── README.md                 # Updated with new structure
├── CONTRIBUTING.md           # Contribution guidelines
└── LICENSE
```

### Removed Elements
- `.github/skills/` → relocated to `skills/`
- `.github/instructions/` → relocated to `instructions/`
- `.github/chatmodes/` → converted to `agents/`
- `.github/prompts/` → deleted (already converted to skills)
- `.github/agents/` → deleted (empty folder)
- `.github/copilot-instructions.md` → moved to root as `COPILOT.md` or integrated into README

---

## 2. Plugin Architecture: csharp-clean-architecture-development

### Purpose
Bundle DDD, Clean Architecture, CQRS, and testing resources for C# developers into an installable plugin.

### Structure
```
plugins/csharp-clean-architecture-development/
├── plugin.yaml           # Metadata and references
├── README.md             # Installation & usage guide
└── skills/               # Copies of skills (not symlinks)
    ├── application-layer-testing/
    │   └── SKILL.md
    └── clean-architecture-dotnet/
        └── SKILL.md
```

### plugin.yaml Schema
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

**Note:** Instructions remain in the global `instructions/` directory and are NOT included in the plugin structure. The plugin only bundles skills.

### README.md Template
```markdown
# C# Clean Architecture Development Plugin

Comprehensive plugin for C# developers using DDD, Clean Architecture, and CQRS patterns.

## What's Included

- **Skills:**
  - `application-layer-testing` - Testing Application layer with sociable strategy
  - `clean-architecture-dotnet` - Project setup and architecture validation

- **Related Instructions** (global):
  - `clean-architecture.instructions.md`
  - `coding-style-csharp.instructions.md`
  - `domain-driven-design.instructions.md`
  - `specification-business-rules-csharp.instructions.md`
  - `unit-and-integration-tests.instructions.md`

## Installation

[Installation instructions following awesome-copilot conventions]
```

---

## 3. GitHub Actions Workflows

### 3.1 deploy-site.yml
**Trigger:** Push to `main` branch  
**Purpose:** Build and deploy Astro site to GitHub Pages

**Steps:**
1. Checkout repository
2. Setup Node.js 20.x
3. Install dependencies (`npm ci`)
4. Build Astro (`npm run build`)
5. Deploy to `gh-pages` branch

### 3.2 update-readme.yml
**Trigger:** Push to `main` branch  
**Purpose:** Auto-update README.md with simple lists

**Steps:**
1. Checkout repository
2. Run script to scan `instructions/`, `skills/`, `agents/`, `plugins/`
3. Generate simple markdown lists
4. Update README.md sections
5. Commit and push if changes detected

**README Sections to Update:**
- `## 📋 Instructions` - List all .instructions.md files with descriptions
- `## 🎯 Skills` - List all skills with descriptions
- `## 🤖 Agents` - List all agents with descriptions
- `## 🔌 Plugins` - List all plugins with descriptions

---

## 4. Astro Static Site Architecture

### 4.1 Design System
**Color Palette** (based on Marp Gaia theme):
```css
--primary: #0288d1;        /* Blue - links, primary actions */
--primary-dark: #01579b;   /* Dark blue - hover states */
--primary-light: #03a9f4;  /* Light blue - accents */
--secondary: #455a64;      /* Blue-grey - secondary text */
--accent: #ff6f00;         /* Orange - CTAs, highlights */

--bg-main: #ffffff;        /* Main background */
--bg-secondary: #f5f5f5;   /* Card backgrounds */
--bg-code: #263238;        /* Code block background */

--text-primary: #212121;   /* Primary text */
--text-secondary: #757575; /* Secondary text */
--text-on-primary: #ffffff; /* Text on primary color */

--border: #e0e0e0;
--shadow: rgba(0, 0, 0, 0.1);
```

**Typography:**
- Code: `'Fira Code', monospace` (matching Marp theme)
- Headings: System font stack
- Body: System font stack

### 4.2 Site Pages

#### Homepage (`/`)
- Hero section with project description
- Quick navigation cards to Skills, Instructions, Agents, Plugins
- Featured plugin highlight
- Getting started guide

#### Skills Browser (`/skills/`)
- Grid/list view of all skills
- Tag-based filtering (csharp, dotnet, testing, etc.)
- Search functionality (Fuse.js)
- Click → detail page

#### Instructions Browser (`/instructions/`)
- List of all instruction files
- Filter by applyTo patterns
- Search functionality
- Click → detail page

#### Agents Browser (`/agents/`)
- List of custom agents
- Descriptions and use cases
- Click → detail page

#### Plugins Browser (`/plugins/`)
- Plugin cards with included skills/agents
- Installation instructions
- Click → detail page

#### Detail Pages (`/[type]/[name]/`)
- Full markdown content rendering
- Syntax highlighting (Shiki)
- Breadcrumb navigation
- Related items (skills in plugin, etc.)

### 4.3 Technical Implementation

**Astro Collections:**
```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const skillsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
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

// Similar for agents, plugins
```

**Components:**
- `<Header />` - Site navigation
- `<Footer />` - Footer with links
- `<Card />` - Item card for lists
- `<SearchBar />` - Client-side search
- `<TagFilter />` - Tag filtering
- `<Breadcrumb />` - Navigation breadcrumb
- `<MarkdownContent />` - Rendered markdown with syntax highlighting

**Routing:**
- Static generation for all content
- Dynamic routes for detail pages: `[type]/[...slug].astro`

### 4.4 Build Configuration

**astro.config.mjs:**
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

**Key Dependencies:**
- `astro` - Static site framework
- `@astrojs/tailwind` - Tailwind integration
- `fuse.js` - Client-side search
- `shiki` - Syntax highlighting (built-in with Astro)

---

## 5. Migration Strategy: 3 Phases

### Phase 1: Structure & Plugin
**Goal:** Reorganize repository structure and create the C# plugin

**Tasks:**
1. Create new root-level directories (`instructions/`, `skills/`, `agents/`, `plugins/`)
2. Move files from `.github/` to new locations
3. Create plugin structure with `plugin.yaml` and README
4. Copy skills into plugin directory
5. Update all file references in documentation
6. Delete old `.github/` subdirectories
7. Commit changes

**Validation:** 
- All files accessible in new locations
- No broken references
- Plugin structure valid

### Phase 2: Agents Conversion
**Goal:** Convert chatmodes to agents

**Tasks:**
1. Convert `architect.chatmode.md` → `architect.agent.md`
2. Convert `slides-wizard.chatmode.md` → `slides-wizard.agent.md`
3. Add proper frontmatter (name, description)
4. Delete `.github/chatmodes/` and `.github/prompts/`
5. Commit changes

**Validation:**
- Agents have valid frontmatter
- Old chatmodes removed

### Phase 3: Astro Site
**Goal:** Build and deploy static documentation site

**Tasks:**
1. Initialize Astro project in `website/`
2. Configure Tailwind with Marp-Gaia colors
3. Setup Astro Collections for content types
4. Build page layouts and components
5. Implement homepage
6. Implement browsers (skills, instructions, agents, plugins)
7. Implement detail pages
8. Add search functionality
9. Add tag filtering
10. Create GitHub Actions workflows
11. Test locally
12. Deploy to GitHub Pages
13. Commit changes

**Validation:**
- Site builds without errors
- All content types displayed correctly
- Search and filters functional
- Deployed successfully to GitHub Pages

---

## 6. Testing & Validation

### Validation Checklist
- [ ] All skills accessible at `skills/[name]/SKILL.md`
- [ ] All instructions at `instructions/[name].instructions.md`
- [ ] All agents at `agents/[name].agent.md`
- [ ] Plugin structure valid with `plugin.yaml`
- [ ] Astro site builds successfully
- [ ] All pages render correctly
- [ ] Search functionality works
- [ ] Tag filtering works
- [ ] GitHub Actions run successfully
- [ ] Site deployed to GitHub Pages
- [ ] README.md updated with current structure
- [ ] No broken links in documentation

### Browser Testing
- Chrome/Edge
- Firefox
- Safari
- Mobile responsive design

---

## 7. Documentation Updates

### README.md Updates
- Update repository structure section
- Add plugin installation instructions
- Update contribution guidelines
- Add link to deployed site
- Update badges if needed

### CONTRIBUTING.md
- Document new file structure
- Explain plugin creation process
- Document frontmatter requirements
- Add guidelines for agents vs chatmodes

---

## 8. Future Enhancements (Out of Scope)

These are intentionally excluded from this design:
- Advanced validation workflows (YAML schema validation)
- Automated testing of skills
- `llms.txt` generation
- Multiple language support
- User authentication
- Analytics integration
- MCP server implementation

---

## Design Approval

This design follows:
- **DRY**: No duplication - each file moved once, skills copied intentionally into plugin
- **YAGNI**: Only essential features - no over-engineering
- **Progressive Enhancement**: 3-phase approach allows validation at each step
- **Awesome-Copilot Conventions**: Matches structure and naming from reference repository

**Status:** ✅ Approved  
**Next Step:** Create detailed implementation plan with bite-sized tasks
