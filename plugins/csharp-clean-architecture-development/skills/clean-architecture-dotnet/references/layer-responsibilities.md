# Layer Responsibilities in Clean Architecture

Detailed responsibilities and rules for each layer in Clean Architecture projects with DDD and CQRS.

## The Dependency Rule

> "Source code dependencies must point only inward, toward higher-level policies."  
> — Robert C. Martin, *Clean Architecture* (2017)

```
┌─────────────────────────────────────┐
│         API (Outer)                 │
│  ┌───────────────────────────────┐  │
│  │   Infrastructure (Outer)      │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  Application (Use Cases)│  │  │
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │  Domain (Core)    │  │  │  │
│  │  │  │                   │  │  │  │
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

Dependencies flow INWARD ONLY:
API → Infrastructure → Application → Domain
```

---

## Domain Layer (Core, Innermost)

### Purpose

Contains **enterprise business rules** and **ubiquitous language**:
- Aggregates, entities, value objects
- Domain services
- Specifications (business rules)
- Repository interfaces (contracts, NOT implementations)

### Responsibilities

✅ **MUST**:
- Encapsulate business invariants
- Define aggregate boundaries
- Enforce domain rules (e.g., Order.Confirm() validates state)
- Use strongly typed IDs (OrderId, CustomerId)
- Implement value objects (Money, Address)
- Define repository interfaces (IOrderRepository)
- Remain persistence-ignorant (no SQL, no EF Core)

❌ **MUST NOT**:
- Reference Application, Infrastructure, or API layers
- Reference Entity Framework, ADO.NET, System.Data
- Reference HTTP, ASP.NET Core, System.Net
- Contain use case orchestration (belongs in Application)
- Implement repository interfaces (belongs in Infrastructure)

### Dependencies

- **ZERO** external dependencies (except .NET BCL)
- No NuGet packages (except custom shared kernel if needed)

### Example Code

```csharp
// Domain/Orders/Order.cs
public sealed class Order
{
    private readonly List<OrderLine> _orderLines = new();
    
    public OrderId Id { get; }
    public OrderStatus Status { get; private set; }
    
    private Order(OrderId id)
    {
        Id = id;
        Status = OrderStatus.Draft;
    }
    
    // Factory method (no public constructor)
    public static Order Create(OrderId id) => new Order(id);
    
    // Business method (enforces invariants)
    public void Confirm()
    {
        if (!_orderLines.Any())
            throw new DomainException("Cannot confirm order without items");
        
        if (Status != OrderStatus.Draft)
            throw new DomainException("Only draft orders can be confirmed");
        
        Status = OrderStatus.Confirmed;
    }
}

// Domain/Orders/IOrderRepository.cs (interface ONLY)
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct = default);
    Task AddAsync(Order order, CancellationToken ct = default);
}
```

### Authority

> "The Domain Layer is the heart of business software. [...] It should be well isolated from other layers."  
> — Eric Evans, *Domain-Driven Design* (2003)

---

## Application Layer (Use Cases)

### Purpose

Contains **application business rules** and **use case orchestration**:
- Commands and Queries (CQRS)
- Command/Query handlers
- ViewModels (DTOs for frontend)
- Application services (orchestration)

### Responsibilities

✅ **MUST**:
- Orchestrate use cases (calls to Domain + Infrastructure)
- Implement ICommandHandler / IQueryHandler interfaces
- Map Domain entities to ViewModels
- Validate commands/queries (technical validation, NOT business rules)
- Call repository interfaces (defined in Domain)
- Return ViewModels (NOT Domain entities) from queries

❌ **MUST NOT**:
- Reference Infrastructure or API layers
- Implement repository interfaces (belongs in Infrastructure)
- Contain Domain business logic (belongs in Domain aggregates)
- Reference Entity Framework, ADO.NET, HTTP

### Dependencies

- **Domain layer ONLY**
- No Infrastructure or API references

### Example Code

