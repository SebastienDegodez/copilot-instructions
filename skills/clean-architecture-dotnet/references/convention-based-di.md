# Convention-Based Dependency Injection

Guide for implementing convention-based handler discovery in Clean Architecture CQRS projects without MediatR.

## Why Convention-Based DI?

**Problem**: API layer cannot reference Application layer directly (Clean Architecture rule), yet endpoints need to invoke handlers.

**Solution**: Infrastructure layer discovers handlers by naming convention and registers them in DI container. API injects interfaces.

## Benefits

- **No MediatR dependency**: Simpler, fewer abstractions
- **Explicit interfaces**: `ICommandHandler<>` / `IQueryHandler<>` are clear contracts
- **Type-safe**: Compile-time verification of handler signatures
- **Testable**: Easy to mock handlers in tests
- **Maintainable**: Convention enforced by ArchUnit tests

## Implementation

### 1. Define Handler Interfaces (Application Layer)

```csharp
// Application/_Contracts/ICommandHandler.cs
namespace MyProject.Application._Contracts;

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

### 2. Implement Handlers (Application Layer)

**Naming Convention**: Handler class must end with `CommandHandler` or `QueryHandler` suffix.

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

### 3. Convention-Based Registration (Infrastructure Layer)

```csharp
// Infrastructure/DependencyInjection.cs
namespace MyProject.Infrastructure;

using MyProject.Application;
using Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationHandlers(
        this IServiceCollection services)
    {
        var applicationAssembly = typeof(IApplicationMarker).Assembly;
        
        // Register all *CommandHandler classes
        RegisterHandlersByConvention(
            services,
            applicationAssembly,
            "CommandHandler",
            new[] { typeof(ICommandHandler<>), typeof(ICommandHandler<,>) }
        );
        
        // Register all *QueryHandler classes
        RegisterHandlersByConvention(
            services,
            applicationAssembly,
            "QueryHandler",
            new[] { typeof(IQueryHandler<,>) }
        );
        
        return services;
    }
    
    private static void RegisterHandlersByConvention(
        IServiceCollection services,
        System.Reflection.Assembly assembly,
        string suffix,
        Type[] interfaceTypes)
    {
        var handlers = assembly.GetTypes()
            .Where(t => t.Name.EndsWith(suffix) && !t.IsInterface && !t.IsAbstract);
        
        foreach (var handler in handlers)
        {
            var interfaces = handler.GetInterfaces()
                .Where(i => i.IsGenericType && 
                       interfaceTypes.Any(it => i.GetGenericTypeDefinition() == it));
            
            foreach (var @interface in interfaces)
            {
                services.AddScoped(@interface, handler);
            }
        }
    }
}
```

### 4. Configure DI (Infrastructure Layer)

```csharp
// Program.cs (or Startup.cs)
using MyProject.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Register handlers via convention
builder.Services.AddApplicationHandlers();

var app = builder.Build();
```

### 5. Inject Handlers in API Endpoints (API Layer)

**Critical**: API injects `ICommandHandler<>` / `IQueryHandler<>` interfaces (NOT concrete classes).

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
        ICommandHandler<PlaceOrderCommand, OrderId> handler, // ← Injected by DI
        CancellationToken cancellationToken)
    {
        var orderId = await handler.HandleAsync(command, cancellationToken);
        return Results.Created($"/api/orders/{orderId.Value}", orderId);
    }
    
    private static async Task<IResult> GetOrder(
        Guid orderId,
        IQueryHandler<GetOrderQuery, OrderViewModel> handler, // ← Injected by DI
        CancellationToken cancellationToken)
    {
        var query = new GetOrderQuery(new OrderId(orderId));
        var result = await handler.HandleAsync(query, cancellationToken);
        return Results.Ok(result);
    }
}
```

## Convention Rules

### MUST Follow

1. **Command handlers**: Class name MUST end with `CommandHandler`
2. **Query handlers**: Class name MUST end with `QueryHandler`
3. **Implement interface**: Handler MUST implement `ICommandHandler<>` or `IQueryHandler<>`
4. **Public class**: Handler class MUST be public (DI registration requires public types)

### Enforced by ArchUnit

```csharp
[Fact]
public void CommandHandlers_ShouldEndWithCommandHandler()
{
    NamingConventionRules.CommandHandlersShouldEndWithCommandHandler();
}

[Fact]
public void CommandHandlers_ShouldImplementICommandHandler()
{
    ApplicationLayerRules.CommandHandlersShouldImplementICommandHandler();
}
```

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

## Comparison with MediatR

| Feature | Convention-Based DI | MediatR |
|---------|---------------------|---------|
| External dependency | None | `MediatR` NuGet package |
| Interfaces | Explicit `ICommandHandler<>` | `IRequest<>`, `IRequestHandler<>` |
| Registration | Convention-based scanning | `AddMediatR()` or manual |
| API injection | `ICommandHandler<PlaceOrderCommand>` | `IMediator.Send(command)` |
| Compile-time safety | ✅ Strong typing | ✅ Strong typing |
| Testability | ✅ Easy | ✅ Easy |
| Learning curve | Low (standard DI) | Medium (MediatR patterns) |
| Pipeline behaviors | Manual (middleware) | Built-in |
| Complexity | Simple | More abstractions |

## When to Use

✅ **Use convention-based DI when:**
- Building Clean Architecture projects
- Prefer explicit interfaces over service locator patterns
- Team familiar with standard .NET DI
- No need for complex pipeline behaviors

❌ **Consider MediatR when:**
- Need cross-cutting behaviors (logging, validation, transaction management)
- Large team already standardized on MediatR
- Legacy codebase using MediatR

## Performance

Convention-based DI has **similar performance** to MediatR:

- **Registration**: Assembly scanning happens once at startup
- **Resolution**: Standard DI container resolution (no overhead)
- **Invocation**: Direct method call (no reflection at runtime)

Both approaches are suitable for high-performance applications.

## Related

- **Clean Architecture**: [clean-architecture-dotnet skill](../SKILL.md)
- **Testing**: See the `application-layer-testing` skill for testing patterns
