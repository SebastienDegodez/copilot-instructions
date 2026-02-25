---
applyTo: '**/*.cs'
---

# Clean Architecture ArchUnit Rules

This instruction defines enforceable architecture rules using ArchUnit.NET for Clean Architecture projects with DDD and CQRS patterns.

## Purpose

Validate layer dependencies, naming conventions, and architectural boundaries automatically through tests. Catch violations during CI/CD before code review.

## Principles (Sources)

Based on authoritative sources:

- **Robert C. Martin** (*Clean Architecture*, 2017): Dependency Rule - dependencies point inward only; outer layers depend on inner, never reverse
- **Eric Evans** (*Domain-Driven Design*, 2003): Domain isolation - Domain has no infrastructure dependencies
- **Martin Fowler** (*Patterns of Enterprise Application Architecture*, 2002): Layered architecture separation
- **Vaughn Vernon** (*Implementing Domain-Driven Design*, 2013): Aggregates and bounded contexts encapsulation

## Layer Dependency Rules

### Domain Layer (Innermost)

**MUST**:
- Have ZERO external dependencies (including System.Data, EF Core, HTTP)
- Contain only business logic, entities, value objects, aggregates
- Define repository interfaces (NOT implementations)

**MUST NOT**:
- Reference Application, Infrastructure, or API layers
- Reference Entity Framework, ADO.NET, or persistence libraries
- Reference HTTP, ASP.NET Core, or web frameworks

**ArchUnit validation**: [DomainLayerRules.cs](../.github/skills/clean-architecture-dotnet/templates/ArchUnit/DomainLayerRules.cs)

```csharp
[Fact]
public void Domain_ShouldNotDependOnOtherLayers()
{
    DomainLayerRules.ShouldNotDependOnOtherLayers();
}

[Fact]
public void Domain_ShouldNotReferenceEntityFramework()
{
    DomainLayerRules.ShouldNotReferenceEntityFramework();
}
```

### Application Layer

**MUST**:
- Reference Domain layer ONLY
- Contain use case orchestration (CQRS handlers)
- Define Commands, Queries, and ViewModels

**MUST NOT**:
- Reference Infrastructure or API layers
- Reference Entity Framework directly (use repository interfaces)
- Contain HTTP or web concerns

**ArchUnit validation**: [ApplicationLayerRules.cs](../.github/skills/clean-architecture-dotnet/templates/ArchUnit/ApplicationLayerRules.cs)

```csharp
[Fact]
public void Application_ShouldOnlyDependOnDomain()
{
    ApplicationLayerRules.ShouldOnlyDependOnDomain();
}

[Fact]
public void Application_CommandHandlersShouldImplementICommandHandler()
{
    ApplicationLayerRules.CommandHandlersShouldImplementICommandHandler();
}
```

### Infrastructure Layer

**MUST**:
- Reference Application and Domain layers
- Implement repository interfaces from Domain
- Provide dependency injection configuration
- Use convention-based handler discovery

**MUST NOT**:
- Reference API layer

**ArchUnit validation**: [InfrastructureLayerRules.cs](../.github/skills/clean-architecture-dotnet/templates/ArchUnit/InfrastructureLayerRules.cs)

```csharp
[Fact]
public void Infrastructure_CanReferenceDomainAndApplication()
{
    InfrastructureLayerRules.CanReferenceDomainAndApplication();
}

[Fact]
public void Infrastructure_RepositoriesShouldBeInPersistence()
{
    InfrastructureLayerRules.RepositoryImplementationsShouldBeInPersistence();
}
```

### API Layer

**CRITICAL RULE**: API **MUST NOT** reference Application layer directly.

**MUST**:
- Reference Infrastructure and Domain only
- Inject `ICommandHandler<>` / `IQueryHandler<>` interfaces (resolved by Infrastructure DI)
- Define HTTP endpoints and controllers

**MUST NOT**:
- Reference Application layer assembly directly
- Instantiate handlers manually

**ArchUnit validation**: [ApiLayerRules.cs](../.github/skills/clean-architecture-dotnet/templates/ArchUnit/ApiLayerRules.cs)

```csharp
[Fact]
public void Api_ShouldNotReferenceApplication()
{
    ApiLayerRules.ShouldNotReferenceApplication();
}
```

**Rationale** (Robert C. Martin, Clean Architecture):
> "The Dependency Rule says that source code dependencies can only point inwards. Nothing in an inner circle can know anything at all about something in an outer circle."

API → Infrastructure (outer to outer) ✅  
API → Application (outer to inner) ❌ VIOLATION

Infrastructure DI container bridges the gap via convention-based discovery.

## Naming Convention Rules

### ViewModels

**MUST** end with `ViewModel` suffix (NOT `Dto`).

**Why**: "ViewModel" is more expressive for frontend data transfer objects and follows MVVM pattern naming.

```csharp
// ✅ Correct
public record OrderViewModel(Guid OrderId, string Status);

// ❌ Wrong
public record OrderDto(Guid OrderId, string Status);
```

**ArchUnit validation**: [NamingConventionRules.cs](../.github/skills/clean-architecture-dotnet/templates/ArchUnit/NamingConventionRules.cs)

```csharp
[Fact]
public void ViewModels_ShouldEndWithViewModel()
{
    NamingConventionRules.ViewModelsShouldEndWithViewModel();
}
```

### CQRS Handlers

**Commands**: Handler MUST end with `CommandHandler` suffix  
**Queries**: Handler MUST end with `QueryHandler` suffix

