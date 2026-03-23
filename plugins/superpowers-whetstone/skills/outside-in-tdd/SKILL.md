---
name: outside-in-tdd
description: Use when writing tests from the outside-in, defining behavior before code, or any feature where tests should start from observable business behavior and let internal design emerge
---

# Outside-In DDD Testing

## Overview

Complete testing guide for outside-in development.
Start from observable behavior (Gherkin), let design emerge from tests.

**Core rule:** Real domain objects, mocked external boundaries, fast in-memory tests.

## Outside-In Approach

**Prerequisite:** Gherkin scenarios must be written and approved before this skill applies. This includes new features, bug fixes, and behavior-changing refactoring. If Gherkin scenarios are already approved for the current task, proceed directly to Step 1 — gherkin-gate is already done.
**REQUIRED SUB-SKILL:** `superpowers-whetstone:gherkin-gate` — run first, wait for approval, then return here.

### Step 1: Map Scenario to Acceptance Test

1. **Map Gherkin to test** — translate scenario to a top-level acceptance-style test
2. **Write the test** — mock only external boundaries, use real domain objects

### Step 2: Let Domain Emerge

**STOP. Do NOT create any domain class, value object, entity, policy, or enum before your first test fails to compile.** Design MUST emerge from red — not from upfront thinking. Even if you already know the domain from context, create nothing until the test's compilation failure confirms what's needed. This includes adding 'just a new variant' of something that already exists: a new vehicle type, a new rejection reason, a new value object field, or a new boundary value — even if similar ones already exist in the codebase. Wait for the test's compilation failure before creating the new type.

Test failures reveal the domain you need. Let the design emerge from failing tests — don't design upfront.
- Domain objects (policies, value objects, services) emerge from what the test demands
- Orchestrators only coordinate — domain logic lives in the domain
- Real domain objects (not mocked)
- No design upfront — the test tells you what to build

### Step 3: Verify with Mutation Testing

Once both acceptance and domain test streams are green:

**REQUIRED SUB-SKILL:** `superpowers-whetstone:mutation-testing` — run NOW, before merge. 100% on business logic, equivalent mutants are the only accepted survivors. This applies to ALL changes — not just new features. Bug fixes, refactoring, and edge case additions must also pass mutation testing if any test was written or changed to make this work.

## Acceptance-Style Tests (Sociable — Entry Point Level)

Test the system entry point with real domain objects. Mock only external boundaries. Verify orchestration + observable behavior.

```csharp
[Fact]
public async Task WhenSubmittingValidRequest_ShouldPersistPendingRecord()
{
    var repository = A.Fake<IRequestRepository>();
    var handler = new SubmitRequestHandler(repository);
    var command = new SubmitRequestCommand(
        UserId.CreateNew(),
        new UserInfo(Age: 25, YearsOfExperience: 3),
        new ResourceInfo(Type: "standard", Age: 1));

    await handler.Handle(command);

    A.CallTo(() => repository.AddAsync(
        A<RequestRecord>.That.Matches(r => r.Status == RequestStatus.Pending),
        A<CancellationToken>._)).MustHaveHappenedOnceExactly();
}
```

## Domain Tests (Pure — Rule Level)

Test business **policies**, **rules**, and **domain services** — not data structures directly.  
No mocks — pure state-based assertions.

```csharp
[Fact]
public void WhenUserIsUnderMinimumAge_ShouldBeRejected()
{
    var policy = new EligibilityPolicy();
    var user = new UserInfo(Age: 17, YearsOfExperience: 0);
    var resource = new ResourceInfo(Type: "standard", Age: 1);

    var result = policy.Evaluate(user, resource);

    Assert.False(result.IsEligible);
    Assert.Equal("minimum_age_not_met", result.RejectionReason);
}
```

**What NOT to test directly:**
- Basic constructors (unless complex invariants)
- Simple value objects (covered by usage in policies/orchestrators)
- Simple getters/setters
- DTOs or passive data structures

## When to Write Which

| Signal | Route to |
|---|---|
| Orchestration (load/save/publish) | Use Case test (Acceptance) |
| Business rule inside an Aggregate | Use Case test (Acceptance) |
| Complex invariants, large edge-case matrices, or reused rules | Extract to Policy + Domain test |
| Simple rule | Already covered by primary Use Case test |

**Default:** Start with a Use Case test. Add Domain tests only if extracting a complex rule makes testing simpler.

## Testing Rules

### DO ✅
- Mock only external boundaries (repositories, external services)
- Use real domain objects (entities, policies, services)
- Keep tests fast (< 100ms, no DB, no network)
- Name tests with business language (`WhenCondition_ShouldOutcome`)
- Cover meaningful edge-case combinations

### DON'T ❌
- Don't mock domain objects
- Don't centralize strategic rules in orchestrators
- Don't use integration tooling in unit tests
- Don't test implementation details — test behavior
- Don't couple to a specific assertion library in the skill

## Anti-Patterns

- Strategic rules in orchestrators instead of domain
- Over-mocking that hides real business behavior
- Treating coverage percentage as the quality target
- Duplicating acceptance test coverage with redundant domain tests

## Mutation Testing (Third Validation Layer)

After both test streams are green, verify test effectiveness with mutation testing.

**REQUIRED SUB-SKILL:** `superpowers-whetstone:mutation-testing` — run after tests green, before merge. 100% on business logic, equivalent mutants are the only accepted survivors.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Mocking domain objects in acceptance tests | Use real domain objects, mock only external boundaries |
| Designing domain objects upfront | Let domain emerge from test failures — don't design before testing |
| Treating compilation errors as failures | Stub to compile, then confirm behavior failure (see `red-synthesize-green`) |
| Skipping Gherkin ("too small") | Even small features benefit from behavior-first thinking |
| Missing human validation loop | Ensure `red-synthesize-green` cycle is followed exactly |
| Polluting Gherkin with class/endpoint names | Keep scenarios in business language only |
| Testing data structures directly by default | Test policies/rules; data types are covered by usage |
| Skipping mutation testing before merge | Run mutation-testing skill after tests green |
| Skipping Gherkin for a bug fix | Always write a failing Gherkin scenario that reproduces the bug before fixing it — gherkin-gate applies to bug fixes too |

## Integration

**REQUIRED SUB-SKILL:** `superpowers-whetstone:gherkin-gate` — scenarios approved before this skill
**REQUIRED SUB-SKILL:** `superpowers-whetstone:red-synthesize-green` — follow the 2-step AI TDD cycle
**REQUIRED SUB-SKILL:** `superpowers-whetstone:mutation-testing` — run after tests green, before merge

## References
- [test-examples.md](references/test-examples.md) - Examples of both Acceptance and Domain tests.
- [testing-strategy.md](references/testing-strategy.md) - Detailed explanation of the testing pyramid and strategy.
- [cqrs-patterns.md](references/cqrs-patterns.md) - CQRS architecture references.

