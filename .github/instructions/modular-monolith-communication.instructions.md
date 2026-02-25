---
applyTo: '**/*.{Application,Infrastructure}/**/*.cs'
description: Guidelines for implementing communication patterns between modules in a modular monolith architecture, including domain events, integration events, and message bus patterns.
---

# Modular Monolith Communication Patterns

## Purpose
Establish clear communication patterns that allow modules to interact without creating direct dependencies, ensuring loose coupling and maintaining the benefits of modular architecture.

## Rules and Guidelines
- ❌ **NO Direct Dependencies**: Modules MUST NOT have direct project references to each other
- ✅ **Async by Default**: Prefer asynchronous communication over synchronous calls
- ✅ **Event-Driven**: Use domain and integration events as the primary communication mechanism
- ✅ **Eventual Consistency**: Accept eventual consistency between modules for better scalability
- ✅ **Clear Contracts**: Define explicit interfaces for all inter-module communication

## Communication Types

### 1. Intra-Module Communication (Domain Events)
Use domain events within a single module boundary.
**→ See `domain-driven-design-event-csharp.instructions.md` for complete implementation.**

### 2. Inter-Module Communication (Integration Events)
Use integration events for communication between different modules.

## Integration Events Implementation

**→ See `domain-driven-design-event-csharp.instructions.md` for all SharedKernel interfaces.**

### Integration Event Example
```csharp
// SharedKernel.IntegrationEvents/OrderCompletedIntegrationEvent.cs
public sealed record OrderCompletedIntegrationEvent(
    Guid OrderId,
    Guid CustomerId,
    decimal TotalAmount) : IIntegrationEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
    public string EventType => nameof(OrderCompletedIntegrationEvent);
}
```

### Domain Event to Integration Event Bridge
```csharp
// [Solution].Ordering.Application/EventHandlers/OrderPlacedEventHandler.cs
public sealed class OrderPlacedEventHandler : IDomainEventHandler<OrderPlacedEvent>
{
    private readonly IMessageBus _messageBus;
    
    public async Task Handle(OrderPlacedEvent domainEvent, CancellationToken cancellationToken)
    {
        var integrationEvent = new OrderCompletedIntegrationEvent(
            domainEvent.OrderId.Value,
            domainEvent.CustomerId.Value,
            domainEvent.TotalAmount);
            
        await _messageBus.PublishAsync(integrationEvent, cancellationToken);
    }
}
```

### Integration Event Handler (Consuming Module)
```csharp
// [Solution].Customer.Application/EventHandlers/OrderCompletedIntegrationEventHandler.cs
public sealed class OrderCompletedIntegrationEventHandler : IIntegrationEventHandler<OrderCompletedIntegrationEvent>
{
    private readonly ICustomerRepository _customerRepository;
    
    public async Task Handle(OrderCompletedIntegrationEvent integrationEvent, CancellationToken cancellationToken)
    {
        var customer = await _customerRepository.FindByIdAsync(
            CustomerId.From(integrationEvent.CustomerId), cancellationToken);
            
        customer?.RecordOrderCompletion(integrationEvent.TotalAmount);
        await _customerRepository.SaveAsync(customer, cancellationToken);
    }
}
```

## Message Bus Implementation

### In-Process Message Bus
```csharp
// SharedKernel.Infrastructure/InProcessMessageBus.cs
public sealed class InProcessMessageBus : IMessageBus
{
    private readonly IServiceProvider _serviceProvider;
    
    public async Task PublishAsync<T>(T integrationEvent, CancellationToken cancellationToken = default) 
        where T : IIntegrationEvent
    {
        var handlers = _serviceProvider.GetServices<IIntegrationEventHandler<T>>();
        await Task.WhenAll(handlers.Select(h => h.Handle(integrationEvent, cancellationToken)));
    }
}
```

## Synchronous Communication (When Necessary)

### Query Services for Immediate Consistency
```csharp
// SharedKernel.Application/ICatalogQueryService.cs
public interface ICatalogQueryService
{
    Task<ProductInfo?> GetProductInfoAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<bool> IsProductAvailableAsync(Guid productId, int quantity, CancellationToken cancellationToken = default);
}

// Usage in another module
public sealed class CreateOrderCommandHandler : ICommandHandler<CreateOrderCommand>
{
    private readonly ICatalogQueryService _catalogService;
    
    public async Task Handle(CreateOrderCommand command, CancellationToken cancellationToken)
    {
        var isAvailable = await _catalogService.IsProductAvailableAsync(
            command.ProductId, command.Quantity, cancellationToken);
            
        if (!isAvailable)
            throw new ProductNotAvailableException(command.ProductId);
    }
}
```

## Best Practices
- Use integration events for cross-module business notifications
- Use query services only when immediate consistency is required
- Keep integration events immutable and focused on cross-module concerns
- Design events for forward compatibility
- Monitor and observe inter-module communications
- Handle failures gracefully with proper logging and retry mechanisms

## References
- `domain-driven-design-event-csharp.instructions.md` - For domain event implementation
- `modular-monolith-architecture.instructions.md` - For overall architecture guidelines
- Vernon, Vaughn. "Reactive Messaging Patterns with the Actor Model"
- [Microsoft - Integration Events](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/multi-container-microservice-net-applications/integration-event-based-microservice-communications)