```csharp
// Application/Orders/Commands/PlaceOrder/PlaceOrderCommand.cs
public sealed record PlaceOrderCommand(
    OrderId OrderId,
    CustomerId CustomerId,
    List<OrderLineDto> OrderLines
);

// Application/Orders/Commands/PlaceOrder/PlaceOrderCommandHandler.cs
public sealed class PlaceOrderCommandHandler : ICommandHandler<PlaceOrderCommand, OrderId>
{
    private readonly IOrderRepository _orderRepository; // Interface from Domain
    private readonly IInventoryService _inventoryService; // Interface from Domain or Application
    
    public PlaceOrderCommandHandler(
        IOrderRepository orderRepository,
        IInventoryService inventoryService)
    {
        _orderRepository = orderRepository;
        _inventoryService = inventoryService;
    }
    
    public async Task<OrderId> HandleAsync(
        PlaceOrderCommand command,
        CancellationToken ct = default)
    {
        // 1. Create Domain aggregate (business logic in Domain)
        var order = Order.Create(command.OrderId, command.CustomerId);
        
        // 2. Apply business operations through Domain methods
        foreach (var line in command.OrderLines)
            order.RegisterOrderItem(line.ProductId, line.ProductName, line.Quantity, line.Price);
        
        order.Confirm(); // Domain enforces invariants
        
        // 3. Orchestrate Infrastructure calls
        await _inventoryService.ReserveItemsAsync(order.OrderLines, ct);
        await _orderRepository.AddAsync(order, ct);
        
        return order.Id;
    }
}

// Application/Orders/Queries/GetOrder/OrderViewModel.cs
public sealed record OrderViewModel(
    Guid OrderId,
    string Status,
    List<OrderLineViewModel> OrderLines
);
```

### Authority

> "Application services orchestrate the execution of domain objects to perform the task."  
> — Vaughn Vernon, *Implementing Domain-Driven Design* (2013)

---

## Infrastructure Layer (External Dependencies)

### Purpose

Contains **implementation details** and **external dependencies**:
- Repository implementations (EF Core, Dapper)
- Database context (EF Core DbContext)
- External API clients
- File system access
- Email services
- Dependency injection configuration

### Responsibilities

✅ **MUST**:
- Implement repository interfaces (from Domain)
- Configure Entity Framework DbContext
- Implement external service interfaces
- Register handlers via convention-based DI
- Map Domain entities to database models (if needed)

❌ **MUST NOT**:
- Reference API layer
- Contain business logic (belongs in Domain)
- Define repository interfaces (belongs in Domain)

### Dependencies

- **Domain layer**: Repository interfaces, entities
- **Application layer**: Handler interfaces for DI registration
- **External libraries**: EF Core, Dapper, HTTP clients, etc.

### Example Code

```csharp
// Infrastructure/Persistence/OrderRepository.cs
public sealed class OrderRepository : IOrderRepository
{
    private readonly OrderingDbContext _context;
    
    public OrderRepository(OrderingDbContext context)
    {
        _context = context;
    }
    
    public async Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct = default)
    {
        return await _context.Orders
            .Include(o => o.OrderLines)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
    }
    
    public async Task AddAsync(Order order, CancellationToken ct = default)
    {
        await _context.Orders.AddAsync(order, ct);
        await _context.SaveChangesAsync(ct);
    }
}

// Infrastructure/DependencyInjection.cs
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // Register repositories
        services.AddScoped<IOrderRepository, OrderRepository>();
        
        // Register handlers via convention
        services.AddApplicationHandlers();
        
        // Register EF Core
        services.AddDbContext<OrderingDbContext>(options =>
            options.UseSqlServer("ConnectionString"));
        
        return services;
    }
}
```

### Authority

> "The infrastructure layer contains adapters that translate between the domain model and external systems."  
> — Eric Evans, *Domain-Driven Design* (2003)

---

## API Layer (Entry Point, Outermost)

### Purpose

Contains **HTTP endpoints** and **request/response handling**:
- Minimal API endpoints or Controllers
- HTTP request/response mapping
- Authentication/Authorization
- Swagger/OpenAPI configuration

