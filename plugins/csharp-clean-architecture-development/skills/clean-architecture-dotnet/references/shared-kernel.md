# SharedKernel: Shared Abstractions

## When to Use

When you have **multiple projects/Bounded Contexts** that need to share:
- CQRS handler interfaces
- Common value objects
- Base abstractions

**Independent of architecture choice** (with or without DDD).

## SharedKernel Structure

```
SharedKernel/
├── Abstractions/
│   ├── ICommandHandler.cs       ← CQRS interface
│   ├── IQueryHandler.cs         ← CQRS interface
│   ├── ValueObject.cs           ← Base class for domain value objects
│   └── AggregateRoot.cs         ← Base class for aggregates
├── Events/
│   └── DomainEvent.cs           ← Base class for domain events
└── Tests/
    └── ArchitectureTests.cs     ← Validates isolation
```

## Rule: All Shared Abstractions in SharedKernel

Share **zero domain logic**, only:
- ✅ Generic interfaces (`ICommandHandler<>`, `IQueryHandler<>`)
- ✅ Base classes (`ValueObject`, `AggregateRoot`, `DomainEvent`)
- ✅ Each context defines its own value objects, aggregates, and events inheriting from these bases

Do NOT share concrete implementations:
- ❌ Domain value objects like `Money`, `Address`, `Percentage` (each context defines its own)
- ❌ Aggregate-specific logic
- ❌ Context-specific event types

## CQRS Interfaces (Shared)

```csharp
// SharedKernel/Abstractions/ICommandHandler.cs
public interface ICommandHandler<in TCommand, TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken ct = default);
}

// SharedKernel/Abstractions/IQueryHandler.cs
public interface IQueryHandler<in TQuery, TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken ct = default);
}

// Any context imports and implements from SharedKernel
namespace Orders.Application.Features.PlaceOrder;
using SharedKernel.Abstractions;

public sealed class PlaceOrderCommandHandler
    : ICommandHandler<PlaceOrderCommand, OrderId> { }
```

## Value Object Base Class

```csharp
// SharedKernel/Abstractions/ValueObject.cs
public abstract class ValueObject : IEquatable<ValueObject>
{
    protected abstract IEnumerable<object?> GetEqualityComponents();
    
    public override bool Equals(object? obj)
    {
        if (obj is null || obj.GetType() != GetType())
            return false;
        
        var other = (ValueObject)obj;
        return GetEqualityComponents().SequenceEqual(other.GetEqualityComponents());
    }
    
    public override int GetHashCode()
    {
        return GetEqualityComponents()
            .Aggregate(1, (current, obj) => HashCode.Combine(current, obj?.GetHashCode() ?? 0));
    }
    
    public static bool operator ==(ValueObject? left, ValueObject? right)
    {
        return Equals(left, right);
    }
    
    public static bool operator !=(ValueObject? left, ValueObject? right)
    {
        return !Equals(left, right);
    }
}
```

## Aggregate Root Base Class

```csharp
// SharedKernel/Abstractions/AggregateRoot.cs
public abstract class AggregateRoot
{
    private readonly List<DomainEvent> _domainEvents = [];
    
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    
    protected void AddDomainEvent(DomainEvent @event)
    {
        _domainEvents.Add(@event);
    }
    
    public void ClearDomainEvents()
    {
        _domainEvents.Clear();
    }
}
```

## Domain Event Base Class

```csharp
// SharedKernel/Events/DomainEvent.cs
public abstract class DomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime Timestamp { get; } = DateTime.UtcNow;
}
```

## Project Structure

```
Solution/
├── SharedKernel/                  ← Base classes + interfaces only
│   ├── Abstractions/
│   │   ├── ICommandHandler.cs
│   │   ├── IQueryHandler.cs
│   │   ├── ValueObject.cs
│   │   └── AggregateRoot.cs
│   ├── Events/
│   │   └── DomainEvent.cs
│   └── Tests/
│       └── ArchitectureTests.cs
│
├── Orders/                        ← Each Bounded Context independent
│   ├── Domain/
│   │   ├── Order.cs               ← inherits AggregateRoot
│   │   ├── OrderId.cs             ← inherits ValueObject
│   │   ├── Money.cs               ← inherits ValueObject
│   │   └── Events/
│   │       └── OrderPlacedEvent.cs ← inherits DomainEvent
│   ├── Application/
│   │   └── Features/
│   │       └── PlaceOrder/
│   │           └── PlaceOrderCommandHandler  ← impl ICommandHandler
│   └── Infrastructure/
│       └── OrderRepository.cs
│
├── Customers/
│   ├── Domain/
│   │   ├── Customer.cs
│   │   ├── CustomerId.cs
│   │   └── Events/...
│   ├── Application/...
│   └── Infrastructure/...
```

## Architecture Tests

```csharp
[Fact]
public void SharedKernel_ShouldHaveZeroDependencies()
{
    var result = Types.InAssembly(typeof(SharedKernelMarker).Assembly)
        .Should()
        .NotHaveDependencyOn("Orders")
        .And()
        .NotHaveDependencyOn("Customers")
        .GetResult();
    
    Assert.True(result.IsSuccessful, "SharedKernel must not reference any project");
}

[Fact]
public void Projects_ShouldReferenceSharedKernelOnly()
{
    var ordersAssembly = typeof(OrdersMarker).Assembly;
    
    var result = Types.InAssembly(ordersAssembly)
        .Should()
        .NotHaveDependencyOn("Customers")
        .GetResult();
    
    Assert.True(result.IsSuccessful, "Projects must not cross-reference");
}
```

## Key Rules

| Rule | Why |
|------|-----|
| SharedKernel = zero domain logic | Avoids coupling |
| Only abstractions + shared VOs | Clean dependency |
| Each project isolated | Independent deployment |
| All imports are unidirectional → SharedKernel | Prevents cycles |
