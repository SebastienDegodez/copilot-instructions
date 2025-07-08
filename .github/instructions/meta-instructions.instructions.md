---
applyTo: '.github/instructions/*.instructions.md'
description: Template and requirements for writing meta-instructions for Copilot. Every instruction must include an applyTo and description in its front-matter, and follow the documented structure and best practices.
---

# Meta-Instruction Template

## Purpose
Template and requirements for writing meta-instructions for Copilot. Every instruction must include an applyTo and description in its front-matter, and follow the documented structure and best practices.

## File Naming and Title Conventions
- Every meta-instruction file must begin with a clear, descriptive title as the first heading (e.g., "Meta-Instruction Template").
- The title must use sentence case and accurately reflect the file's purpose (e.g., "Meta-Instruction Template").
- The filename must be clear, descriptive, in English, use hyphens, and end with the `.instructions.md` extension.
- The title and filename should be consistent with each other and with the file's content.

## Structure
- **Front-matter**: YAML block with at least `applyTo` (file glob) and `description` (short summary of the instruction's intent), plus any relevant metadata (e.g., `type`, `scope`).
- **Sections**: Each instruction should include the following sections:
  - Title
  - Purpose
  - Rules or Guidelines
  - Best Practices
  - Examples (code or usage)
  - References (optional)

## Rules
- Instructions must be clear, actionable, and unambiguous.
- Use imperative language ("Do", "Use", "Avoid").
- Reference external standards or documentation when possible.
- If the instruction is technology-specific, state it explicitly in the front-matter and body.
- For process or workflow instructions, include step-by-step guidance.
- Every instruction front-matter **must** include an `applyTo` field (file glob) and a `description` field (short summary).

## Best Practices
- Keep instructions concise but comprehensive.
- Use lists and code blocks for clarity.
- Provide rationale for rules when relevant.
- Update instructions as standards evolve.

## Example
```instructions
---
applyTo: '**/*.cs'
description: Enforces C# coding style and formatting conventions
---
# Example Instruction Title

## Purpose
Explain the goal of this instruction. Describe the intent and scope of this instruction meta-prompt. Explain what kind of instructions it is meant to generate or validate (e.g., coding standards, architecture rules, process guidelines).

## Rules
- Rule 1
- Rule 2

## Best Practices
- Practice 1
- Practice 2

## Examples
```csharp
// Example code
```

## References
- [External Link](https://example.com)
```

## References
- [Copilot Custom Instructions Documentation](https://code.visualstudio.com/docs/copilot/copilot-customization)
