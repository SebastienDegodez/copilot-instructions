---
applyTo: '**/*.cs'
description: Architecture and structural guidelines for implementing modular monolith solutions in C# with clear module boundaries and dependency management.
---

# Modular Monolith Architecture in C#

This instruction defines the architectural guidelines and structural organization for implementing modular monolith applications in C#.

## Purpose

Establish a clear architectural foundation for modular monoliths that ensures module autonomy, proper separation of concerns, and scalability while maintaining the simplicity of monolithic deployment.

## 1. Solution Structure

### Root Solution Structure
```
src/
  [Solution].sln
  SharedKernel/
    [Solution].SharedKernel.Domain/
    [Solution].SharedKernel.Application/
    [Solution].SharedKernel.Infrastructure/
  Modules/
    [Module1]/
      [Solution].[Module1].Domain/
      [Solution].[Module1].Application/
      [Solution].[Module1].Infrastructure/
      [Solution].[Module1].Api/
    [Module2]/
      [Solution].[Module2].Domain/
      [Solution].[Module2].Application/
      [Solution].[Module2].Infrastructure/
      [Solution].[Module2].Api/
  Host/
    [Solution].Host/
tests/
  SharedKernel/
    [Solution].SharedKernel.UnitTests/
    [Solution].SharedKernel.IntegrationTests/
  Modules/
    [Module1]/
      [Solution].[Module1].UnitTests/
      [Solution].[Module1].IntegrationTests/
      [Solution].[Module1].ArchitectureTests/
    [Module2]/
      [Solution].[Module2].UnitTests/
      [Solution].[Module2].IntegrationTests/
      [Solution].[Module2].ArchitectureTests/
```

### Project Naming Conventions
- **Solution name**: Should reflect the business domain or product name
- **Module names**: Should represent bounded contexts from Domain-Driven Design
- **Layer suffixes**: `.Domain`, `.Application`, `.Infrastructure`, `.Api`
- **Test projects**: Mirror the source structure with `.UnitTests`, `.IntegrationTests`, `.ArchitectureTests`

## 2. Module Dependencies and Boundaries

### Dependency Rules
- **Modules MUST be autonomous**: No direct project references between modules
- **SharedKernel components**: Common infrastructure, cross-cutting concerns, shared domain concepts
- **Host project**: Single entry point, dependency injection configuration, API composition
- **Inter-module communication**: Use domain events, message bus, or API calls only

### Allowed Dependencies
```
Host -> Module.Infrastructure (for registration only)
Module.Infrastructure -> Module.Application -> Module.Domain
Module.Infrastructure -> SharedKernel.Infrastructure
Module.Application -> SharedKernel.Application
Module.Domain -> SharedKernel.Domain (minimal usage)
```

### Forbidden Dependencies
- Direct dependencies between modules (Module1 -> Module2)
- Circular dependencies between any projects
- Infrastructure dependencies in Domain or Application layers
- Skip-level dependencies (e.g., Api -> Domain directly)

## 3. Clean Architecture per Module

Each module MUST follow the **Clean Architecture principles** as defined in `clean-architecture.instructions.md`.

### Key Adaptations for Modular Monolith

- **Project Structure**: Each module replicates the 4-layer structure:
  - `[Solution].[Module].Domain` 
  - `[Solution].[Module].Application`
  - `[Solution].[Module].Infrastructure` 
  - `[Solution].[Module].Api`

- **Dependencies**: Follow the same dependency rules as Clean Architecture, but scoped per module
- **Domain Design**: Apply DDD principles as defined in `domain-driven-design.instructions.md` within each module boundary

### Module-Specific Domain Example
```csharp
// Example: Following DDD principles within a module
namespace [Solution].Ordering.Domain.Orders;

public sealed class Order
{
    public OrderId Id { get; }
    public CustomerId CustomerId { get; }
    public OrderStatus Status { get; private set; }
    
    // Factory method following DDD guidelines
    public static Order CreateNew(OrderId id, CustomerId customerId)
    {
        var order = new Order(id, customerId);
        order.RaiseDomainEvent(new OrderCreatedEvent(id, customerId));
        return order;
    }
}
```

**Refer to `clean-architecture.instructions.md` for detailed layer responsibilities and `domain-driven-design.instructions.md` for domain modeling guidelines.**

## 4. Host Project Configuration

### Responsibility of Host Project
- **Single entry point**: Main method and application startup
- **Module composition**: Register and configure all modules
- **Cross-cutting concerns**: Logging, monitoring, security, CORS
- **API aggregation**: Expose endpoints from all modules
- **Shared infrastructure**: Database connections, message bus, caching

### Example Host Configuration
```csharp
// Program.cs in Host project
var builder = WebApplication.CreateBuilder(args);

// Register shared kernel services
builder.Services.AddSharedKernelServices(builder.Configuration);

// Register module services
builder.Services.AddOrderingModule(builder.Configuration);
builder.Services.AddCatalogModule(builder.Configuration);
builder.Services.AddCustomerModule(builder.Configuration);

// Add cross-cutting concerns
builder.Services.AddAuthentication();
builder.Services.AddAuthorization();
builder.Services.AddLogging();

var app = builder.Build();

// Configure cross-cutting concerns
app.UseAuthentication();
app.UseAuthorization();

// Configure module endpoints
app.MapOrderingEndpoints();
app.MapCatalogEndpoints();
app.MapCustomerEndpoints();

app.Run();
```

