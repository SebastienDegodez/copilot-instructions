---
name: migrating-prompts-to-skills
description: Use when converting existing .prompt.md or .instructions.md files to reusable SKILL.md format, before guessing structure or deciding what to keep/remove
---

# Migrating Prompts to Skills

## Overview

Migrating existing prompt/instruction documentation to SKILL format requires **testing before shipping**, not "structure and refine later." Skills are discoverable documentation—format ambiguities and scoping decisions compound downstream.

## When to Use

**SYMPTOMS that trigger this skill:**
- You have working `.prompt.md` or `.instructions.md` documentation
- You want to convert it to SKILL.md reusable format
- You're uncertain about: structure choices, what to keep/delete, frontmatter rules, or who will use this

**When NOT to use:**
- File is project-specific (keep in copilot-instructions.md)
- Content is <200 words and too narrow (doesn't warrant skill status)
- You already know your target audience exactly (not guessing)

## The Iron Rule

**DO NOT migrate under time pressure or without clarity on:**
1. Exact frontmatter format (read agentskills.io spec FIRST)
2. Who will use this (skill creator? prompt author? specific domain?)
3. Why this deserves skill status (will it solve recurring problems?)

**Violate this = 70% confidence at ship time. Unacceptable.**

## RED Phase: Validate Before Deciding

**Step 1: Read Frontmatter Specs**

REQUIRED: Verify YAML format against these rules (non-negotiable):

```yaml
# ✅ VALID frontmatter
---
name: skill-name-lowercase-kebab-case
description: Use when [specific trigger in third person] and [target audience/context]
---

# RULES (no exceptions):
# - name: letters, numbers, hyphens ONLY (no underscores, spaces, parentheses)
# - description: MUST start with "Use when"
# - description: maximum 500 characters total
# - description: Include specific triggers/symptoms (NOT workflow recap)
# - description: Use third person (injected into system prompt)
# - No other fields (no keywords, category, version, etc.)
```

**Why these rules matter:**
- `name` parsed as file directory reference → special chars break lookups
- `description` read by Claude to decide IF loading skill is necessary → workflow summaries cause skip loading the full skill
- Third person = works in system prompt injection

Then audit your skills directory:

**Why YAML matters for Claude discovery (Claude Search Optimization):**

- `description` is what Claude reads to decide IF loading your skill at all
- If description summarizes HOW to do something, Claude may follow the summary instead of reading the full skill
- Keywords in description help Claude find your skill by search
  - ✅ Include error messages: "ENOTEMPTY", "race condition"
  - ✅ Include symptoms: "flaky", "hanging", "timeout"
  - ✅ Include tool names: "dotnet", "pytest", "Playwright"
  - ❌ Don't repeat keywords (makes text unreadable)

**Bad description (Claude may skip the skill itself):**
```yaml
description: Describes the RED-GREEN-REFACTOR cycle with step-by-step phases
```
Claude follows the summary instead of reading SKILL.md.

**Good description (Claude looks for matching triggers, then reads SKILL):**
```yaml
description: Use when converting existing .prompt.md files to SKILL.md format, before structuring content
```
Claude notices trigger match and reads full skill.

Now audit any **5 existing skills** in your skills directory (different domains) for pattern examples

**Step 2: Audit Existing Skills (5-minute baseline)**
```bash
# Read at least these 5 skills to see actual patterns:
ls -la ~/.claude/skills/          # or your skill directory

# SELECTION STRATEGY:
# - 3 skills in DIFFERENT domains (to learn general patterns)
# - 2 skills in SIMILAR domain to your content (to avoid niche quirks)
# Example: If migrating database pooling skill:
#   Pick: clean-architecture (different), application-layer-testing (different),
#         performance-optimization (different), connection-pooling-attempt (similar),
#         database-indexing (similar)
```

**For each of the 5 skills:**
1. Read the YAML frontmatter completely (copy into a text file)
2. Note: section names in order (is Overview first? Always?)
3. Note: code example approach (inline or file? How many examples?)
4. Note: specific language/platform or generic? How scoped?

**Why 5?** Baseline testing showed 2 examples = 70% confidence → 5 examples = 90% confidence. The gap is real.

**Document as table:**
```markdown
| Skill | name length | sections | code style | scoped? |
|---|---|---|---|---|
| setup-husky-dotnet | 18 chars | Overview, When to Use, Core Pattern, Implementation | Inline, ~50 lines | .NET only |
| writing-skills | 16 chars | Overview, When to Use, Content, Examples | Inline + refs | Generic |
| ...| ...| ...| ...| ...|
```

This forces you to actually READ them, not pattern-match in your head.

**Step 3: Resolve Scoping BEFORE Structuring**

Ask yourself (WRITE ANSWERS DOWN—don't hold in your head):
- **Target audience?** Skill creators? Prompt/instruction authors? Specific roles? (Must be explicit)
- **Language/framework specific?** (e.g., "C#/.NET only" vs "language-agnostic")
- **Problem scope?** (e.g., "prompt migration" vs "documentation transformation" vs "SKILL structure validation")
- **Will OTHERS use this, or is it org-specific?**
- **Related skills to cross-link?** (during Step 2 audits, did you find skills that overlap? List them now)

**Why now?** Scoping ambiguity forces later restructuring. Example:
- Ambiguous → "include MySQL + SQL Server examples" (2x maintenance)
- Scoped → "C# only; other teams fork this for their stack" (1x maintenance)

**Scoping decision tree:**
```
Is this language/platform specific?
├─ YES: State clearly in description (e.g., "C#/.NET specific")
│   └─ Will other teams need variants?
│       ├─ YES: Note in SKILL bottom ("other teams can fork")
│       └─ NO: Done
└─ NO: Language-agnostic
    └─ Note which languages/platforms in examples
        └─ State why you chose them (realistic scope)
```

**Step 4: Extract Critical Gaps from Original Content**

What does your original `.prompt.md` do WELL?
- Specific technical accuracy? (keep as-is)
- Clear examples? (validate they're current—ACTUALLY RUN THEM)
- Best practices warnings? (emphasize in SKILL)

What's MISSING?
- Verification steps? (add under Implementation)
- When NOT to use? (required for SKILL)
- Audience scope? (add to description)
- Prerequisites? (add to Overview)

**Critical: Environment definition**

In your SKILL, state the ENVIRONMENT for all code examples clearly:
```markdown
## Implementation

**Tested environment:** C# with .NET 8.0, Visual Studio 2024

Code below assumes:
- Target framework: net8.0 or higher
- NuGet dependencies: EntityFrameworkCore 8.4+
- Database: SQL Server 2019+
```

Without this, future developers don't know if examples are outdated or wrong for THEIR context.

**Verification required:** Actually run each code snippet in the stated environment. If it fails, either:
1. Fix the code (update to current APIs)
2. Change the stated environment (e.g., ".NET 6.0 minimum")
3. Delete the example (if you can't verify)

## GREEN Phase: Migrate Content Structure

**Do NOT delete or rewrite yet.** Restructure by **function**, not reuse.

**Step 3: Create YAML Frontmatter**
```yaml
---
name: your-skill-name-lowercase-kebab
description: Use when [specific trigger] and [target audience/platform if scoped]
---
```

**Frontmatter rules:**
- `name`: letters, numbers, hyphens ONLY (no parentheses, underscores, or spaces)
- `description`: **MUST start with "Use when..."**
- `description`: **MUST include specific trigger symptoms or contexts**
- `description`: Maximum 500 characters
- `description`: Third-person voice, triggers ONLY (NOT "here's how to do X")

Examples:
```yaml
# ✅ GOOD: Specific trigger + context
description: Use when converting existing .prompt.md or .instructions.md files to reusable SKILL.md format, before guessing structure

# ❌ BAD: Workflow summary (Claude may follow this instead of reading skill)
description: Describes the RED-GREEN-REFACTOR cycle for prompt migration with testing strategies

# ❌ BAD: Too generic
description: For migrating documentation files
```

**Keep SKILL.md Self-Contained**

Don't add cross-links to other skills. Each skill should be autonomous and work standalone. Cross-links:
- Add maintenance burden (if linked skill changes, this breaks)
- Make users jump between files (poor experience)
- Create dependencies (this skill depends on that one existing)

**Best practice:** Every skill should teach its own rules, include its own examples, and stand alone. If something is essential knowledge, include it directly in your SKILL.md (as this skill does with CSO rules above).

**Step 2: Map Original Sections to SKILL Structure**

| Original Section | SKILL Home | Keep? | Rewrite? |
|---|---|---|---|
| Introduction | Overview (shorten to 1-2 sentences) | Core idea only | Replace with principle |
| Prerequisites/Setup | Overview or "When to Use" | Expand | Make explicit |
| How-to steps | "RED Phase" or "Implementation" | Adapt | **Move to "GREEN Phase" after validation** |
| Config examples | Code inline or separate file | YES | Only if proven current |
| Warnings/gotchas | "When NOT to Use" + "Common Mistakes" | Replace | Make explicit |
| Troubleshooting | New section only if 500+ chars | Maybe | Full preserve if <300 words |

**DO NOT assume sections map cleanly.** Original structure was for prose readability. SKILL structure is for **discovery + implementation**.

**Step 3: Content Migration Rules**

```
KEEP:
- Specific technical accuracy
- Real error messages/symptoms
- Code that's proven and current
- Security or performance warnings

REWRITE:
- Open-ended explanations (make them indexable)
- "Nice to know" context into triggers/decisions
- "Further reading" links into "When to use" reasoning

DELETE:
- Historical narrative ("We discovered this when...")
- Assumed reader context
- Platform-specific info outside your scope
- Examples in unsupported languages
```

**Example deletion decision:**
```
Original: "We tried pooling in MySQL and had issues with..."
SKILL-ready: (DELETE) — this is narrative. Keep ONLY:
  "When NOT to use: MySQL < 8.0 (no dynamic pool resizing)"
```

## REFACTOR Phase: Close Loopholes

**Baseline testing shows these rationalizations kill skills:**

| Rationalization | Reality | Your Defense |
|---|---|---|
| "Peer review will catch structure issues" | Review ≠ testing. Ambiguous structure persists through reviews. | Validate against 5 existing skills BEFORE review. |
| "I can see the pattern from 2 examples" | 2 examples = 70% confidence. 5+ = 90%. Large gap. | Read full skill directory. Document pattern findings. |
| "Time pressure makes guessing OK" | Under pressure, you cut verification. Verify BEFORE time crunch. | Complete RED phase first. If timing conflicts, delay migration. |
| "Code examples are 'good enough'" | Outdated examples break skills. Test every code snippet. | Actually run examples in current environment. |
| "Unclear requirements? Ship and iterate" | Iterating on foundation is expensive. Clarity first. | Stop. Answer 3 scoping questions (Step 3 above). Ask if unsure. |
| "We can cross-link skills later" | Cross-linking adds maintenance. Decide now. | Identify related skills during RED phase, reference in SKILL. |

**Required checklist before GREEN→REFACTOR:**
- [ ] Read agentskills.io spec for YAML rules
- [ ] Audited 5+ existing skills (documented patterns)
- [ ] Scoping questions answered IN WRITING
- [ ] Content validated: verify code runs, errors are current, examples match reality
- [ ] Frontmatter follows rules (tested against spec)

## Common Mistakes

**Mistake 1: Frontmatter Ambiguity**
```yaml
# ❌ Description is a workflow summary
description: Shows how to migrate proof-of-concept prompts to skills using TDD testing and validation

# ✅ Description is just the trigger
description: Use when converting existing prompts to SKILL.md format, before structuring content
```
Why? Claude may follow the summary instead of reading the full SKILL.

**Mistake 2: Merging vs. Restructuring**
```markdown
# ❌ BAD: Original intro + new section = confused structure
## Overview
Here's the old introduction about why this matters...
## When to Use
[Lists triggers but mixes with old narrative]

# ✅ GOOD: Clean separation
## Overview
What is this? [One sentence + core principle]
## When to Use
[ONLY: symptoms and use cases]
```

**Mistake 3: Keeping "Nice-to-Know" Content**
```markdown
# ❌ Bloats skill with narrative
## Historical Context
The technique evolved from research by Smith et al...

# ✅ SKILL focus
[DELETE narrative. Preserve only actionable patterns.]
```

**Mistake 4: Unclear Scoping = Bloat**
```markdown
# ❌ Tries to serve everyone
- C# examples + Python examples + Go examples
- SQL Server + MySQL + PostgreSQL
- 6 different config styles
= 3x maintenance, unclear audience

# ✅ Scoped clearly
- Target: C# developers
- Examples: C# only
- "Other teams: fork this skill for your language"
```

## Red Flags — STOP and Restart

If you see these during migration, **STOP and go back to RED phase:**

- [ ] You're deleting >30% of original content (unclear what deserves SKILL status)
- [ ] Frontmatter description describes the PROCESS, not the TRIGGER
- [ ] You're adding OR keeping multiple language/platform examples without scoping
- [ ] You haven't read agentskills.io spec OR current skill examples
- [ ] Time pressure forcing you to skip verification
- [ ] You're unsure about "Use when" scope (multiple conflicting audiences)
- [ ] Code examples aren't tested in actual environment (guessing "it should work")

**All of these = go back to RED phase. Clarify first.**

## Success Criteria

✅ Before shipping your SKILL.md, verify:

- [ ] YAML validates against agentskills.io spec
- [ ] Description: starts with "Use when", <500 chars, triggers only (no workflow)
- [ ] Tested: showed SKILL.md to 1 peer; they understood trigger (no explanation needed)
- [ ] Scoped: audience + platform explicit (or documented why language-agnostic)
- [ ] Content: all code examples run successfully in stated environment
- [ ] Comparison: read 5 similar skills; section names + structure matches pattern
- [ ] Confidence: >85% on "would I use this as-is or need major rewrites?"

If <85% confidence, **go back to RED phase**. Don't ship at 70%.

