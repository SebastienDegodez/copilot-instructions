---
name: clean-architecture-dotnet
description: Use when creating new .NET projects with Clean Architecture, implementing CQRS without MediatR, setting up layered architecture with DDD, or validating architecture rules with ArchUnit tests
---

# Clean Architecture CQRS

## Overview

Complete guide for implementing Clean Architecture with Domain-Driven Design and CQRS pattern in C# without external libraries like MediatR.

**Core principle:** Enforce layer independence through dependency inversion, validate architecture at compile-time with ArchUnit, and discover handlers by convention (no MediatR).

## When to Use

**Use when:**
- Starting new .NET project requiring separation of concerns and testability
- Team wants compile-time architecture validation (ArchUnit tests)
- Avoiding MediatR dependency for simpler handler registration
- Need CQRS pattern with explicit handler interfaces
- Setting up Clean Architecture layers (Domain, Application, Infrastructure, API)
- Domain model must have zero external dependencies (pure business logic)

**Don't use when:**
- Simple CRUD prototypes without complex business logic (overkill)
- Team unfamiliar with Clean Architecture/DDD patterns (training needed first)
- Project already using MediatR successfully (no need to change)
- Rapid prototyping where architecture validation slows iteration

## Core Principles

Based on:
- **Robert C. Martin** (Clean Architecture - dependency inversion, independent layers)
- **Eric Evans** (Domain-Driven Design - domain isolation, ubiquitous language)
- **Martin Fowler** (Patterns of Enterprise Application Architecture - layering, CQRS)
- **Vaughn Vernon** (Implementing DDD - aggregates, bounded contexts)

### The Four Layers

```
┌─────────────────────────────────────┐
│         API Layer                   │  ← Entry point, HTTP endpoints
│  (ASP.NET Core, Controllers)        │  ← Does NOT reference Application
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────────────────────┐
        │  Infrastructure Layer       │  ← Implements interfaces
        │  (Repositories, Services)   │  ← References Application + Domain
        │  ← Dependency Injection      │  ← Discovers handlers by convention
        └──────┬──────────────────────┘
               │
        ┌──────▼──────────────────────┐
        │   Application Layer         │  ← Use cases, orchestration
        │   (CQRS Handlers)            │  ← References Domain only
        └──────┬──────────────────────┘
               │
        ┌──────▼──────────────────────┐
        │    Domain Layer             │  ← Business logic, aggregates
        │    (Entities, Value Objects) │  ← No external dependencies
        └─────────────────────────────┘
```

### Dependency Rules

1. **Domain**: ZERO external dependencies (not even System.Data, EF Core)
2. **Application**: References Domain only
3. **Infrastructure**: References Application + Domain (implements interfaces)
4. **API**: References Infrastructure + Domain (NOT Application)

**Critical**: API discovers handlers through Infrastructure's DI container, not direct references.

---

## Quick Start: Initialize New Project

### Using the Initialization Script

Run the script to generate a complete Clean Architecture solution:

**PowerShell (Windows):**
```powershell
.\.github\skills\clean-architecture-dotnet\scripts\init-project.ps1 -ProjectName "Ordering"
```

**Bash (macOS/Linux):**
```bash
./.github/skills/clean-architecture-dotnet/scripts/init-project.sh "Ordering"
```

This creates:
```
src/
  Ordering.Domain/
    _Markers/
      IDomainMarker.cs
  Ordering.Application/
    _Markers/
      IApplicationMarker.cs
    _Contracts/
      ICommandHandler.cs
      IQueryHandler.cs
  Ordering.Infrastructure/
    DependencyInjection.cs
  Ordering.Api/
    
tests/
  Ordering.UnitTests/
    Application/
  Ordering.IntegrationTests/
    Api/
  Ordering.ArchitectureTests/
    ArchUnit/
      DomainLayerRules.cs
      ApplicationLayerRules.cs
      ApiLayerRules.cs
      InfrastructureLayerRules.cs
      NamingConventionRules.cs
    CleanArchitectureTests.cs
```

---

## CQRS Pattern (Without MediatR)

### Handler Interfaces

