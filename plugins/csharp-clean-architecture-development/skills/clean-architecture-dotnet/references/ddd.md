# DDD: Optional Patterns

## When to Use

Apply DDD patterns when:
- You have complex business logic requiring aggregates and entities
- You need strong encapsulation of domain invariants
- Multiple use cases operate on the same domain model
- Business terminology (ubiquitous language) is critical

**Works standalone OR with SharedKernel abstractions.**

## Domain-Driven Concepts

### Aggregate Root Base Class

```csharp
// SharedKernel/Abstractions/AggregateRoot.cs (if multi-context)
// OR Domain/AggregateRoot.cs (if single context)
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

### Aggregates (with Factory Methods)

```csharp
// Domain/Orders/Order.cs
public sealed class Order : AggregateRoot
{
    private readonly List<OrderLine> _lines = [];
    
    public OrderId Id { get; }
    public CustomerId CustomerId { get; }
    public IReadOnlyCollection<OrderLine> Lines => _lines.AsReadOnly();
    
    // Private constructor — enforce factory method
    private Order(OrderId id, CustomerId customerId) 
    {
        Id = id;
        CustomerId = customerId;
    }
    
    // Factory method is the ONLY way to create
    public static Order Create(OrderId id, CustomerId customerId)
    {
        if (id.Value == Guid.Empty) throw new ArgumentException("Invalid OrderId");
        var order = new Order(id, customerId);
        order.AddDomainEvent(new OrderPlacedEvent(id, customerId, 0));
        return order;
    }
    
    // Business intent methods (NOT CRUD)
    public void CancelOrder()
    {
        AddDomainEvent(new OrderCancelledEvent(Id));
    }
    
    public void ShipOrder() { }
    
    public void RegisterOrderItem(string productName, int quantity, decimal price)
    {
        if (quantity <= 0) throw new ArgumentException("Invalid quantity");
        _lines.Add(OrderLine.Create(productName, quantity, price));
    }
}
```

### Entities (Owned by Aggregates)

```csharp
// Domain/Orders/OrderLine.cs
public sealed class OrderLine
{
    public OrderLineId Id { get; }
    public string ProductName { get; }
    public int Quantity { get; }
    public decimal UnitPrice { get; }
    
    private OrderLine(OrderLineId id, string productName, int quantity, decimal price)
    {
        Id = id;
        ProductName = productName;
        Quantity = quantity;
        UnitPrice = price;
    }
    
    public static OrderLine Create(string productName, int quantity, decimal price)
    {
        return new OrderLine(OrderLineId.New(), productName, quantity, price);
    }
    
    // Entities are OWNED — never stand alone
    public decimal Total() => Quantity * UnitPrice;
}
```

### Value Objects (Immutable)

```csharp
// Domain/Orders/OrderId.cs
using SharedKernel.Abstractions;

public sealed class OrderId : ValueObject
{
    public Guid Value { get; }
    
    private OrderId(Guid value)
    {
        Value = value;
    }
    
    public static OrderId New() => new(Guid.NewGuid());
    public static OrderId From(Guid value) => new(value);
    
    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }
}

// Domain/Orders/Money.cs (inherits from SharedKernel)
using SharedKernel.Abstractions;

public sealed class Money : ValueObject
{
    public decimal Amount { get; }
    public string Currency { get; }
    
    private Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }
    
    public static Money Create(decimal amount, string currency)
    {
        if (amount < 0) throw new ArgumentException("Amount must be >= 0");
        if (string.IsNullOrWhiteSpace(currency)) throw new ArgumentException("Currency required");
        return new Money(amount, currency);
    }
    
    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Amount;
        yield return Currency;
    }
}
```

### Repositories (Domain Language)

```csharp
// Domain/Orders/IOrderRepository.cs
public interface IOrderRepository
{
    // Business intent, NOT CRUD
    Task<Order?> FindByNumberAsync(OrderNumber number, CancellationToken ct);
    Task PlaceOrderAsync(Order order, CancellationToken ct);
    Task CancelOrderAsync(OrderId id, CancellationToken ct);
}

// Infrastructure/Persistence/OrderRepository.cs (implementation)
public sealed class OrderRepository : IOrderRepository
{
    private readonly OrderingDbContext _context;
    
    public async Task PlaceOrderAsync(Order order, CancellationToken ct)
    {
        _context.Orders.Add(order);
        await _context.SaveChangesAsync(ct);
    }
}
```

### Domain Events

```csharp
// SharedKernel/Events/DomainEvent.cs (if multi-context)
// OR Domain/Events/DomainEvent.cs (if single context)
public abstract class DomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime Timestamp { get; } = DateTime.UtcNow;
}

// Domain/Orders/Events/OrderPlacedEvent.cs
public sealed class OrderPlacedEvent : DomainEvent
{
    public OrderId OrderId { get; }
    public CustomerId CustomerId { get; }
    public decimal Total { get; }
    
    public OrderPlacedEvent(OrderId orderId, CustomerId customerId, decimal total)
    {
        OrderId = orderId;
        CustomerId = customerId;
        Total = total;
    }
}

