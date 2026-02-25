# CQRS Without MediatR

Why and how to implement CQRS pattern without MediatR library in Clean Architecture projects.

## The MediatR Pattern

MediatR is a popular .NET library implementing the Mediator pattern for CQRS:

```csharp
// With MediatR
public class PlaceOrderCommand : IRequest<OrderId> { }

public class PlaceOrderCommandHandler : IRequestHandler<PlaceOrderCommand, OrderId>
{
    public async Task<OrderId> Handle(PlaceOrderCommand request, CancellationToken ct)
    {
        // Implementation
    }
}

// API usage
app.MapPost("/orders", async (PlaceOrderCommand cmd, IMediator mediator) =>
{
    var orderId = await mediator.Send(cmd);
    return Results.Created($"/orders/{orderId}", orderId);
});
```

## Why Avoid MediatR?

### 1. Additional Dependency

**MediatR adds external dependency** for functionality achievable with built-in .NET DI.

- Extra NuGet package to manage
- Package updates and compatibility issues
- Additional abstraction to learn

**Alternative**: Use standard .NET dependency injection with convention-based discovery.

### 2. Service Locator Anti-Pattern

`IMediator.Send(command)` is a **service locator** pattern:

```csharp
// Service locator (anti-pattern)
var result = await _mediator.Send(command);
```

**Problems**:
- Hides dependencies (violates Dependency Inversion Principle)
- Runtime errors instead of compile-time (wrong handler type)
- Harder to test (need to mock IMediator)
- Unclear what handler will execute (implicit coupling)

**Better approach**: Explicit dependency injection

```csharp
// Explicit DI (recommended)
public OrdersController(ICommandHandler<PlaceOrderCommand, OrderId> handler)
{
    _handler = handler;
}
```

### 3. Unnecessary Complexity

MediatR adds layers of abstraction:

- `IRequest<>` interface
- `IRequestHandler<,>` interface  
- `IMediator` service
- Pipeline behaviors
- Request/notification dispatching

**For most CQRS scenarios, this is overkill.**

Simple alternative:
- `ICommandHandler<>` or `IQueryHandler<>`
- Direct DI registration
- Standard middleware for cross-cutting concerns

### 4. Over-Engineering for Simple Use Cases

**MediatR is designed for complex enterprise scenarios:**
- Pipeline behaviors (logging, validation, transactions)
- Pub/sub notification patterns
- Complex request routing

**Most applications don't need this complexity.**

For CRUD operations and simple CQRS:
- Direct handler injection is sufficient
- ASP.NET Core middleware handles cross-cutting concerns
- Event-driven patterns can use domain events

## Alternative: Convention-Based Handler Interfaces

### Explicit Interfaces

```csharp
public interface ICommandHandler<in TCommand>
{
    Task HandleAsync(TCommand command, CancellationToken ct = default);
}

public interface ICommandHandler<in TCommand, TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken ct = default);
}

public interface IQueryHandler<in TQuery, TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken ct = default);
}
```

**Benefits**:
- **Explicit**: Clear separation between commands and queries
- **Type-safe**: Compile-time verification
- **Testable**: Easy to mock specific handlers
- **No magic**: No hidden service locator

### Convention-Based Registration

```csharp
public static IServiceCollection AddApplicationHandlers(this IServiceCollection services)
{
    var assembly = typeof(IApplicationMarker).Assembly;
    
    var handlers = assembly.GetTypes()
        .Where(t => t.Name.EndsWith("Handler") && !t.IsAbstract);
    
    foreach (var handler in handlers)
    {
        var interfaces = handler.GetInterfaces()
            .Where(i => i.IsGenericType);
        
        foreach (var @interface in interfaces)
            services.AddScoped(@interface, handler);
    }
    
    return services;
}
```

### API Usage

```csharp
app.MapPost("/orders", async (
    PlaceOrderCommand command,
    ICommandHandler<PlaceOrderCommand, OrderId> handler, // Explicit dependency
    CancellationToken ct) =>
{
    var orderId = await handler.HandleAsync(command, ct);
    return Results.Created($"/orders/{orderId}", orderId);
});
```

**Advantages**:
- Dependencies are explicit and visible
- Compile-time safety (wrong handler type = compile error)
- Easy to test (mock specific handler interface)
- No external library needed

## When MediatR Makes Sense

MediatR is justified when you need:

### 1. Complex Pipeline Behaviors

Cross-cutting concerns applied to all requests:

```csharp
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
{
    public async Task<TResponse> Handle(TRequest request, CancellationToken ct, RequestHandlerDelegate<TResponse> next)
    {
        _logger.LogInformation("Handling {Request}", typeof(TRequest).Name);
        var response = await next();
        _logger.LogInformation("Handled {Request}", typeof(TRequest).Name);
        return response;
    }
}
```

