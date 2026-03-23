# Architecture Layers

## The Four Layers

```
Domain        ← Business logic, aggregates (ZERO dependencies)
    ↓
Application   ← Use cases, handlers (Domain only)
    ↓
Infrastructure ← Repositories, services (Application + Domain)
    ↓
API           ← HTTP endpoints (Infrastructure only)
```

## Dependency Rules

| Layer | Can reference | Cannot reference |
|-------|---------------|------------------|
| Domain | Nothing | All others |
| Application | Domain | Infrastructure, API |
| Infrastructure | Domain, Application | API |
| API | Infrastructure, Domain | Application |

**Critical:** API injects `ICommandBus` / `IQueryBus` from DI — never imports Application assembly, never injects `ICommandHandler<,>` directly.

## Marker Interfaces

```csharp
// Domain/_Markers/IDomainMarker.cs
public interface IDomainMarker { }

// Application/_Markers/IApplicationMarker.cs
public interface IApplicationMarker { }

// Usage: typeof(IApplicationMarker).Assembly.GetTypes()
```

## Layer Tests (NetArchTest)

```csharp
[Fact]
public void Domain_ShouldNotDependOnOtherLayers()
{
    var result = Types.InAssembly(typeof(IDomainMarker).Assembly)
        .Should()
        .NotHaveDependencyOn("MyApp.Application")
        .And()
        .NotHaveDependencyOn("MyApp.Infrastructure")
        .GetResult();

    Assert.True(result.IsSuccessful);
}

[Fact]
public void Application_ShouldNotDependOnInfrastructure()
{
    var result = Types.InAssembly(typeof(IApplicationMarker).Assembly)
        .Should()
        .NotHaveDependencyOn("MyApp.Infrastructure")
        .GetResult();

    Assert.True(result.IsSuccessful);
}
```