### Responsibilities

✅ **MUST**:
- Define HTTP routes (GET, POST, PUT, DELETE)
- Inject ICommandHandler / IQueryHandler interfaces (NOT concrete classes)
- Map HTTP requests to Commands/Queries
- Return HTTP responses (200, 201, 404, 500)
- Apply authorization policies

❌ **MUST NOT**:
- Reference Application layer directly (discovered via Infrastructure DI)
- Contain business logic (belongs in Domain)
- Implement use case orchestration (belongs in Application)
- Instantiate handlers manually (use DI)

### Dependencies

- **Infrastructure layer**: DI configuration
- **Domain layer**: Commands, Queries, ViewModels (via Infrastructure DI)
- **NOT Application layer**: Handlers resolved via DI

### Example Code

```csharp
// API/Orders/OrdersEndpoints.cs
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
        ICommandHandler<PlaceOrderCommand, OrderId> handler, // Injected by DI (from Infrastructure)
        CancellationToken ct)
    {
        var orderId = await handler.HandleAsync(command, ct);
        return Results.Created($"/api/orders/{orderId.Value}", orderId);
    }
    
    private static async Task<IResult> GetOrder(
        Guid orderId,
        IQueryHandler<GetOrderQuery, OrderViewModel> handler,
        CancellationToken ct)
    {
        var query = new GetOrderQuery(new OrderId(orderId));
        var result = await handler.HandleAsync(query, ct);
        return Results.Ok(result);
    }
}
```

### Authority

> "The web is a delivery mechanism. [...] The web is a detail. It should not affect the business rules."  
> — Robert C. Martin, *Clean Architecture* (2017)

---

## Layer Interaction Rules

### Command Flow (Write)

```
1. API receives HTTP POST
   ↓
2. API creates PlaceOrderCommand
   ↓
3. API injects ICommandHandler<PlaceOrderCommand> (from Infrastructure DI)
   ↓
4. Handler (Application) creates Order aggregate (Domain)
   ↓
5. Handler calls Domain methods (Order.Confirm())
   ↓
6. Handler calls Infrastructure (IOrderRepository.AddAsync)
   ↓
7. Infrastructure persists to database (EF Core)
   ↓
8. API returns 201 Created
```

### Query Flow (Read)

```
1. API receives HTTP GET
   ↓
2. API creates GetOrderQuery
   ↓
3. API injects IQueryHandler<GetOrderQuery, OrderViewModel>
   ↓
4. Handler (Application) calls IOrderRepository.GetByIdAsync
   ↓
5. Infrastructure fetches from database (EF Core)
   ↓
6. Handler maps Order (Domain) to OrderViewModel (Application)
   ↓
7. API returns 200 OK with OrderViewModel
```

---

## Summary Table

| Layer | Purpose | Dependencies | Can Reference | Cannot Reference |
|-------|---------|--------------|---------------|------------------|
| **Domain** | Business rules | None | .NET BCL only | Application, Infrastructure, API, EF Core, HTTP |
| **Application** | Use case orchestration | Domain | Domain only | Infrastructure, API |
| **Infrastructure** | Implementation details | Domain, Application, EF Core, HTTP | Domain, Application, External libs | API |
| **API** | HTTP endpoints | Infrastructure, Domain | Infrastructure, Domain | Application (direct) |

---

## Validation with ArchUnit

Enforce these rules automatically:

```csharp
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
```

See [archunit-rules reference](archunit-rules.md).

---

## References

- Martin, Robert C. *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
- Evans, Eric. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley, 2003.
- Vernon, Vaughn. *Implementing Domain-Driven Design*. Addison-Wesley, 2013.
- Fowler, Martin. *Patterns of Enterprise Application Architecture*. Addison-Wesley, 2002.

---

## Related

- [Clean Architecture CQRS Skill](../SKILL.md): Complete project setup
- [Convention-Based DI](./convention-based-di.md): Handler registration
- [CQRS Without MediatR](./cqrs-without-mediatr.md): Why avoid MediatR
