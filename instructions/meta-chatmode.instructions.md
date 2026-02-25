---
applyTo: ".github/chatmodes/**"
---

# Chatmode Instructions

## Purpose

Define the standard for creating, structuring, and using chatmode files in the project. A chatmode configures the behavior of an AI agent (e.g., Copilot) for a specific context or workflow (e.g., architect, reviewer, tester).

## General Rules

-   A chatmode file must only be created if the user explicitly requests a specific dialogue/configuration mode for the AI (e.g., "Create an architect chatmode", "Add a reviewer chatmode").
-   Chatmodes are passive: they modify the AI's behavior in the background for all relevant requests.
-   Each chatmode must be documented in English and clearly describe:
    -   The expected role of the AI (e.g., "Act as an experienced software architect")
    -   The priorities, tone, constraints, and objectives of the mode
    -   The specific instructions to apply (e.g., "Always propose an architecture before generating code")
-   The file name must follow the format: `{role}.chatmode.md` (e.g., `architect.chatmode.md`, `reviewer.chatmode.md`).
-   The front matter must include:
    -   `tools` (optional): List of tools required by the chatmode.
    -   `description` (optional): summary of the chatmode

## Chatmode File Structure

1. **Front matter YAML** (mandatory)
2. **Main title** (`#`)
3. **Chatmode purpose**
4. **Expected behavior**
5. **Constraints and priorities**
6. **Example usage**
7. **References** (other related instructions or prompts)

## Examples

```markdown
---
description: "Architect: Configure Copilot to act as a software architect."
---

# Architect Chatmode

## Purpose
Configure the AI to act as an experienced software architect, focusing on planning, documentation, and high-level design before any code generation.

## Expected Behavior
- Always propose an architecture or design before generating code.
- Use only Markdown for outputs (no code unless explicitly requested).
- Ask clarifying questions if requirements are ambiguous.

## Priorities
- Clarity, maintainability, and scalability of proposed solutions.
- Alignment with project instructions and standards.

## Example Usage
- "Design a microservice architecture for a file upload system."
- "What are the trade-offs between REST and gRPC for this use case?"

## References
- domain-driven-design.instructions.md
- object_calisthenics.instructions.md
```

## Validation Checklist

- [ ] The file name follows the `{role}.chatmode.md` format.
- [ ] The role and behavior are clearly defined.
- [ ] The file is in English and follows the recommended structure.
- [ ] References to other instructions are present if relevant.

