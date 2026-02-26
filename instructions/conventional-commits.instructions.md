---
applyTo: '*'
---
# Conventional Commits Instructions

Adopt the [Conventional Commits](https://www.conventionalcommits.org/) specification for all commit messages to ensure a readable history, automate changelog generation, and facilitate continuous integration.

## Main Rules

- The commit message must be structured as follows:
  ```
  <type>[optional scope]: <description>
  ```
  - **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
  - **scope** (optional): the part of the code concerned (e.g., `api`, `domain`, `infrastructure`, `tests`)
  - **description**: short imperative description, no initial capital letter, no period at the end
  - **first line must not exceed 72 characters**

- Examples:
  - `feat(api): add order endpoint`
  - `fix(domain): correct order validation logic`
  - `test(order): add unit tests for order creation`
  - `chore: update dependencies`

## Best Practices

- Use English for all commit messages.
- One commit = one logical/unit change.
- Use the scope to specify the affected layer or feature.
- For breaking changes, add `!` after the type or scope and detail in the commit body.

---

Follow this convention for all project commits.
