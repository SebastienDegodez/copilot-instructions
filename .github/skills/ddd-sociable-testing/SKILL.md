---
name: ddd-sociable-testing
description: Guide for implementing CQRS features with DDD and sociable testing in C#. Use when implementing new features (Commands/Queries), creating test classes for Application layer handlers, or applying sociable testing strategy where Domain objects are tested through Application layer with real collaborators and only Infrastructure is mocked. Focus on fast unit tests without Testcontainers.
---

# DDD Sociable Testing

Guide for implementing CQRS features using DDD principles with Martin Fowler's sociable testing approach in C#.

## Core Philosophy

**Sociable testing**: Test Application layer handlers with real Domain objects. Mock only Infrastructure dependencies (repositories, external services). This provides fast, maintainable tests that verify actual business behavior.

## Feature Implementation Workflow (Test First)

**CRITICAL: Always write tests FIRST before any implementation code.**

When implementing a CQRS feature, follow this strict test-first workflow:

### 1. Create Test Class FIRST

**ALWAYS start here. No implementation before tests.**

Create test class in `tests/[Project].UnitTests/Application/[Feature]/Commands/` or `.../Queries/`:

```csharp
public sealed class PlaceOrderCommandHandlerTests
{
    [Fact]
    public async Task WhenPlacingValidOrder_ShouldCreateConfirmedOrder()
    {
        // Write failing test first
        // This will guide your Command/Query structure
    }
}
```

Use templates from `assets/CommandHandlerTestTemplate.cs` or `assets/QueryHandlerTestTemplate.cs`.

### 2. Define Command/Query Structure

**After writing tests**, define the contract structures:

**Commands** (write operations):
```csharp
// [Project].Application/[Feature]/Commands/[Action]/[Action]Command.cs
public sealed record PlaceOrderCommand(
    OrderId OrderId,
    CustomerId CustomerId,
    List<OrderLineDto> OrderLines,
    Address ShippingAddress
);
```

**Queries** (read operations):
```csharp
// [Project].Application/[Feature]/Queries/[Action]/[Action]Query.cs
public sealed record GetOrderQuery(OrderId OrderId);

// Return ViewModels (not Domain objects)
public sealed record OrderViewModel(/* properties */);
```

### 3. Implement Handler

Create handler with business logic orchestration:

```csharp
public sealed class PlaceOrderCommandHandler
{
    private readonly IOrderRepository _orderRepository;
    private readonly IInventoryService _inventoryService;

    public async Task<OrderId> Handle(PlaceOrderCommand command, CancellationToken ct = default)
    {
        // Create real Domain aggregate
        var order = Order.Create(command.OrderId, command.CustomerId, command.ShippingAddress);
        
        // Apply business logic through Domain methods
        foreach (var line in command.OrderLines)
            order.RegisterOrderItem(line.ProductId, line.ProductName, line.Quantity, line.Price);
        
        order.Confirm();
        
        // Call Infrastructure (mocked in tests)
        await _inventoryService.ReserveItems(order.OrderLines, ct);
        await _orderRepository.AddAsync(order, ct);
        
        return order.Id;
    }
}
```

### 4. Complete Test Implementation

**Command Test Example**:
```csharp
[Fact]
public async Task WhenPlacingValidOrder_ShouldCreateConfirmedOrderWithItems()
{
    // Arrange - Mock only Infrastructure
    var orderRepository = A.Fake<IOrderRepository>();
    var inventoryService = A.Fake<IInventoryService>();
    var handler = new PlaceOrderCommandHandler(orderRepository, inventoryService);

    var command = new PlaceOrderCommand(
        OrderId.CreateNew(),
        CustomerId.CreateNew(),
        new List<OrderLineDto>
        {
            new(ProductId.CreateNew(), "Product A", 2, 10.00m)
        },
        new Address("Street", "City", "Country")
    );

    // Act - Handler uses real Domain objects internally
    var orderId = await handler.Handle(command);

    // Assert - Verify Infrastructure calls AND Domain state
    A.CallTo(() => orderRepository.AddAsync(
        A<Order>.That.Matches(o =>
            o.Id == command.OrderId &&
            o.Status == OrderStatus.Confirmed &&
            o.OrderLines.Count == 1
        ),
        A<CancellationToken>._
    )).MustHaveHappenedOnceExactly();
}

[Fact]
public async Task WhenPlacingOrderWithInvalidQuantity_ShouldThrowDomainException()
{
    // Arrange
    var orderRepository = A.Fake<IOrderRepository>();
    var inventoryService = A.Fake<IInventoryService>();
    var handler = new PlaceOrderCommandHandler(orderRepository, inventoryService);

    var invalidCommand = new PlaceOrderCommand(
        OrderId.CreateNew(),
        CustomerId.CreateNew(),
        new List<OrderLineDto> { new(ProductId.CreateNew(), "Product", -1, 10.00m) },
        new Address("Street", "City", "Country")
    );

    // Act & Assert - Domain validation triggers
    await Assert.ThrowsAsync<DomainException>(() => handler.Handle(invalidCommand));
    
    // Verify Infrastructure not called
    A.CallTo(() => orderRepository.AddAsync(A<Order>._, A<CancellationToken>._))
        .MustNotHaveHappened();
}
```

