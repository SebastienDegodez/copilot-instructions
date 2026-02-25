---
applyTo: '**/*.cs'
---

# Clean Architecture

When implementing backend services, follow these Clean Architecture principles to ensure maintainability, scalability, and separation of concerns. This rule is tailored for .NET solutions with a multi-project structure.

## 1. Solution Structure

- The solution **must** be organized into four main projects (one per layer):
  - `[project].Domain` (core business logic, entities, value objects, domain events)
  - `[project].Application` (use cases, commands, queries, interfaces for external services)
  - `[project].Infrastructure` (implementations for external services, database access, third-party integrations)
  - `[project].Api` (API endpoints, minimal API, request/response models)
- Each project must contain a marker/reference file (e.g., `DomainReference.cs`) for test discovery and architecture validation.
- Tests must be in separate projects:
  - `tests/[project].UnitTests` (for Domain and Application)
  - `tests/[project].IntegrationTests` (for Infrastructure, Api, and architecture validation)

## 2. Dependencies Between Layers

- **Domain**: has no dependencies.
- **Application**: depends only on **Domain**.
- **Infrastructure**: depends on **Application** and **Domain**.
- **Api**: depends only on **Infrastructure**.
- These dependencies **must** be enforced by automated architecture tests (e.g., NetArchTest in `ArchitectureTests.cs`).
- Forbidden dependencies (e.g., EntityFrameworkCore in Api/Domain) must be checked by tests.

## 3. Folder and File Structure

- Use a **feature-oriented** (domain-driven) folder structure in each layer (e.g., `Order/`, `Customer/`).
- Do **not** use technical root folders (Entities, ValueObjects, Services, etc.).
- Example minimal structure:

```
src/
  [project].Domain/
    DomainReference.cs
    Order/ 
      Order.cs
      OrderCreatedEvent.cs
    Customer/
      Customer.cs
  [project].Application/
    ApplicationReference.cs
    Order/
      ...
    Customer/
      ...
  [project].Infrastructure/
    InfrastructureReference.cs
    Order/
      ...
    Customer/
      ...
  [project].Api/
    Program.cs
    ...
tests/
  [project].UnitTests/
    ...
  [project].IntegrationTests/
    ArchitectureTests.cs
    ...
```

## 4. Coding Style and Conventions

- Use file-scoped namespaces.
- One type per file.
- Follow Microsoft .NET C# coding conventions.
- Organize files by feature/domain.

## 5. Implementation Guidelines

- **Domain Layer**: All business logic, entities, value objects, and domain events. No dependencies on other layers.
- **Application Layer**: Use cases, commands, queries, interfaces for repositories/services. No business logic.
- **Infrastructure Layer**: Implementations for interfaces, database access, external integrations. No business logic.
- **Api Layer**: Minimal API endpoints, request/response mapping. No business logic.
- Use dependency injection for all cross-layer dependencies.
- Avoid circular dependencies.
- Do not use a mediator library; call service methods directly from the Api layer.

## 6. Testing and Architecture Validation

- **Unit Tests**: In `tests/[project].UnitTests/`, for Domain and Application layers only. Use xUnit v3 and FakeItEasy for mocks.
- **Integration Tests**: In `tests/[project].IntegrationTests/`, for Infrastructure and Api layers. Use Testcontainers/Microcks for advanced scenarios.
- **Architecture Tests**: Must be present in `ArchitectureTests.cs` and:
  - Enforce allowed/forbidden dependencies between layers
  - Check for forbidden dependencies (e.g., EF Core in Api/Domain)
  - Optionally, check for immutability in Domain
- Always write tests before implementation (TDD).

## 7. Architecture Testing Example

To enforce and validate architecture rules, add automated tests in `tests/[project].IntegrationTests/ArchitectureTests.cs` using [NetArchTest](https://github.com/BenMorris/NetArchTest). Example:

```csharp
using System.Reflection;
using NetArchTest.Rules;
using Xunit;
using Xunit.Abstractions;

using Order.Application;
using Order.Domain;
using Order.Infrastructure;

namespace Order.IntegrationTests;

public class ArchitectureTests
{
    private static string EntityFrameworkCore = "Microsoft.EntityFrameworkCore";
    private const string ApiNamespace = "Api";
    private const string ApplicationNamespace = "Application";
    private const string DomainNamespace = "Domain";
    private const string InfrastructureNamespace = "Infrastructure";

    private static readonly Assembly ApiAssembly = typeof(Program).Assembly;
    private static readonly Assembly ApplicationAssembly = typeof(ApplicationReference).Assembly;
    private static readonly Assembly DomainAssembly = typeof(DomainReference).Assembly;
    private static readonly Assembly InfrastructureAssembly = typeof(InfrastructureReference).Assembly;

    public ITestOutputHelper TestOutputHelper { get; }

    public ArchitectureTests(ITestOutputHelper testOutputHelper)
    {
        this.TestOutputHelper = testOutputHelper;
    }

    [Fact]
    public void Api_ShouldOnlyDependOn_Application()
    {
        var result = Types.InAssembly(ApiAssembly)
            .That().ResideInNamespace(ApiNamespace)
            .Should().HaveDependencyOn(ApplicationNamespace)
            .And()
            .NotHaveDependencyOn(DomainNamespace)
            .And()
            .NotHaveDependencyOn(InfrastructureNamespace)
            .GetResult();

        Assert.True(result.IsSuccessful, $"{ApiNamespace} should only depend on {ApplicationNamespace}");
    }

    // ...other architecture tests for Application, Infrastructure, Domain, and forbidden dependencies...
}
```

- Adapt namespaces, assemblies, and rules to your solution.
- Add tests to check for forbidden dependencies (e.g., EntityFrameworkCore in Api/Domain) and for immutability in Domain types if relevant.
- Run these tests with `dotnet test` to ensure architecture rules are enforced after every change.

## Additional Guidelines

1. Use dependency injection to manage dependencies across layers.
2. Avoid circular dependencies between layers.
3. Write unit tests for **Domain** and **Application** layers.
4. Use integration tests for **Infrastructure** and **Api** layers.
5. Follow SOLID principles within each layer.
6. Avoid using a mediator library; instead, directly call service methods from the **Api** layer.

# References
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/TheCleanArchitecture.html)