**Alternative without MediatR**: ASP.NET Core middleware or decorators

```csharp
public class LoggingCommandHandlerDecorator<TCommand, TResult> : ICommandHandler<TCommand, TResult>
{
    private readonly ICommandHandler<TCommand, TResult> _inner;
    private readonly ILogger _logger;
    
    public async Task<TResult> HandleAsync(TCommand command, CancellationToken ct)
    {
        _logger.LogInformation("Executing {Command}", typeof(TCommand).Name);
        var result = await _inner.HandleAsync(command, ct);
        _logger.LogInformation("Executed {Command}", typeof(TCommand).Name);
        return result;
    }
}
```

### 2. Notification/Event Broadcasting

Domain events dispatched to multiple handlers:

```csharp
public class OrderPlacedEvent : INotification { }

public class SendEmailHandler : INotificationHandler<OrderPlacedEvent> { }
public class UpdateInventoryHandler : INotificationHandler<OrderPlacedEvent> { }

// Dispatch
await _mediator.Publish(new OrderPlacedEvent());
```

**Alternative without MediatR**: Domain events pattern

```csharp
// Domain entity
public class Order
{
    private readonly List<IDomainEvent> _domainEvents = new();
    
    public void PlaceOrder()
    {
        // Business logic
        _domainEvents.Add(new OrderPlacedEvent(Id));
    }
    
    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents;
}

// Dispatch in repository SaveChanges
foreach (var @event in order.DomainEvents)
{
    await _eventDispatcher.DispatchAsync(@event);
}
```

### 3. Large Teams with Established MediatR Patterns

If your organization has:
- Standardized on MediatR across projects
- Extensive MediatR pipeline behaviors library
- Team trained on MediatR patterns

**Then continuing with MediatR is pragmatic** (avoid context switching).

## Recommendations

### For New Projects

✅ **Start without MediatR**:
- Use explicit `ICommandHandler<>` / `IQueryHandler<>` interfaces
- Convention-based DI registration
- Standard ASP.NET Core middleware for cross-cutting concerns

**Add MediatR later only if needed** (pipeline behaviors, complex event dispatching).

### For Existing MediatR Projects

❌ **Don't refactor away from MediatR** unless:
- Significant maintenance burden
- Team wants to reduce dependencies
- No pipeline behaviors in use

**MediatR is not inherently bad** - just often unnecessary complexity.

## Comparison Table

| Feature | Convention-Based DI | MediatR |
|---------|---------------------|---------|
| **External dependency** | None | `MediatR` NuGet |
| **Interfaces** | Explicit `ICommandHandler<>` | `IRequest<>`, `IRequestHandler<>` |
| **API dependency injection** | `ICommandHandler<PlaceOrderCommand>` | `IMediator` (service locator) |
| **Compile-time safety** | ✅ Strong | ✅ Strong |
| **Testability** | ✅ Easy (mock handler) | ⚠️ Medium (mock IMediator) |
| **Learning curve** | Low (standard DI) | Medium (MediatR patterns) |
| **Pipeline behaviors** | Manual (decorators/middleware) | ✅ Built-in |
| **Event broadcasting** | Manual (domain events) | ✅ Built-in (INotification) |
| **Complexity** | Simple | More abstractions |
| **Performance** | Same | Same |

## Authority Quotes

### Martin Fowler on Service Locator

> "The key difference is that with a Service Locator every user of a service has a dependency to the locator. [...] With dependency injection there are no explicit dependencies, which is much better for testing."
>
> — Martin Fowler, *Inversion of Control Containers and the Dependency Injection pattern* (2004)

### Robert C. Martin on Explicit Dependencies

> "Dependencies should be explicit and visible at the point of use."
>
> — Robert C. Martin, *Clean Architecture* (2017)

## Conclusion

**For most Clean Architecture CQRS projects**:
- Use explicit handler interfaces (`ICommandHandler<>`, `IQueryHandler<>`)
- Convention-based DI registration
- Avoid MediatR unless you need pipeline behaviors or event broadcasting

**Simplicity wins** over abstraction for abstraction's sake.

## References

- Fowler, Martin. "Inversion of Control Containers and the Dependency Injection pattern" (2004). https://martinfowler.com/articles/injection.html
- Martin, Robert C. *Clean Architecture* (2017)
- Vernon, Vaughn. *Implementing Domain-Driven Design* (2013)

## Related

- [Convention-Based DI](./convention-based-di.md): Implementation guide
- [Clean Architecture CQRS Skill](../SKILL.md): Complete project setup
