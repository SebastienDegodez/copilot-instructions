---
applyTo: '**/*.{Domain,Application,Infrastructure}/**/*.cs'
description: Implementation guide for Domain Events using the Accumulation pattern in C# DDD applications, where events are collected in aggregates and published by infrastructure components.
---

# Domain Events - Accumulation Pattern (C#)

## Purpose
Enable clean domain models by accumulating events within aggregates and delegating publishing to infrastructure components.

## Rules and Guidelines
- ✅ **DO**: Collect events in aggregates, publish via infrastructure after persistence
- ✅ **DO**: Ensure transactional consistency between state changes and events
- ✅ **DO**: Clear events after successful publishing
- ❌ **DON'T**: Publish events before persistence
- ❌ **DON'T**: Let domain models depend on infrastructure

## SharedKernel Components
Place these interfaces and base types in SharedKernel:

```csharp
// SharedKernel.Domain/IDomainEvent.cs
public interface IDomainEvent
{
    Guid Id { get; }
    DateTime OccurredOn { get; }
}

// SharedKernel.Domain/IEventSourcedAggregate.cs
public interface IEventSourcedAggregate
{
    IReadOnlyCollection<IDomainEvent> GetDomainEvents();
    void ClearDomainEvents();
}

// SharedKernel.Application/IDomainEventPublisher.cs
public interface IDomainEventPublisher
{
    Task PublishAsync<T>(T domainEvent) where T : IDomainEvent;
}

// SharedKernel.Application/IDomainEventHandler.cs
public interface IDomainEventHandler<in T> where T : IDomainEvent
{
    Task Handle(T domainEvent, CancellationToken cancellationToken = default);
}

// For inter-module communication:
// SharedKernel.Application/IIntegrationEvent.cs
public interface IIntegrationEvent
{
    Guid Id { get; }
    DateTime OccurredOn { get; }
    string EventType { get; }
}

// SharedKernel.Application/IIntegrationEventHandler.cs
public interface IIntegrationEventHandler<in T> where T : IIntegrationEvent
{
    Task Handle(T integrationEvent, CancellationToken cancellationToken = default);
}

// SharedKernel.Application/IMessageBus.cs
public interface IMessageBus
{
    Task PublishAsync<T>(T integrationEvent, CancellationToken cancellationToken = default) 
        where T : IIntegrationEvent;
}
```

## Core Implementation

### Module-Specific Events and Aggregates
```csharp
// [Solution].Ordering.Domain/Orders/OrderPlacedEvent.cs
public sealed record OrderPlacedEvent(
    OrderId OrderId,
    CustomerId CustomerId,
    decimal TotalAmount) : IDomainEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}

// [Solution].Ordering.Domain/Orders/Order.cs
public sealed class Order : IEventSourcedAggregate
{
    private readonly List<IDomainEvent> _domainEvents = new();
    
    public static Order Create(OrderId id, CustomerId customerId)
    {
        var order = new Order(id, customerId);
        order._domainEvents.Add(new OrderCreatedEvent(id, customerId));
        return order;
    }
    
    public void PlaceOrder()
    {
        Status = OrderStatus.Placed;
        _domainEvents.Add(new OrderPlacedEvent(Id, CustomerId, TotalAmount));
    }
    
    public IReadOnlyCollection<IDomainEvent> GetDomainEvents() => _domainEvents;
    public void ClearDomainEvents() => _domainEvents.Clear();
}
```

### Repository with Event Publishing
```csharp
// [Solution].Ordering.Infrastructure/Repositories/OrderRepository.cs
public sealed class OrderRepository : IOrderRepository
{
    private readonly DbContext _context;
    private readonly IDomainEventPublisher _eventPublisher;
    
    public async Task SaveAsync(Order order)
    {
        _context.Orders.Update(order);
        await _context.SaveChangesAsync();
        
        // Publish events after successful persistence
        var events = order.GetDomainEvents();
        foreach (var domainEvent in events)
            await _eventPublisher.PublishAsync(domainEvent);
            
        order.ClearDomainEvents();
    }
}
```

### Event Publisher Implementation
```csharp
// SharedKernel.Infrastructure/DomainEventPublisher.cs
public sealed class DomainEventPublisher : IDomainEventPublisher
{
    private readonly IServiceProvider _serviceProvider;
    
    public async Task PublishAsync<T>(T domainEvent) where T : IDomainEvent
    {
        var handlers = _serviceProvider.GetServices<IDomainEventHandler<T>>();
        await Task.WhenAll(handlers.Select(h => h.Handle(domainEvent)));
    }
}
```

## Best Practices
- Use one pattern per bounded context consistently
- Keep events immutable and business-focused
- Test event publishing in integration tests
- Handle event publishing failures gracefully
- Consider using outbox pattern for reliability

## References
- Vernon, Vaughn. "Implementing Domain-Driven Design"
- Evans, Eric. "Domain-Driven Design"
- Fowler, Martin. "Domain Event" - https://martinfowler.com/eaaDev/DomainEvent.html
