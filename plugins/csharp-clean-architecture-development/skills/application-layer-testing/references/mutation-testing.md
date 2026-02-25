# Mutation Testing for DDD Applications

## Purpose

Mutation testing validates that your tests actually test behavior, not just code coverage. It ensures no "weak" tests exist that pass even when business logic is broken.

## What is Mutation Testing?

Mutation testing introduces small changes (mutations) to your code and verifies that tests fail:

- **Mutant**: A modified version of your code (e.g., `>` changed to `>=`, `&&` to `||`)
- **Killed mutant**: Tests fail when mutation is introduced ✅
- **Surviving mutant**: Tests still pass despite mutation ❌

**Goal**: Kill all mutants (100% mutation score)

## Tool: Stryker.NET

For C# projects, use [Stryker.NET](https://stryker-mutator.io/docs/stryker-net/introduction/).

### Installation

```bash
dotnet tool install -g dotnet-stryker
```

### Configuration

Create `stryker-config.json` in test project root:

```json
{
  "stryker-config": {
    "project": "MyProject.Application.csproj",
    "test-projects": ["MyProject.UnitTests.csproj"],
    "mutate": [
      "!**/*ViewModel.cs",
      "!**/*Dto.cs",
      "!**/*Command.cs",
      "!**/*Query.cs",
      "**/*.cs"
    ],
    "thresholds": {
      "high": 100,
      "low": 95,
      "break": 95
    },
    "reporters": ["html", "progress", "cleartext"]
  }
}
```

**Key settings**:
- `mutate`: Exclude DTOs/ViewModels (no logic), focus on Handlers and Domain
- `thresholds`: Require 95-100% mutation score
- `break`: Build fails if score < 95%

### Running Mutation Tests

```bash
# From test project directory
dotnet stryker

# With specific configuration
dotnet stryker --config-file stryker-config.json
```

### Reading Results

Stryker generates an HTML report showing:
- **Mutation score**: % of killed mutants
- **Surviving mutants**: Where tests are weak
- **Killed mutants**: Where tests are strong

Open `StrykerOutput/reports/mutation-report.html` to view details.

## Common Mutations

### 1. Arithmetic Operators

```csharp
// Original
if (quantity > 0)

// Mutant
if (quantity >= 0)  // Should be killed by test with quantity = 0
```

**Fix**: Add test for edge case `quantity = 0`

### 2. Logical Operators

```csharp
// Original
if (order.Items.Any() && order.IsValid())

// Mutant
if (order.Items.Any() || order.IsValid())  // Changed && to ||
```

**Fix**: Add test where one condition is false

### 3. Boundary Conditions

```csharp
// Original
if (price < 100)

// Mutants
if (price <= 100)
if (price > 100)
if (price >= 100)
```

**Fix**: Test boundary values (99, 100, 101)

### 4. Return Values

```csharp
// Original
return true;

// Mutant
return false;
```

**Fix**: Assert on return value

### 5. Removal Mutations

```csharp
// Original
order.Confirm();

// Mutant
// order.Confirm();  // Statement removed
```

**Fix**: Verify state change (`Assert.Equal(OrderStatus.Confirmed, order.Status)`)

## Workflow Integration

### Test First with Mutation Testing

1. **Write tests first** - all test cases for the feature
2. **Implement code** to make tests pass
3. **Run unit tests** - must pass
4. **Run mutation tests** - identify weak spots
5. **Strengthen tests** to kill surviving mutants
6. **Refactor** with confidence

### CI/CD Integration

**In pipeline: Only run mutation tests on changed code (since base branch)**

```yaml
# Azure DevOps Pipeline
- task: DotNetCoreCLI@2
  displayName: 'Run mutation tests on changed code'
  inputs:
    command: 'custom'
    custom: 'stryker'
    arguments: '--config-file stryker-config.json --since:main'
    workingDirectory: 'tests/MyProject.UnitTests'

# GitHub Actions
- name: Run mutation tests on changed code
  run: |
    cd tests/MyProject.UnitTests
    dotnet stryker --config-file stryker-config.json --since:main
```

**Benefits**:
- **Fast feedback**: Only mutates changed code since base branch
- **Scalable**: Works with large codebases
- **Focused**: Validates new/modified logic only

**Local development**: Run full mutation tests (`dotnet stryker`) before PR

Fail build if mutation score < threshold (95-100%).

## Example: Killing Mutants

### Weak Test (Mutant Survives)