## 5. Module Registration Pattern

### Module Service Registration
Each module must provide extension methods for clean registration:

```csharp
// In [Solution].[Module].Infrastructure
public static class ModuleServiceCollectionExtensions
{
    public static IServiceCollection AddOrderingModule(
        this IServiceCollection services, 
        IConfiguration configuration)
    {
        // Register module-specific DbContext
        services.AddDbContext<OrderingDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("Ordering")));
            
        // Register repositories
        services.AddScoped<IOrderRepository, OrderRepository>();
        
        // Register MediatR for the module
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(ApplicationAssembly));
        
        // Register module-specific services
        services.AddScoped<IOrderingService, OrderingService>();
        
        return services;
    }
}
```

### Module Endpoint Registration
```csharp
// In [Solution].[Module].Api
public static class ModuleEndpointExtensions
{
    public static WebApplication MapOrderingEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/ordering")
            .WithTags("Ordering")
            .WithOpenApi();
            
        group.MapPost("/orders", CreateOrder);
        group.MapGet("/orders/{id}", GetOrder);
        group.MapPut("/orders/{id}/status", UpdateOrderStatus);
        
        return app;
    }
}
```

## 6. SharedKernel Guidelines

### What Belongs in SharedKernel
- **Common Value Objects**: Money, Address, Email (used across multiple modules)
- **Common Interfaces**: IRepository<T>, IDomainEvent, IAuditableEntity
- **Cross-cutting Infrastructure**: Logging, caching, messaging abstractions
- **Common Exceptions**: DomainException, ValidationException

### What Should NOT Be in SharedKernel
- Module-specific business logic
- Module-specific entities or aggregates
- Large, complex domain concepts that could become coupling points

### SharedKernel Structure Example
```csharp
// SharedKernel.Domain
public abstract record DomainEvent(Guid Id, DateTime OccurredOn) : IDomainEvent;

public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money Zero(string currency) => new(0, currency);
    public Money Add(Money other) => 
        Currency == other.Currency 
            ? new(Amount + other.Amount, Currency)
            : throw new InvalidOperationException("Cannot add different currencies");
}

// SharedKernel.Application
public interface IQuery<TResponse> { }
public interface ICommand { }
public interface ICommandHandler<TCommand> where TCommand : ICommand { }
```

## 7. Architecture Validation

### Architecture Tests
Each module must include architecture tests to enforce these rules. Follow the testing guidelines in `unit-and-integration-tests.instructions.md`.

```csharp
public sealed class ModuleArchitectureTests
{
    [Fact]
    public void Domain_ShouldNotHaveDependencyOnOtherLayers()
    {
        // Enforce Clean Architecture rules per module
        var result = Types.InAssembly(DomainAssembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "Microsoft.EntityFrameworkCore",
                "[Solution].*.Application",
                "[Solution].*.Infrastructure")
            .GetResult();
            
        result.IsSuccessful.Should().BeTrue();
    }
    
    [Fact]
    public void Modules_ShouldNotReferenceOtherModules()
    {
        // Enforce module autonomy
        var result = Types.InAssembly(ModuleAssembly)
            .ShouldNot()
            .HaveDependencyOnAny("[Solution].OtherModule.*")
            .GetResult();
            
        result.IsSuccessful.Should().BeTrue();
    }
}
```

**Refer to `unit-and-integration-tests.instructions.md` for comprehensive testing strategies.**

## 8. Best Practices

### Module Design
- **Single Responsibility**: Each module should represent one bounded context
- **High Cohesion**: Related functionality should be grouped together
- **Loose Coupling**: Minimal dependencies between modules
- **Clear Interfaces**: Well-defined contracts for inter-module communication

### Scalability Considerations
- Design modules to be **microservice-ready** for future decomposition
- Keep module interfaces **stable** and **versioned**
- Plan for **independent scaling** of different modules
- Consider **data partitioning** strategies per module

### Development Workflow
- Develop modules **independently** when possible
- Use **feature branches** per module for large changes
- Implement **module-specific CI/CD** pipelines
- Maintain **clear ownership** of modules by teams

## References

**Related Instructions:**
- `clean-architecture.instructions.md` - For detailed Clean Architecture implementation per module
- `domain-driven-design.instructions.md` - For DDD principles and domain modeling
- `unit-and-integration-tests.instructions.md` - For comprehensive testing strategies

**External References:**
- Evans, Eric. "Domain-Driven Design: Tackling Complexity in the Heart of Software"
- Vernon, Vaughn. "Implementing Domain-Driven Design"
- Martin, Robert C. "Clean Architecture"
- [Modular Monolith Primer](https://www.kamilgrzybek.com/design/modular-monolith-primer/)