```csharp
// Application/_Contracts/ICommandHandler.cs

/// <summary>
/// Handler for commands that don't return a result (void operations).
/// </summary>
public interface ICommandHandler<in TCommand>
{
    Task HandleAsync(TCommand command, CancellationToken cancellationToken = default);
}

/// <summary>
/// Handler for commands that return a result.
/// </summary>
public interface ICommandHandler<in TCommand, TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken cancellationToken = default);
}

/// <summary>
/// Handler for queries (read operations).
/// </summary>
public interface IQueryHandler<in TQuery, TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken cancellationToken = default);
}
```

### Convention-Based Discovery

Infrastructure registers handlers automatically by naming convention:

```csharp
// Infrastructure/DependencyInjection.cs
public static class DependencyInjection
{
    public static IServiceCollection AddApplicationHandlers(
        this IServiceCollection services)
    {
        var applicationAssembly = typeof(IApplicationMarker).Assembly;
        
        // Discover all *CommandHandler classes
        var commandHandlers = applicationAssembly.GetTypes()
            .Where(t => t.Name.EndsWith("CommandHandler") && !t.IsInterface && !t.IsAbstract);
            
        foreach (var handler in commandHandlers)
        {
            var interfaces = handler.GetInterfaces()
                .Where(i => i.IsGenericType && 
                       (i.GetGenericTypeDefinition() == typeof(ICommandHandler<>) ||
                        i.GetGenericTypeDefinition() == typeof(ICommandHandler<,>)));
                        
            foreach (var @interface in interfaces)
                services.AddScoped(@interface, handler);
        }
        
        // Discover all *QueryHandler classes
        var queryHandlers = applicationAssembly.GetTypes()
            .Where(t => t.Name.EndsWith("QueryHandler") && !t.IsInterface && !t.IsAbstract);
            
        foreach (var handler in queryHandlers)
        {
            var interfaces = handler.GetInterfaces()
                .Where(i => i.IsGenericType && 
                       i.GetGenericTypeDefinition() == typeof(IQueryHandler<,>));
                        
            foreach (var @interface in interfaces)
                services.AddScoped(@interface, handler);
        }
        
        return services;
    }
}
```

### Naming Conventions

**MUST follow these conventions** for auto-discovery:

- **Commands**: `[Action]Command.cs` → Handler: `[Action]CommandHandler.cs`
- **Queries**: `[Action]Query.cs` → Handler: `[Action]QueryHandler.cs`
- **ViewModels**: `[Entity]ViewModel.cs` (for frontend DTOs)

Examples:
- `PlaceOrderCommand` → `PlaceOrderCommandHandler`
- `GetOrderQuery` → `GetOrderQueryHandler`
- `OrderViewModel` (NOT `OrderDto`)

---

## Implementation Patterns

### Command (Write Operation)

```csharp
// Application/Orders/Commands/PlaceOrder/PlaceOrderCommand.cs
public sealed record PlaceOrderCommand(
    OrderId OrderId,
    CustomerId CustomerId,
    List<OrderLineDto> OrderLines,
    Address ShippingAddress
);

public sealed record OrderLineDto(
    ProductId ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice
);

// Application/Orders/Commands/PlaceOrder/PlaceOrderCommandHandler.cs
public sealed class PlaceOrderCommandHandler : ICommandHandler<PlaceOrderCommand, OrderId>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IInventoryService _inventoryService;
    
    public PlaceOrderCommandHandler(
        IOrderRepository orderRepository,
        IInventoryService inventoryService)
    {
        _orderRepository = orderRepository;
        _inventoryService = inventoryService;
    }
    
    public async Task<OrderId> HandleAsync(
        PlaceOrderCommand command,
        CancellationToken cancellationToken = default)
    {
        // 1. Create Domain aggregate (business logic in Domain)
        var order = Order.Create(
            command.OrderId,
            command.CustomerId,
            command.ShippingAddress);
        
        // 2. Apply business operations through Domain methods
        foreach (var line in command.OrderLines)
        {
            order.RegisterOrderItem(
                line.ProductId,
                line.ProductName,
                line.Quantity,
                line.UnitPrice);
        }
        
        order.Confirm();
        
        // 3. Orchestrate Infrastructure calls
        await _inventoryService.ReserveItemsAsync(order.OrderLines, cancellationToken);
        await _orderRepository.AddAsync(order, cancellationToken);
        
        return order.Id;
    }
}
```