```csharp
// Domain
public void RegisterOrderItem(int quantity, decimal price)
{
    if (quantity <= 0)  // Mutant: changes <= to <
        throw new DomainException("Invalid quantity");
    
    // ... register item
}

// Weak test - doesn't test boundary
[Fact]
public async Task WhenRegisteringItem_ShouldSucceed()
{
    var order = Order.Create(...);
    order.RegisterOrderItem(5, 10.00m);  // Only tests valid case
    
    Assert.Single(order.OrderLines);  // Weak assertion
}
```

**Problem**: Mutant `quantity < 0` survives (test still passes with `quantity = 0`)

### Strong Test (Mutant Killed)

```csharp
[Fact]
public async Task WhenRegisteringItemWithZeroQuantity_ShouldThrowException()
{
    var order = Order.Create(...);
    
    // Test boundary condition
    var exception = Assert.Throws<DomainException>(
        () => order.RegisterOrderItem(0, 10.00m)
    );
    
    Assert.Contains("Invalid quantity", exception.Message);
}

[Fact]
public async Task WhenRegisteringItemWithNegativeQuantity_ShouldThrowException()
{
    var order = Order.Create(...);
    
    var exception = Assert.Throws<DomainException>(
        () => order.RegisterOrderItem(-1, 10.00m)
    );
    
    Assert.Contains("Invalid quantity", exception.Message);
}
```

**Result**: All mutants killed (boundary cases tested)

## Best Practices

### DO ✅

- **Run mutation tests after unit tests pass**
- **Target 100% mutation score** for critical business logic
- **Test edge cases and boundaries** explicitly
- **Verify state changes** in assertions (not just method calls)
- **Use specific assertions** (`Assert.Equal`, not just `Assert.NotNull`)
- **Exclude DTOs/ViewModels** from mutation (no logic)

### DON'T ❌

- **Don't rely only on code coverage** - not enough
- **Don't ignore surviving mutants** - they reveal weak tests
- **Don't mutate data structures** (DTOs, ViewModels) - focus on logic
- **Don't test trivial code** - focus mutation on Domain/Application

## Mutation Testing + Sociable Tests

Mutation testing complements sociable testing:

1. **Sociable tests** verify Domain + Application integration
2. **Mutation tests** ensure those tests are thorough
3. **Together** they guarantee business logic is correct and fully tested

### Example Workflow

```csharp
// 1. Write sociable test
[Fact]
public async Task WhenPlacingOrder_ShouldConfirmOrder()
{
    var handler = new PlaceOrderCommandHandler(...);
    var command = new PlaceOrderCommand(...);
    
    await handler.Handle(command);
    
    // Strong assertion (kills mutants)
    A.CallTo(() => repository.AddAsync(
        A<Order>.That.Matches(o => 
            o.Status == OrderStatus.Confirmed &&  // Kills status mutants
            o.OrderLines.Count == 2 &&            // Kills count mutants
            o.OrderLines.Sum(l => l.Total) == 35m // Kills calculation mutants
        ),
        A<CancellationToken>._
    )).MustHaveHappenedOnceExactly();
}
```

2. **Run unit tests** → Pass ✅
3. **Run mutation tests** → 100% mutation score ✅
4. **Confidence**: Business logic is correct and fully tested

## Mutation Score Targets

- **Domain layer**: 100% (aggregates, entities, value objects, specifications)
- **Application layer**: 100% (command/query handlers, business orchestration)
- **Infrastructure**: 80-90% (less critical, mocked in unit tests)
- **DTOs/ViewModels**: 0% (excluded, no logic)

## Troubleshooting

### Slow Mutation Tests

- **Exclude unnecessary files** (DTOs, ViewModels)
- **Run in parallel**: `dotnet stryker --concurrency 4`
- **Test only changed code**: `dotnet stryker --since:main`

### Too Many Mutants

- **Focus on one feature** at a time
- **Use `--mutate` pattern** to target specific files
- **Incremental approach**: Add mutation testing to new features first

### False Positives

- **Review mutant details** in HTML report
- **Some mutants may be equivalent** (same behavior) - acceptable
- **Use `--ignore-mutations`** for known equivalent mutants

## References

- [Stryker.NET Documentation](https://stryker-mutator.io/docs/stryker-net/introduction/)
- [Mutation Testing Best Practices](https://stryker-mutator.io/docs/mutation-testing-elements/introduction/)
