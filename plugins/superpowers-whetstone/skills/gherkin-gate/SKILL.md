---
name: gherkin-gate
description: Use before writing any test or implementation task, when observable behavior needs to be captured in business language scenarios and approved by the user before code begins
---

# Gherkin Gate

## Overview

Capture observable behavior in business language before any test or code is written. User approval is the mandatory gate.

**Hard rule:** No test, no task, no implementation until scenarios are approved.

## Writing Scenarios

Write 1-3 scenarios in Given/When/Then:

```gherkin
GIVEN [precondition in business language].
WHEN [action in business language].
THEN [observable outcome in business language].
```

Each scenario should be independent and verifiable in isolation. Cover the main success path and 1-2 key edge cases.

## Spec-Leakage Rule (CRITICAL)

Scenarios must describe **external observables only**. Never reference implementation details:

| Forbidden | Allowed |
|---|---|
| Class names, method names | Business actions and actors |
| Repository, database, tables | Data in business terms |
| HTTP endpoints, status codes | Business outcomes |
| Internal state, variables | Observable system behavior |

❌ BAD: `GIVEN the EligibilityPolicy has empty rules.`
✅ GOOD: `GIVEN no eligibility rules are configured.`

❌ BAD: `THEN the handler returns a 200 OK response.`
✅ GOOD: `THEN the request is accepted.`

❌ BAD: `WHEN I call POST /api/eligibility.`
✅ GOOD: `WHEN checking eligibility for the user.`

## Approval Gate

1. Present scenarios clearly labeled: **"Gherkin Scenarios — awaiting approval"**
2. **WAIT** for explicit user approval before proceeding
3. If rejected: revise scenarios and repeat from step 1
4. Only after approval: proceed to test writing or task planning

**This gate is not skippable** — even for "small" features.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Skipping scenarios for "trivial" features | Write 1 scenario minimum — even simple features benefit |
| Implementation details in scenarios | Business language only in Given/When/Then |
| Proceeding before explicit approval | "ok" or "proceed" counts, silence does not |
| More than 3 scenarios up front | Start with main success path, add edge cases after RED |
