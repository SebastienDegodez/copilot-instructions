---
applyTo: '**/*.cs'
---

# Clean Architecture NetArchTest Rules

This instruction defines enforceable architecture rules using NetArchTest.Rules for Clean Architecture projects with DDD and CQRS patterns.

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

```csharp
[Fact]
public void Domain_ShouldNotHaveDependencyOn_OtherLayers()
{
    var result = Types.InAssembly(DomainAssembly)
        .Should()
        .NotHaveDependencyOn(ApplicationNamespace)
        .And()
        .NotHaveDependencyOn(InfrastructureNamespace)
        .And()
        .NotHaveDependencyOn(ApiNamespace)
        .GetResult();

    Assert.True(result.IsSuccessful,
        $"Domain layer should not depend on other layers. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
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

```csharp
[Fact]
public void Application_ShouldOnlyDependOn_Domain()
{
    var result = Types.InAssembly(ApplicationAssembly)
        .Should()
        .NotHaveDependencyOn(InfrastructureNamespace)
        .And()
        .NotHaveDependencyOn(ApiNamespace)
        .GetResult();

    Assert.True(result.IsSuccessful,
        $"Application layer should not depend on Infrastructure or API. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
}
```

### Infrastructure Layer

**MUST**:
- Reference Application and Domain layers
- Implement repository interfaces from Domain
- Provide dependency injection configuration
- Use interface-based handler registration (`AddApplicationHandlers()` or `AddHandler<T>()`)

**MUST NOT**:
- Reference API layer

```csharp
[Fact]
public void Infrastructure_ShouldNotHaveDependencyOn_Api()
{
    var result = Types.InAssembly(InfrastructureAssembly)
        .Should()
        .NotHaveDependencyOn(ApiNamespace)
        .GetResult();

    Assert.True(result.IsSuccessful,
        $"Infrastructure should not depend on API layer. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
}
```

### API Layer

**CRITICAL RULE**: API **MUST NOT** reference Application layer directly.

**MUST**:
- Reference Infrastructure and Domain only
- Inject `ICommandBus` / `IQueryBus` (resolved by Infrastructure DI)
- Define HTTP endpoints and controllers

**MUST NOT**:
- Reference Application layer assembly directly
- Instantiate handlers manually

```csharp
[Fact]
public void Api_ShouldNotHaveDependencyOn_Application()
{
    var result = Types.InAssembly(ApiAssembly)
        .Should()
        .NotHaveDependencyOn(ApplicationNamespace)
        .GetResult();

    Assert.True(result.IsSuccessful,
        $"API layer should not depend on Application layer. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
}
```

**Rationale** (Robert C. Martin, Clean Architecture):
> "The Dependency Rule says that source code dependencies can only point inwards. Nothing in an inner circle can know anything at all about something in an outer circle."

API → Infrastructure (outer to outer) ✅  
API → Application (outer to inner) ❌ VIOLATION

Infrastructure DI container bridges the gap via interface-based handler registration.

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

### CQRS Handlers

No naming convention is enforced. Handlers are discovered by implementing `ICommandHandler<>` or `IQueryHandler<>` interface.

### Aggregates

**MUST NOT** use `Aggregate` suffix. Use business name directly.

```csharp
// ✅ Correct
public class Order

// ❌ Wrong
public class OrderAggregate
```

**Rationale** (Eric Evans, DDD): Use ubiquitous language. "Order" is the business term, not "OrderAggregate".

## Test Structure

Architecture tests live in the IntegrationTests project:

```
tests/
  [Project].IntegrationTests/
    ArchitectureTests.cs       ← All architecture rules in one test class
```

### ArchitectureTests Template

```csharp
using System.Reflection;
using NetArchTest.Rules;
using Xunit;

namespace [Project].IntegrationTests;

public sealed class ArchitectureTests
{
    private const string DomainNamespace = "[Project].Domain";
    private const string ApplicationNamespace = "[Project].Application";
    private const string InfrastructureNamespace = "[Project].Infrastructure";
    private const string ApiNamespace = "[Project].Api";

    private static readonly Assembly DomainAssembly = typeof(IDomainMarker).Assembly;
    private static readonly Assembly ApplicationAssembly = typeof(IApplicationMarker).Assembly;
    private static readonly Assembly InfrastructureAssembly = typeof(IInfrastructureMarker).Assembly;
    private static readonly Assembly ApiAssembly = typeof(IApiMarker).Assembly;

    [Fact]
    public void Domain_Classes_Should_Be_Sealed()
    {
        var result = Types
            .InAssembly(DomainAssembly)
            .That().AreClasses()
            .Should().BeSealed()
            .GetResult();

        Assert.True(result.IsSuccessful, "All Domain classes must be sealed.");
    }

    [Fact]
    public void Domain_ShouldNotHaveDependencyOn_OtherLayers()
    {
        var result = Types.InAssembly(DomainAssembly)
            .Should()
            .NotHaveDependencyOn(ApplicationNamespace)
            .And()
            .NotHaveDependencyOn(InfrastructureNamespace)
            .And()
            .NotHaveDependencyOn(ApiNamespace)
            .GetResult();

        Assert.True(result.IsSuccessful,
            $"Domain layer should not depend on other layers. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }

    [Fact]
    public void Application_ShouldOnlyDependOn_Domain()
    {
        var result = Types.InAssembly(ApplicationAssembly)
            .Should()
            .NotHaveDependencyOn(InfrastructureNamespace)
            .And()
            .NotHaveDependencyOn(ApiNamespace)
            .GetResult();

        Assert.True(result.IsSuccessful,
            $"Application layer should not depend on Infrastructure or API. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }

    [Fact]
    public void Infrastructure_ShouldNotHaveDependencyOn_Api()
    {
        var result = Types.InAssembly(InfrastructureAssembly)
            .Should()
            .NotHaveDependencyOn(ApiNamespace)
            .GetResult();

        Assert.True(result.IsSuccessful,
            $"Infrastructure should not depend on API layer. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }

    [Fact]
    public void Api_ShouldNotHaveDependencyOn_Application()
    {
        var result = Types.InAssembly(ApiAssembly)
            .Should()
            .NotHaveDependencyOn(ApplicationNamespace)
            .GetResult();

        Assert.True(result.IsSuccessful,
            $"API layer should not depend on Application layer. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }
}
```

## CI/CD Integration

Run architecture tests in every build:

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

Use the [clean-architecture-dotnet skill](../.github/skills/clean-architecture-dotnet/SKILL.md) to generate a complete project with NetArchTest tests pre-configured.

```bash
./.github/skills/clean-architecture-dotnet/scripts/init-project.sh "MyProject"
```

This creates all architecture rules and tests automatically.

## References

### Books

- Martin, Robert C. *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
- Evans, Eric. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley, 2003.
- Fowler, Martin. *Patterns of Enterprise Application Architecture*. Addison-Wesley, 2002.
- Vernon, Vaughn. *Implementing Domain-Driven Design*. Addison-Wesley, 2013.

### NetArchTest

- GitHub: https://github.com/BenMorris/NetArchTest
- NuGet: https://www.nuget.org/packages/NetArchTest.Rules

## Enforcement

- Run NetArchTest tests on every build (`dotnet test`)
- Block PRs if architecture tests fail
- Review violations in code reviews before merging
- Update rules when architecture evolves (document changes)

## Example Violation Messages

```
Test 'Domain_ShouldNotHaveDependencyOn_OtherLayers' failed:
  Domain layer should not depend on other layers. Violations: MyProject.Domain.SomeType
```

Clear, actionable feedback → fix immediately.

## Related Skills

- [clean-architecture-dotnet](../.github/skills/clean-architecture-dotnet/SKILL.md): Complete project setup with NetArchTest
- [outside-in-tdd](../.github/skills/outside-in-tdd/SKILL.md): Testing Application and Domain layers