// Domain/Orders/Events/OrderCancelledEvent.cs
public sealed class OrderCancelledEvent : DomainEvent
{
    public OrderId OrderId { get; }
    
    public OrderCancelledEvent(OrderId orderId)
    {
        OrderId = orderId;
    }
}
```

Events are collected by the aggregate and exposed via `DomainEvents`. The Application layer pulls these events after persistence to publish them to handlers.

## Project Structure

```
Domain/
├── Orders/
│   ├── Order.cs                 ← Aggregate root
│   ├── OrderLine.cs             ← Entity (owned)
│   ├── OrderId.cs               ← Strongly typed ID
│   ├── IOrderRepository.cs      ← Domain interface
│   └── Events/
│       └── OrderPlacedEvent.cs
├── Shared/
│   ├── Money.cs                 ← Shared Value Object
│   └── Address.cs
└── DomainException.cs           ← Base exception

Application/
├── Features/
│   ├── PlaceOrder/
│   │   ├── PlaceOrderCommand.cs
│   │   └── PlaceOrderCommandHandler.cs
│   └── GetOrder/
│       └── GetOrderQueryHandler.cs
└── Shared/
    ├── ICommandHandler.cs        ← Uses SharedKernel if available
    └── IQueryHandler.cs
```

## Testing DDD

**NEVER test aggregates directly.** Always test through:
- **Application Services** (handlers) — typical entry point
- **Domain Services** — for complex business logic

```csharp
// Application.Tests/Features/PlaceOrder/PlaceOrderCommandHandlerTests.cs
public sealed class PlaceOrderCommandHandlerTests
{
    [Fact]
    public async Task Handle_PlaceOrder_ShouldPersistOrderAndRaiseEvent()
    {
        // Arrange
        var orderId = OrderId.New();
        var customerId = CustomerId.New();
        var cmd = new PlaceOrderCommand(orderId, customerId);
        
        var mockRepository = A.Fake<IOrderRepository>();
        var handler = new PlaceOrderCommandHandler(mockRepository);
        
        // Act
        var result = await handler.HandleAsync(cmd, CancellationToken.None);
        
        // Assert
        Assert.Equal(orderId, result);
        A.CallTo(() => mockRepository.AddAsync(A<Order>.That.Matches(
            o => o.Id == orderId && o.DomainEvents.Any(e => e is OrderPlacedEvent)
        ), A<CancellationToken>._)).MustHaveHappened();
    }
    
    [Fact]
    public async Task Handle_InvalidQuantity_ShouldThrow()
    {
        // Arrange
        var orderId = OrderId.New();
        var customerId = CustomerId.New();
        var cmd = new PlaceOrderCommandWithInvalidItem(orderId, customerId, quantity: -1);
        
        var handler = new PlaceOrderCommandHandler(A.Fake<IOrderRepository>());
        
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => 
            handler.HandleAsync(cmd, CancellationToken.None));
    }
}

// Domain.Tests/Orders/OrderByPolicyDomainServiceTests.cs
// (If logic is so complex it warrants a domain service)
public sealed class IsEligibleForUpgradeDomainServiceTests
{
    [Fact]
    public void IsEligible_WithHighValueOrder_ShouldReturnTrue()
    {
        // Arrange
        var order = Order.Create(OrderId.New(), CustomerId.New());
        var orderTotal = Money.Create(5000, "USD");
        var service = new IsEligibleForUpgradeDomainService();
        
        // Act
        var result = service.IsEligible(order, orderTotal);
        
        // Assert
        Assert.True(result);
    }
}
```

**Architecture rules** (compile-time via NetArchTest):

```csharp
[Fact]
public void DomainMethods_ShouldNotUseCrudVerbs()
{
    var methods = typeof(Order).GetMethods();
    var crudVerbs = new[] { "Create", "Update", "Delete", "Get", "Set" };
    
    var violations = methods
        .Where(m => crudVerbs.Any(v => m.Name.StartsWith(v)))
        .ToList();
    
    Assert.Empty(violations, 
        $"Domain uses business intent, found CRUD: {string.Join(", ", violations.Select(m => m.Name))}");
}
```

## Key Rules

| Rule | Why |
|------|-----|
| Factory methods only | Enforce invariants at creation |
| Private/protected constructors | Prevent object misuse |
| Business-intent methods | Reflect domain ubiquitous language |
| NO CRUD verbs (Create/Get/Set/Update/Delete) | Domain language ≠ technical language |
| Aggregates own entities, not other aggregates | Clear boundaries |
| Value objects immutable | Safe to share |
| Repositories use domain interface | Hide infrastructure |

## Integration with SharedKernel (Optional)

If using SharedKernel:

```csharp
// Domain uses SharedKernel base classes
using SharedKernel.Abstractions;

public sealed class Order : AggregateRoot  // Inherits from SharedKernel
{
    // See Aggregate Root Base Class section above
}

// Application handler implements SharedKernel interface
using SharedKernel.Abstractions;

public sealed class PlaceOrderCommandHandler 
    : ICommandHandler<PlaceOrderCommand, OrderId> { }
```

Without SharedKernel, define `AggregateRoot` in each domain project.