### Query (Read Operation)

```csharp
// Application/Orders/Queries/GetOrder/GetOrderQuery.cs
public sealed record GetOrderQuery(OrderId OrderId);

// Application/Orders/Queries/GetOrder/OrderViewModel.cs
public sealed record OrderViewModel(
    Guid OrderId,
    Guid CustomerId,
    string Status,
    List<OrderLineViewModel> OrderLines,
    AddressViewModel ShippingAddress,
    DateTime CreatedAt
);

public sealed record OrderLineViewModel(
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Total
);

public sealed record AddressViewModel(
    string Street,
    string City,
    string Country
);

// Application/Orders/Queries/GetOrder/GetOrderQueryHandler.cs
public sealed class GetOrderQueryHandler : IQueryHandler<GetOrderQuery, OrderViewModel>
{
    private readonly IOrderRepository _orderRepository;
    
    public GetOrderQueryHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }
    
    public async Task<OrderViewModel> HandleAsync(
        GetOrderQuery query,
        CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(query.OrderId, cancellationToken);
        
        if (order is null)
            throw new OrderNotFoundException(query.OrderId);
        
        // Map Domain to ViewModel
        return new OrderViewModel(
            order.Id.Value,
            order.CustomerId.Value,
            order.Status.ToString(),
            order.OrderLines.Select(ol => new OrderLineViewModel(
                ol.ProductName,
                ol.Quantity,
                ol.UnitPrice,
                ol.Total
            )).ToList(),
            new AddressViewModel(
                order.ShippingAddress.Street,
                order.ShippingAddress.City,
                order.ShippingAddress.Country
            ),
            order.CreatedAt
        );
    }
}
```

### API Endpoint (No Application Reference)

```csharp
// API/Orders/OrdersEndpoints.cs
public static class OrdersEndpoints
{
    public static void MapOrdersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");
        
        // Command endpoint
        group.MapPost("/", PlaceOrder)
            .WithName("PlaceOrder");
            
        // Query endpoint
        group.MapGet("/{orderId:guid}", GetOrder)
            .WithName("GetOrder");
    }
    
    private static async Task<IResult> PlaceOrder(
        PlaceOrderCommand command,
        ICommandHandler<PlaceOrderCommand, OrderId> handler,
        CancellationToken cancellationToken)
    {
        var orderId = await handler.HandleAsync(command, cancellationToken);
        return Results.Created($"/api/orders/{orderId.Value}", orderId);
    }
    
    private static async Task<IResult> GetOrder(
        Guid orderId,
        IQueryHandler<GetOrderQuery, OrderViewModel> handler,
        CancellationToken cancellationToken)
    {
        var query = new GetOrderQuery(new OrderId(orderId));
        var result = await handler.HandleAsync(query, cancellationToken);
        return Results.Ok(result);
    }
}
```

**Key**: API injects `ICommandHandler<>` and `IQueryHandler<>` directly. Infrastructure DI resolved them via convention.

---

## Marker Interfaces

Use marker interfaces to discover assemblies for DI and ArchUnit:

```csharp
// Domain/_Markers/IDomainMarker.cs
namespace Ordering.Domain;

/// <summary>
/// Marker interface to identify the Domain assembly.
/// Use: typeof(IDomainMarker).Assembly
/// </summary>
public interface IDomainMarker { }

// Application/_Markers/IApplicationMarker.cs
namespace Ordering.Application;

/// <summary>
/// Marker interface to identify the Application assembly.
/// Use: typeof(IApplicationMarker).Assembly
/// </summary>
public interface IApplicationMarker { }
```

Benefits:
- **Assembly discovery**: `typeof(IApplicationMarker).Assembly.GetTypes()`
- **ArchUnit tests**: Validate layer dependencies
- **DI registration**: Convention-based scanning

---

## Architecture Validation with ArchUnit

### Test Structure

