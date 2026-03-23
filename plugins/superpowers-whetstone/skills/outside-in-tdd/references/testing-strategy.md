# Testing Strategy: Sociable Tests for DDD

## Philosophy

This testing strategy follows Martin Fowler's **sociable testing** approach:

- **Sociable tests** use real collaborators from within the same layer or below
- **Solitary tests** (with mocks) are used only for external dependencies

## What to Test Where

### Application Layer Tests (primary focus)
- Test use cases (Command/Query handlers) with real Domain objects
- Mock only Infrastructure dependencies (repositories, external services)
- Validate the entire business flow including Domain logic
- Located in: `tests/[Project].UnitTests/Application/`

### Domain Layer Tests (when needed)
- Test **domain services** (policies, specifications, calculators) in isolation
- Aggregates, value objects, and entities are **not** tested directly — they are exercised through the domain service or through Acceptance tests
- Most Domain logic is already covered through Acceptance tests
- Located in: `tests/[Project].UnitTests/Domain/`

### Integration Tests (full stack)
- Test API endpoints with real infrastructure (Testcontainers)
- Located in: `tests/[Project].IntegrationTests/`

## When Application vs Domain Tests

| Signal | Route to |
|---|---|
| Orchestration (load/save/publish/map) | Acceptance test |
| Complex business rules with edge-case matrices | Domain test (on domain service) |
| Domain service with non-trivial policy logic | Domain test (on domain service) |
| Aggregate / VO / entity logic | Acceptance test — exercised via handler, not tested directly |
| Simple rule adequately covered by handler test | Don't duplicate — Acceptance test is enough |

**Default:** Start with Acceptance test. Add Domain test only when complexity warrants it.

## Decision Framework: 3 Questions

Ask yourself these 3 questions to route a test to the right layer:

**1. Am I testing a pure business rule?**
→ **Domain test** — isolated, no mocks, state-based assertions on a **domain service** (e.g. `EligibilityPolicy`). Aggregates, VOs, and entities are not tested directly.

**2. Am I testing a use case?**
→ **Sociable Acceptance test**
- Real Domain objects
- External ports (repositories, services) faked/in-memory

**3. Am I testing a technical integration?**
→ **Integration test** — full stack, real infrastructure (Testcontainers, HTTP client).

## Testing Rules

### DO ✅
- Test handlers with real Domain objects (aggregates, VOs, services)
- Mock only Infrastructure layer (repositories, external services)
- Keep tests fast (no Testcontainers, no DB, no network, < 100ms)
- Name tests with business language (`WhenDoingSomething_ShouldExpectedBehavior`)
- Verify Domain state changes through observable outcomes

### DON'T ❌
- Don't mock Domain objects (`A.Fake<Order>()` — never)
- Don't centralize strategic rules in handlers — keep them in Domain
- Don't use Testcontainers in unit tests — save for Integration
- Don't test implementation details — test behavior

## Benefits

1. **Fast execution**: No external dependencies in unit tests
2. **Real behavior**: Tests verify actual Domain logic, not mocks
3. **Refactoring safety**: Tests break only when behavior changes
4. **Clear intent**: Tests show how Domain and Application work together
5. **Maintainability**: Fewer mocks = less maintenance overhead
