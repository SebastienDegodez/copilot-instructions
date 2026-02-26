# Testing Strategy: Sociable Tests for DDD

## Philosophy

This testing strategy follows Martin Fowler's **sociable testing** approach (see https://martinfowler.com/bliki/UnitTest.html):

- **Sociable tests** use real collaborators from within the same layer or below
- **Solitary tests** (with mocks) are used only for external dependencies

## Core Principles

### What to Test Where

1. **Application Layer Tests** (primary focus)
   - Test use cases (Commands/Queries handlers) with real Domain objects
   - Mock only Infrastructure dependencies (repositories, external services)
   - These tests validate the entire business flow including Domain logic
   - Located in: `tests/[Project].UnitTests/Application/`

2. **Domain Layer Tests** (minimal, only when necessary)
   - Test complex domain logic that needs isolated validation
   - Test specifications, complex calculations, or critical invariants
   - Most Domain logic is tested through Application tests
   - Located in: `tests/[Project].UnitTests/Domain/`

3. **Integration Tests** (for full stack validation)
   - Test API endpoints with real infrastructure (Testcontainers)
   - Located in: `tests/[Project].IntegrationTests/`

## Testing Rules

### DO ✅

- **Test Application handlers with real Domain objects**
  - Create real aggregates, entities, value objects
  - Invoke real Domain methods
  - Verify Domain state changes

- **Mock only Infrastructure layer**
  - Mock repositories (IOrderRepository, etc.)
  - Mock external services (IPaymentService, etc.)
  - Mock infrastructure interfaces defined in Application layer

- **Keep tests fast**
  - No Testcontainers in unit tests
  - No database access
  - No network calls
  - Target: < 100ms per test

- **Use meaningful test names**
  - Follow pattern: `WhenDoingSomething_ShouldExpectedBehavior`
  - Example: `WhenPlacingOrderWithInvalidQuantity_ShouldThrowDomainException`

### DON'T ❌

- **Don't mock Domain objects in Application tests**
  - ❌ Bad: `A.CallTo(() => fakeOrder.AddItem(...))`
  - ✅ Good: `var order = Order.Create(...); order.AddItem(...);`

- **Don't test Domain extensively in isolation**
  - Domain is tested through Application tests
  - Only add specific Domain tests for complex calculations or edge cases

- **Don't use Testcontainers in unit tests**
  - Keep unit tests fast
  - Use Testcontainers only in Integration tests

## Example Structure

```
tests/
  [Project].UnitTests/
    Application/
      Orders/
        PlaceOrderCommandHandlerTests.cs
        GetOrderQueryHandlerTests.cs
      Customers/
        CreateCustomerCommandHandlerTests.cs
    Domain/
      Orders/
        OrderSpecificationTests.cs (only if needed)
```

## When to Add Domain Tests

Add specific Domain tests only when:
- Complex calculations exist that are hard to test through Application
- Critical specifications need explicit validation
- Edge cases are easier to test in isolation
- Business rules are complex and need focused testing

Most of the time, Application tests are sufficient.

## Tools

- **xUnit v3**: Test framework
- **FakeItEasy**: For mocking Infrastructure dependencies
- **No Testcontainers**: In unit tests (use in Integration tests only)

## Benefits of This Approach

1. **Fast execution**: No external dependencies in unit tests
2. **Real behavior**: Tests verify actual Domain logic, not mocks
3. **Refactoring safety**: Tests break only when behavior changes, not structure
4. **Clear intent**: Tests show how Domain and Application work together
5. **Maintainability**: Fewer mocks = less maintenance overhead