### 5. Run Tests Continuously

```bash
dotnet watch test
```

Keep tests running during development. Fix issues immediately. Tests must pass before moving forward.

### 6. Validate with Mutation Testing

**After all tests pass**, run mutation tests to ensure 100% code coverage and no surviving mutants:

```bash
dotnet stryker
```

**Mutation testing validates**:
- All code paths are tested
- Tests actually verify behavior (not just code coverage)
- No "weak" tests that pass even when logic is broken

**Target**: 
- 100% mutation score (no surviving mutants)
- All mutants must be killed by tests

**If mutants survive**:
1. Review the mutation report
2. Identify untested scenarios or weak assertions
3. Add/strengthen tests to kill mutants
4. Re-run mutation tests until 100%

Mutation testing ensures your sociable tests truly validate Domain behavior, not just code execution.

## Testing Rules

### DO ✅

- **Mock only Infrastructure**: Repositories, external services, Infrastructure interfaces
- **Use real Domain objects**: Create aggregates, invoke Domain methods, verify Domain state
- **Test through Application layer**: Application tests cover Domain logic
- **Keep tests fast**: No Testcontainers, no database, no network (<100ms per test)
- **Test business rules**: Verify Domain validations and invariants trigger correctly

### DON'T ❌

- **Don't mock Domain objects**: Never `A.Fake<Order>()` in Application tests
- **Don't test Domain extensively in isolation**: Most Domain is tested through Application
- **Don't use Testcontainers in unit tests**: Save for Integration tests only
- **Don't test implementation details**: Test behavior, not structure

## When to Add Domain Tests

Add specific Domain tests only when:
- Complex calculations need isolated testing
- Critical specifications require explicit validation
- Edge cases are hard to test through Application
- Business rules are complex and benefit from focused testing

Most scenarios are covered by Application tests.

## Project Structure

```
tests/
  [Project].UnitTests/
    Application/
      Orders/
        Commands/
          PlaceOrderCommandHandlerTests.cs
        Queries/
          GetOrderQueryHandlerTests.cs
    Domain/  (minimal, only if needed)
      Orders/
        OrderSpecificationTests.cs
```

## Key Tools

- **xUnit v3**: Test framework
- **FakeItEasy**: For mocking Infrastructure
- **Stryker.NET**: Mutation testing to ensure 100% coverage and no surviving mutants
- **No Testcontainers**: In unit tests (use in Integration tests)

## Detailed References

For comprehensive guides, see:

- **[testing-strategy.md](references/testing-strategy.md)**: Sociable vs solitary testing philosophy, what to test where, testing rules
- **[cqrs-patterns.md](references/cqrs-patterns.md)**: Command/Query patterns, handler structure, testing commands vs queries
- **[test-examples.md](references/test-examples.md)**: Complete code examples with Domain aggregates, handlers, and tests
- **[mutation-testing.md](references/mutation-testing.md)**: Mutation testing with Stryker.NET, ensuring 100% mutation score, killing all mutants

## Test Templates

Use these templates as starting points:

- **[CommandHandlerTestTemplate.cs](assets/CommandHandlerTestTemplate.cs)**: Template for Command handler tests
- **[QueryHandlerTestTemplate.cs](assets/QueryHandlerTestTemplate.cs)**: Template for Query handler tests