**Why**: Required for convention-based discovery in Infrastructure DI.

```csharp
// ✅ Correct
public class PlaceOrderCommandHandler : ICommandHandler<PlaceOrderCommand, OrderId>

public class GetOrderQueryHandler : IQueryHandler<GetOrderQuery, OrderViewModel>

// ❌ Wrong
public class PlaceOrderHandler : ICommandHandler<PlaceOrderCommand, OrderId>
```

**ArchUnit validation**:

```csharp
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
```

### Aggregates

**MUST NOT** use `Aggregate` suffix. Use business name directly.

```csharp
// ✅ Correct
public class Order

// ❌ Wrong
public class OrderAggregate
```

**Rationale** (Eric Evans, DDD): Use ubiquitous language. "Order" is the business term, not "OrderAggregate".

**ArchUnit validation**:

```csharp
[Fact]
public void Aggregates_ShouldNotHaveAggregateSuffix()
{
    NamingConventionRules.AggregatesShouldNotHaveAggregateSuffix();
}
```

## ArchUnit Test Project Structure

```
tests/
  [Project].ArchitectureTests/
    ArchUnit/
      DomainLayerRules.cs           ← Reusable rules class
      ApplicationLayerRules.cs      ← Reusable rules class
      ApiLayerRules.cs              ← Reusable rules class
      InfrastructureLayerRules.cs   ← Reusable rules class
      NamingConventionRules.cs      ← Reusable rules class
    CleanArchitectureTests.cs       ← xUnit test class
```

### CleanArchitectureTests Template

```csharp
using Xunit;

namespace [Project].ArchitectureTests;

public sealed class CleanArchitectureTests
{
    [Fact]
    public void Domain_ShouldNotDependOnOtherLayers()
    {
        ArchUnit.DomainLayerRules.ShouldNotDependOnOtherLayers();
    }

    [Fact]
    public void Application_ShouldOnlyDependOnDomain()
    {
        ArchUnit.ApplicationLayerRules.ShouldOnlyDependOnDomain();
    }

    [Fact]
    public void Api_ShouldNotReferenceApplication()
    {
        ArchUnit.ApiLayerRules.ShouldNotReferenceApplication();
    }

    [Fact]
    public void Infrastructure_CanReferenceDomainAndApplication()
    {
        ArchUnit.InfrastructureLayerRules.CanReferenceDomainAndApplication();
    }

    [Fact]
    public void ViewModels_ShouldEndWithViewModel()
    {
        ArchUnit.NamingConventionRules.ViewModelsShouldEndWithViewModel();
    }

    [Fact]
    public void CommandHandlers_ShouldEndWithCommandHandler()
    {
        ArchUnit.NamingConventionRules.CommandHandlersShouldEndWithCommandHandler();
    }

    [Fact]
    public void QueryHandlers_ShouldEndWithQueryHandler()
    {
        ArchUnit.NamingConventionRules.QueryHandlersShouldEndWithQueryHandler();
    }
}
```

## CI/CD Integration

Run ArchUnit tests in every build:

```yaml
# .github/workflows/build.yml
- name: Run Architecture Tests
  run: dotnet test --filter "FullyQualifiedName~ArchitectureTests"
```

**Exit code 1** if violations found → blocks merge.

## When to Use

✅ **Always use** for:
- New Clean Architecture projects
- Projects with multiple teams (enforce boundaries)
- Long-lived codebases (prevent erosion)
- Onboarding new developers (self-documenting architecture)

❌ **Skip for**:
- Prototypes or throwaway code
- Simple CRUD apps without layering
- Projects < 3 months lifespan

## Quick Start

Use the [clean-architecture-dotnet skill](../.github/skills/clean-architecture-dotnet/SKILL.md) to generate a complete project with ArchUnit tests pre-configured.

```bash
./.github/skills/clean-architecture-dotnet/scripts/init-project.sh "MyProject"
```

This creates all ArchUnit rules and tests automatically.

## References

### Books

- Martin, Robert C. *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
- Evans, Eric. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley, 2003.
- Fowler, Martin. *Patterns of Enterprise Application Architecture*. Addison-Wesley, 2002.
- Vernon, Vaughn. *Implementing Domain-Driven Design*. Addison-Wesley, 2013.

### ArchUnit.NET

- Official Documentation: https://archunitnet.readthedocs.io/
- GitHub: https://github.com/TNG/ArchUnitNET

## Enforcement

- Run ArchUnit tests on every build (`dotnet test`)
- Block PRs if architecture tests fail
- Review violations in code reviews before merging
- Update rules when architecture evolves (document changes)

## Example Violation Messages

```
Test 'Domain_ShouldNotDependOnOtherLayers' failed:
  Type 'Order' in namespace 'MyProject.Domain' depends on 
  'Microsoft.EntityFrameworkCore.DbContext' which violates 
  'Domain layer must remain isolated and have no dependencies on other layers'
```

Clear, actionable feedback → fix immediately.

## Related Skills

- [clean-architecture-dotnet](../.github/skills/clean-architecture-dotnet/SKILL.md): Complete project setup with ArchUnit
- [application-layer-testing](../.github/skills/application-layer-testing/SKILL.md): Testing Application handlers

## Related Instructions

- [domain-driven-design.instructions.md](./domain-driven-design.instructions.md): DDD patterns
- [coding-style-csharp.instructions.md](./coding-style-csharp.instructions.md): C# code style