```csharp
// ArchitectureTests/CleanArchitectureTests.cs
using ArchUnitNET.xUnit;

public sealed class CleanArchitectureTests
{
    [Fact]
    public void Domain_ShouldNotDependOnOtherLayers()
    {
        DomainLayerRules.ShouldNotDependOnOtherLayers();
    }
    
    [Fact]
    public void Application_ShouldOnlyDependOnDomain()
    {
        ApplicationLayerRules.ShouldOnlyDependOnDomain();
    }
    
    [Fact]
    public void Api_ShouldNotReferenceApplication()
    {
        ApiLayerRules.ShouldNotReferenceApplication();
    }
    
    [Fact]
    public void Infrastructure_CanReferenceDomainAndApplication()
    {
        InfrastructureLayerRules.CanReferenceDomainAndApplication();
    }
    
    [Fact]
    public void ViewModels_ShouldEndWithViewModel()
    {
        NamingConventionRules.ViewModelsShouldEndWithViewModel();
    }
    
    [Fact]
    public void CommandHandlers_ShouldEndWithCommandHandler()
    {
        NamingConventionRules.CommandHandlersShouldEndWithCommandHandler();
    }
    
    [Fact]
    public void QueryHandlers_ShouldEndWithQueryHandler()
    {
        NamingConventionRules.QueryHandlersShouldEndWithQueryHandler();
    }
}
```

### ArchUnit Rules Templates

See `templates/ArchUnit/` for complete rule implementations:

- **[DomainLayerRules.cs](templates/ArchUnit/DomainLayerRules.cs)**: Domain isolation validation
- **[ApplicationLayerRules.cs](templates/ArchUnit/ApplicationLayerRules.cs)**: Application dependencies validation
- **[ApiLayerRules.cs](templates/ArchUnit/ApiLayerRules.cs)**: API layer validation (no Application reference)
- **[InfrastructureLayerRules.cs](templates/ArchUnit/InfrastructureLayerRules.cs)**: Infrastructure dependencies validation
- **[NamingConventionRules.cs](templates/ArchUnit/NamingConventionRules.cs)**: Naming conventions validation

These rules are **reusable across projects**. Copy to your `ArchitectureTests` project.

---

## Project Structure Best Practices

### Domain Layer
```
Domain/
  _Markers/
    IDomainMarker.cs
  Orders/
    Order.cs                    ← Aggregate root
    OrderLine.cs                ← Entity (owned by Order)
    OrderStatus.cs              ← Enum/Value Object
    OrderId.cs                  ← Strongly typed ID
    IOrderRepository.cs         ← Repository interface (NO implementation)
  Shared/
    DomainException.cs
    ValueObject.cs
```

**Rules:**
- No EF Core, no System.Data, no HTTP
- Interfaces only (implementations in Infrastructure)
- Business logic lives here

### Application Layer
```
Application/
  _Markers/
    IApplicationMarker.cs
  _Contracts/
    ICommandHandler.cs
    IQueryHandler.cs
  Orders/
    Commands/
      PlaceOrder/
        PlaceOrderCommand.cs
        PlaceOrderCommandHandler.cs
    Queries/
      GetOrder/
        GetOrderQuery.cs
        GetOrderQueryHandler.cs
        OrderViewModel.cs
```

**Rules:**
- References Domain only
- No Infrastructure implementations
- Orchestrates use cases

### Infrastructure Layer
```
Infrastructure/
  Persistence/
    OrderingDbContext.cs
    Repositories/
      OrderRepository.cs        ← Implements IOrderRepository
  Services/
    InventoryService.cs         ← Implements IInventoryService
  DependencyInjection.cs        ← Convention-based DI registration
```

**Rules:**
- Implements interfaces from Domain/Application
- References EF Core, HTTP clients, etc.
- Registers handlers via convention

### API Layer
```
Api/
  Orders/
    OrdersEndpoints.cs          ← Minimal API endpoints
  Program.cs
```

**Rules:**
- Does NOT reference Application assembly
- Injects `ICommandHandler<>` / `IQueryHandler<>`
- Infrastructure resolves handlers

---

## Testing Strategy

### UnitTests (Application Layer)

Test handlers with real Domain objects, mock only Infrastructure:

