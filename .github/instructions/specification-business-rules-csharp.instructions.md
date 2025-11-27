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
public sealed class CustomerEligibleForDiscountSpecification : ISpecification<Customer>
{
    public bool IsSatisfiedBy(Customer customer) =>
        customer.IsActive && 
        customer.TotalOrdersAmount > 1000m && 
        customer.MembershipLevel == MembershipLevel.Premium;

    // Static method for direct usage
    public static bool IsSatisfiedBy(Customer customer) =>
        new CustomerEligibleForDiscountSpecification().IsSatisfiedBy(customer);
}

// Aggregate using specification
public sealed class Order
{
    public void ApplyDiscount(Customer customer)
    {
        if (!CustomerEligibleForDiscountSpecification.IsSatisfiedBy(customer))
            throw new InvalidOperationException("Customer is not eligible for discount");
        
        // Apply discount logic...
    }
}
```

### Combined Specifications (Advanced Pattern)
```csharp
// Base specifications
public sealed class CustomerIsActiveSpecification : ISpecification<Customer>
{
    public bool IsSatisfiedBy(Customer customer) => customer.IsActive;
    
    public static bool IsSatisfiedBy(Customer customer) =>
        new CustomerIsActiveSpecification().IsSatisfiedBy(customer);
}

public sealed class CustomerHasMinimumOrdersSpecification : ISpecification<Customer>
{
    public bool IsSatisfiedBy(Customer customer) => customer.TotalOrdersAmount > 1000m;
    
    public static bool IsSatisfiedBy(Customer customer) =>
        new CustomerHasMinimumOrdersSpecification().IsSatisfiedBy(customer);
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
public sealed class Order
{
    public void ApplyPremiumDiscount(Customer customer)
    {
        var isActive = new CustomerIsActiveSpecification();
        var hasMinimumOrders = new CustomerHasMinimumOrdersSpecification();
        var combinedSpec = new AndSpecification<Customer>(isActive, hasMinimumOrders);
        
        if (!combinedSpec.IsSatisfiedBy(customer))
            throw new InvalidOperationException("Customer does not meet premium discount criteria");
        
        // Apply premium discount logic...
    }
}
```

## References
- Eric Evans, "Domain-Driven Design: Tackling Complexity in the Heart of Software"
- Vaughn Vernon, "Implementing Domain-Driven Design" — Chapters on Aggregates and Business Rules
- Udi Dahan, "Don't Create Aggregate Roots" — [udidahan.com/2009/06/29/dont-create-aggregate-roots/](https://udidahan.com/2009/06/29/dont-create-aggregate-roots/)
- Martin Fowler, "Specification Pattern" — [martinfowler.com/apsupp/spec.pdf](https://martinfowler.com/apsupp/spec.pdf)