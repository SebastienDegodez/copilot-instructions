# Interface-Based Handler Registration

Guide for implementing interface-based handler discovery in Clean Architecture CQRS projects.

## Why Interface-Based Registration?

**Problem**: API layer cannot reference Application layer directly (Clean Architecture rule), yet endpoints need to invoke handlers.

**Solution**: Infrastructure layer discovers handlers by implementing `ICommandHandler<>` / `IQueryHandler<>` and registers them in the DI container. Handlers are found by interface, not by name.

## Benefits

- **Explicit interfaces**: `ICommandHandler<>` / `IQueryHandler<>` are clear contracts
- **Type-safe**: Compile-time verification of handler signatures
- **Testable**: Easy to mock handlers in tests
- **Maintainable**: Convention enforced by NetArchTest tests

## Implementation

### 1. Define Handler Interfaces (Application Layer)

```csharp
// Application/Shared/ICommandHandler.cs
namespace MyProject.Application.Shared;

public interface ICommandHandler<in TCommand>
{
    Task HandleAsync(TCommand command, CancellationToken cancellationToken = default);
}

public interface ICommandHandler<in TCommand, TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken cancellationToken = default);
}

public interface IQueryHandler<in TQuery, TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken cancellationToken = default);
}
```

### 2. Define Bus Interfaces (Application Layer)

Sender interfaces abstract handler dispatch. API endpoints inject senders instead of individual handlers.

```csharp
// Application/Shared/ICommandBus.cs
namespace MyProject.Application.Shared;

public interface ICommandBus
{
    Task PublishAsync<TCommand>(TCommand command, CancellationToken cancellationToken = default);
    Task<TResult> PublishAsync<TCommand, TResult>(TCommand command, CancellationToken cancellationToken = default);
}

// Application/Shared/IQueryBus.cs
namespace MyProject.Application.Shared;

public interface IQueryBus
{
    Task<TResult> SendAsync<TQuery, TResult>(TQuery query, CancellationToken cancellationToken = default);
}
```

### 3. Implement Handlers (Application Layer)

Handlers are discovered by their **interface implementation**, not by name. Any class implementing `ICommandHandler<>` or `IQueryHandler<>` is registered automatically by `AddApplicationHandlers()`.

```csharp
// Application/Orders/Commands/PlaceOrder/PlaceOrderCommandHandler.cs
namespace MyProject.Application.Orders.Commands.PlaceOrder;

public sealed class PlaceOrderCommandHandler : ICommandHandler<PlaceOrderCommand, OrderId>
{
    private readonly IOrderRepository _orderRepository;
    
    public PlaceOrderCommandHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }
    
    public async Task<OrderId> HandleAsync(
        PlaceOrderCommand command,
        CancellationToken cancellationToken = default)
    {
        var order = Order.Create(command.OrderId, command.CustomerId);
        // ... business logic
        await _orderRepository.AddAsync(order, cancellationToken);
        return order.Id;
    }
}
```

### 4. Convention-Based Registration (Infrastructure Layer)

```csharp
// Infrastructure/DependencyInjection.cs
namespace MyProject.Infrastructure;

using System.Diagnostics.CodeAnalysis;
using MyProject.Application.Shared;
using MyProject.Infrastructure.CQRS;
using Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    /// <summary>
    /// Registers a single handler by its implemented ICommandHandler&lt;&gt; / IQueryHandler&lt;&gt; interfaces.
    /// AOT-safe: THandler is statically known at call site; [DynamicallyAccessedMembers] tells the
    /// trimmer to preserve interface metadata for this specific type.
    /// </summary>
    public static IServiceCollection AddHandler<
        [DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.Interfaces)] THandler>(
        this IServiceCollection services)
        where THandler : class
    {
        var handlerType = typeof(THandler);
        var handlerInterfaces = handlerType.GetInterfaces()
            .Where(i => i.IsGenericType &&
                   (i.GetGenericTypeDefinition() == typeof(ICommandHandler<>) ||
                    i.GetGenericTypeDefinition() == typeof(ICommandHandler<,>) ||
                    i.GetGenericTypeDefinition() == typeof(IQueryHandler<,>)));

        foreach (var @interface in handlerInterfaces)
            services.AddScoped(@interface, handlerType);

        return services;
    }

    /// <summary>
    /// Registers all application handlers and CQRS buses.
    /// Infrastructure knows all handler types (it references Application) — list them explicitly here.
    /// This is the ONLY registration method. There is no reflection-based scan.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // CQRS buses
        services.AddScoped<ICommandBus, CommandBus>();
        services.AddScoped<IQueryBus, QueryBus>();

        // Handlers — add each explicitly (AOT-safe, compile-time verified)
        services.AddHandler<PlaceOrderCommandHandler>();
        services.AddHandler<GetOrderQueryHandler>();
        // ... add more handlers here as the application grows

        return services;
    }
}
```

### 5. Sender Implementations (Infrastructure Layer)

Senders resolve handlers from DI and dispatch to them:

```csharp
// Infrastructure/CQRS/CommandBus.cs
namespace MyProject.Infrastructure.CQRS;

public sealed class CommandBus : ICommandBus
{
    private readonly IServiceProvider _serviceProvider;

    public CommandBus(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task PublishAsync<TCommand>(TCommand command, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);
        var handler = _serviceProvider.GetRequiredService<ICommandHandler<TCommand>>();
        await handler.HandleAsync(command, cancellationToken);
    }

    public async Task<TResult> PublishAsync<TCommand, TResult>(TCommand command, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);
        var handler = _serviceProvider.GetRequiredService<ICommandHandler<TCommand, TResult>>();
        return await handler.HandleAsync(command, cancellationToken);
    }
}

// Infrastructure/CQRS/QueryBus.cs
namespace MyProject.Infrastructure.CQRS;

public sealed class QueryBus : IQueryBus
{
    private readonly IServiceProvider _serviceProvider;

    public QueryBus(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<TResult> SendAsync<TQuery, TResult>(TQuery query, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);
        var handler = _serviceProvider.GetRequiredService<IQueryHandler<TQuery, TResult>>();
        return await handler.HandleAsync(query, cancellationToken);
    }
}
```

### 6. Configure DI (Program.cs)

```csharp
using MyProject.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Single call — registers buses + all handlers explicitly
builder.Services.AddInfrastructure();

var app = builder.Build();
```

### 7. Inject Buses in API Endpoints (API Layer)

**Critical**: API injects `ICommandBus` / `IQueryBus` — never `ICommandHandler<,>` or `IQueryHandler<,>` directly.

```csharp
// API/Orders/OrdersEndpoints.cs
namespace MyProject.Api.Orders;

public static class OrdersEndpoints
{
    public static void MapOrdersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");
        
        group.MapPost("/", PlaceOrder);
        group.MapGet("/{orderId:guid}", GetOrder);
    }
    
    private static async Task<IResult> PlaceOrder(
        PlaceOrderCommand command,
        ICommandBus bus,
        CancellationToken cancellationToken)
    {
        var orderId = await bus.PublishAsync<PlaceOrderCommand, OrderId>(command, cancellationToken);
        return Results.Created($"/api/orders/{orderId.Value}", orderId);
    }
    
    private static async Task<IResult> GetOrder(
        Guid orderId,
        IQueryBus bus,
        CancellationToken cancellationToken)
    {
        var query = new GetOrderQuery(new OrderId(orderId));
        var result = await bus.SendAsync<GetOrderQuery, OrderViewModel>(query, cancellationToken);
        return Results.Ok(result);
    }
}
```

## Registration Rules

### MUST Follow

1. **Implement interface**: Handler MUST implement `ICommandHandler<>` or `IQueryHandler<>`
2. **Public non-abstract class**: DI registration requires public, concrete types
3. **Scoped lifetime**: Handlers are registered as `Scoped` (one per request)
4. **Explicit registration**: Every handler is listed in `AddInfrastructure()`. No runtime scan.

### AOT / Trimming

`AddHandler<THandler>()` is AOT-safe:
- `THandler` is statically known at the call site
- `[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.Interfaces)]` tells the trimmer to preserve the interface metadata for that specific type
- No `Assembly.GetTypes()`, no runtime discovery

The only constraint: **a new handler must be added to `AddInfrastructure()`** at the same time it is created. This is enforced by convention, not automation.

## Testing

### Unit Tests (Mock Infrastructure)

```csharp
// UnitTests/Application/Orders/PlaceOrderCommandHandlerTests.cs
[Fact]
public async Task WhenPlacingOrder_ShouldCreateOrder()
{
    // Arrange - Mock Infrastructure
    var orderRepository = A.Fake<IOrderRepository>();
    var handler = new PlaceOrderCommandHandler(orderRepository);
    
    var command = new PlaceOrderCommand(/*...*/);
    
    // Act - Handler is REAL (not mocked)
    var orderId = await handler.HandleAsync(command);
    
    // Assert - Verify Infrastructure calls
    A.CallTo(() => orderRepository.AddAsync(
        A<Order>.That.Matches(o => o.Id == command.OrderId),
        A<CancellationToken>._
    )).MustHaveHappenedOnceExactly();
}
```

### Integration Tests (Test DI Resolution)

```csharp
// IntegrationTests/Api/Orders/PlaceOrderEndpointTests.cs
[Fact]
public async Task PlaceOrder_ShouldResolveHandlerFromDI()
{
    // Arrange
    var factory = new WebApplicationFactory<Program>();
    var client = factory.CreateClient();
    
    var command = new PlaceOrderCommand(/*...*/);
    
    // Act - DI resolves ICommandHandler<PlaceOrderCommand, OrderId>
    var response = await client.PostAsJsonAsync("/api/orders", command);
    
    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.Created);
}
```

## Related

- **Clean Architecture**: [clean-architecture-dotnet skill](../SKILL.md)
- **Testing**: See the `outside-in-tdd` skill for testing patterns