```csharp
// UnitTests/Application/Orders/Commands/PlaceOrderCommandHandlerTests.cs
[Fact]
public async Task WhenPlacingValidOrder_ShouldCreateConfirmedOrder()
{
    // Arrange - Mock only Infrastructure
    var orderRepository = A.Fake<IOrderRepository>();
    var inventoryService = A.Fake<IInventoryService>();
    var handler = new PlaceOrderCommandHandler(orderRepository, inventoryService);

    var command = new PlaceOrderCommand(/*...*/);

    // Act - Handler uses REAL Domain objects
    var orderId = await handler.HandleAsync(command);

    // Assert - Verify Infrastructure calls AND Domain state
    A.CallTo(() => orderRepository.AddAsync(
        A<Order>.That.Matches(o => o.Status == OrderStatus.Confirmed),
        A<CancellationToken>._
    )).MustHaveHappenedOnceExactly();
}
```

See **[application-layer-testing](../application-layer-testing/SKILL.md)** skill for complete testing guide.

### ArchitectureTests

Run architecture validation tests to enforce layer dependencies:

```bash
dotnet test --filter "FullyQualifiedName~ArchitectureTests"
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| **API references Application assembly** | API should only reference Infrastructure + Domain. Handler interfaces injected via DI, not direct assembly reference. |
| **Domain references EF Core/System.Data** | Domain must have ZERO external deps. Use repository interfaces only. |
| **ViewModels named `*Dto`** | Must end with `ViewModel` for convention-based discovery: `OrderViewModel` not `OrderDto`. |
| **Handlers missing suffix** | Auto-discovery requires exact naming: `PlaceOrderCommandHandler`, `GetOrderQueryHandler`. |
| **Handler not registered in DI** | Verify naming convention matches discovery logic in `DependencyInjection.cs`. |
| **Application references Infrastructure** | Application should only know Domain. Infrastructure implements interfaces. |
| **Multiple aggregates in one repository** | One repository per aggregate root only. No generic `Repository<T>`. |
| **Business logic in handlers** | Handlers orchestrate. Business rules belong in Domain aggregates. |

### IntegrationTests (API Layer)

Test endpoints with WebApplicationFactory:

```csharp
// IntegrationTests/Api/Orders/PlaceOrderEndpointTests.cs
[Fact]
public async Task PlaceOrder_ShouldReturn201Created()
{
    // Arrange
    var client = _factory.CreateClient();
    var command = new PlaceOrderCommand(/*...*/);

    // Act
    var response = await client.PostAsJsonAsync("/api/orders", command);

    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.Created);
}
```

### ArchitectureTests

Run on every build to catch violations:

```bash
dotnet test --filter "FullyQualifiedName~ArchitectureTests"
```

---

## References

- **[layer-responsibilities.md](references/layer-responsibilities.md)**: Detailed responsibilities for each layer
- **[cqrs-without-mediatr.md](references/cqrs-without-mediatr.md)**: Why avoid MediatR, alternatives, benefits
- **[convention-based-di.md](references/convention-based-di.md)**: Assembly scanning strategies
- **[archunit-best-practices.md](references/archunit-best-practices.md)**: Writing maintainable architecture tests

---

## Quick Reference

### When to Use This Skill

✅ **Use when:**
- Starting a new .NET project with Clean Architecture
- Implementing CQRS without MediatR
- Setting up architecture validation tests
- Enforcing layer dependencies
- Creating testable, maintainable code

❌ **Don't use when:**
- Building simple CRUD apps (overkill)
- Prototyping (too much structure)
- Team unfamiliar with DDD/Clean Arch (training needed first)

### Key Commands

```bash
# Initialize project
./scripts/init-project.sh "MyProject"

# Run architecture tests
dotnet test --filter "FullyQualifiedName~ArchitectureTests"

# Watch mode during development
dotnet watch test
```

---

## Related Skills

- **[application-layer-testing](../application-layer-testing/SKILL.md)**: How to test Application handlers with sociable testing
- **[skill-creator](../skill-creator/SKILL.md)**: Creating new skills for your workflow

## Related Instructions

- **[archunit-rules.md](references/archunit-rules.md)**: ArchUnit validation templates and best practices
- **[domain-driven-design.instructions.md](../../instructions/domain-driven-design.instructions.md)**: DDD patterns and practices
