---
applyTo: '**/*Domain/**/*.cs'
description: Guidelines for encapsulating business rules in aggregates using the Specification pattern (DDD, C#)
---
# Business Rules Encapsulation in Aggregates

## Purpose
Define how to properly encapsulate business rules and invariants within aggregates, establish clear criteria for when to use the Specification pattern versus direct implementation, and ensure business logic remains within the domain boundary following DDD principles.

## Business Rules Encapsulation
- Always encapsulate business rules and invariants inside the aggregate root.
- Use explicit business methods (not setters/getters) to enforce invariants.
- Keep simple invariants directly in aggregate methods (e.g., quantity > 0, required fields).
- The aggregate remains the single source of truth for business consistency.
- Avoid leaking domain logic to application or infrastructure layers.

## When to Use Specification Pattern
- Use Specification for **complex business rules** that involve multiple conditions or calculations.
- Use Specification for **reusable rules** across different aggregates or contexts.
- Use Specification for **combinable rules** that need logical operators (And, Or, Not).
- Use Specification when business rules require **external data** or **cross-aggregate validation**.
- **Prefer existing specification interfaces** from shared kernel or domain libraries before creating custom ones.
- **Do not use** Specification for simple field validation or basic invariants.

## CRITICAL: Complete Implementation Requirements
When implementing the Specification pattern, you MUST provide:

### 1. Complete Implementation Chain
- ✅ The specification classes themselves (e.g., ActivePolicySpecification)
- ✅ A concrete repository implementation showing `FindBySpecificationAsync()` usage
- ✅ Actual usage in query handlers/use cases with specification instantiation
- ✅ Usage examples demonstrating combinations (AND, OR, NOT)

### 2. Repository Integration
- Repository MUST have `FindBySpecificationAsync(ISpecification<T> spec)` method
- Show the actual filtering logic using `specification.IsSatisfiedBy(entity)`
- Other specific methods SHOULD internally delegate to specifications:
  ```csharp
  public async Task<IReadOnlyCollection<Trip>> FindAvailableTripsForPeriodAsync(
      DateTime startDate, DateTime endDate, CancellationToken ct = default)
  {
      var spec = new TripAvailableInPeriodSpecification(startDate, endDate);
      return await FindBySpecificationAsync(spec, ct);
  }
  ```

### 3. Query Handler / Use Case Usage
Query handlers MUST explicitly instantiate and use specifications:
```csharp
// ✅ CORRECT: Shows specification pattern in action
var specification = new TripAvailableInPeriodSpecification(startDate, endDate);
var trips = await _repository.FindBySpecificationAsync(specification, ct);

// ❌ WRONG: Hides the specification usage
var trips = await _repository.FindAvailableTripsForPeriodAsync(startDate, endDate, ct);
```

### 4. Mandatory Usage Examples File
Create a `UsageExample.cs` or `SpecificationExamples.cs` showing:
- Simple single specification usage
- Combined specifications using AND
- Combined specifications using OR
- NOT operator usage
- Integration with repository calls

## Best Practices
- Keep aggregates small and focused on business consistency.
- Name specifications and business methods using ubiquitous language.
- Prefer static methods on specifications for stateless business rules.
- Use existing specification interfaces from shared kernel or libraries when available.
- Create custom specification interfaces only when shared ones don't exist.
- Use domain services for cross-aggregate business rules requiring specifications.
- Combine specifications using logical operators for complex business scenarios.
- Document the business intent of each rule and specification.
- Test specifications independently from aggregates.

## Examples (C#)

### Simple Business Rule (Direct Implementation)
```csharp
public sealed class Order
{
    public void AddItem(string productName, int quantity, decimal price)
    {
        // Simple invariant - keep in aggregate
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be greater than zero");
        if (price <= 0)
            throw new ArgumentException("Price must be greater than zero");
        
        var orderLine = new OrderLine(productName, quantity, price);
        _orderLines.Add(orderLine);
    }
}
```

### Complex Business Rule (Specification Pattern)
```csharp
// Use existing interface from shared kernel if available
// Example: using SharedKernel.Specifications.ISpecification<T>
// Otherwise, define locally:
public interface ISpecification<T>
{
    bool IsSatisfiedBy(T entity);
}

// Complex business rule with static method
public sealed class TripEligibleForPromotionSpecification : ISpecification<Trip>
{
    public bool IsSatisfiedBy(Trip trip) =>
        trip.IsAvailable && 
        trip.AvailableSeats >= 5 && 
        trip.DepartureDate > DateTime.UtcNow.AddDays(30) &&
        trip.Destination.IsPopular;

    // Static method for direct usage
    public static bool IsSatisfiedBy(Trip trip) =>
        new TripEligibleForPromotionSpecification().IsSatisfiedBy(trip);
}

// Aggregate using specification
public sealed class Booking
{
    public void ApplyPromotionalDiscount(Trip trip)
    {
        if (!TripEligibleForPromotionSpecification.IsSatisfiedBy(trip))
            throw new InvalidOperationException("Trip is not eligible for promotional discount");
        
        // Apply discount logic...
    }
}
```

### Combined Specifications (Advanced Pattern)
```csharp
// Base specifications
public sealed class TripIsAvailableSpecification : ISpecification<Trip>
{
    public bool IsSatisfiedBy(Trip trip) => trip.IsAvailable;
    
    public static bool IsSatisfiedBy(Trip trip) =>
        new TripIsAvailableSpecification().IsSatisfiedBy(trip);
}

public sealed class TripHasMinimumSeatsSpecification : ISpecification<Trip>
{
    private readonly int _minimumSeats;
    
    public TripHasMinimumSeatsSpecification(int minimumSeats)
    {
        _minimumSeats = minimumSeats;
    }
    
    public bool IsSatisfiedBy(Trip trip) => trip.AvailableSeats >= _minimumSeats;
}

public sealed class TripDepartsSoonSpecification : ISpecification<Trip>
{
    private readonly int _daysBeforeDeparture;
    
    public TripDepartsSoonSpecification(int daysBeforeDeparture)
    {
        _daysBeforeDeparture = daysBeforeDeparture;
    }
    
    public bool IsSatisfiedBy(Trip trip) => 
        trip.DepartureDate <= DateTime.UtcNow.AddDays(_daysBeforeDeparture);
}

// Combinable specifications
public sealed class AndSpecification<T> : ISpecification<T>
{
    private readonly ISpecification<T> _left;
    private readonly ISpecification<T> _right;

    public AndSpecification(ISpecification<T> left, ISpecification<T> right)
    {
        _left = left;
        _right = right;
    }

    public bool IsSatisfiedBy(T entity) => 
        _left.IsSatisfiedBy(entity) && _right.IsSatisfiedBy(entity);
}

// Aggregate using combined specifications
public sealed class Booking
{
    public void ApplyLastMinuteDiscount(Trip trip)
    {
        var isAvailable = new TripIsAvailableSpecification();
        var hasMinimumSeats = new TripHasMinimumSeatsSpecification(5);
        var departsSoon = new TripDepartsSoonSpecification(7);
        
        var combinedSpec = new AndSpecification<Trip>(
            new AndSpecification<Trip>(isAvailable, hasMinimumSeats),
            departsSoon);
        
        if (!combinedSpec.IsSatisfiedBy(trip))
            throw new InvalidOperationException("Trip does not meet last-minute discount criteria");
        
        // Apply last-minute discount logic...
    }
}
```

## References
- Eric Evans, "Domain-Driven Design: Tackling Complexity in the Heart of Software"
- Vaughn Vernon, "Implementing Domain-Driven Design" — Chapters on Aggregates and Business Rules
- Udi Dahan, "Don't Create Aggregate Roots" — [udidahan.com/2009/06/29/dont-create-aggregate-roots/](https://udidahan.com/2009/06/29/dont-create-aggregate-roots/)
- Martin Fowler, "Specification Pattern" — [martinfowler.com/apsupp/spec.pdf](https://martinfowler.com/apsupp/spec.pdf)
