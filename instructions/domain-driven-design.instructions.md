---
applyTo: '**'
---

# Domain-Driven Design (DDD) Instruction rule

## Purpose
These rules help you apply Domain-Driven Design principles to ensure your codebase is expressive, maintainable, and aligned with business needs.

## Objective
Ensure a clear separation of concerns, encapsulate business logic within domain models, and promote a shared understanding of the domain
without relying on base class inheritance for aggregate roots, entities, and value objects.

## Structure 

All domain logic should be encapsulated within the domain layer, which is separate from the application and infrastructure layers.
The domain layer should contain the following components:
- **Entities**: Objects with a distinct identity that persists over time.
- **Value Objects**: Immutable objects that are defined only by their attributes.
- **Aggregates**: A cluster of domain objects treated as a single unit.
- **Repositories**: Interfaces for accessing aggregates.
- **Strongly Typed IDs**: Use strongly typed IDs for entities and aggregates to avoid confusion and ensure type safety.
- **Domain Events**: Events that signify a change in the state of the domain.

All elements must be created in the `src/[project].Domain/[feature]` directory (C#) or `src/[project]/Domain/[feature]` (Java) to ensure a clear structure and organization.

## Modeling Guidelines

#### Aggregates
- Aggregates are the root of the DDD model and represent a consistency boundary; they map 1:1 to business concepts and typically to database tables.
- Aggregates must always be created via a static factory method (e.g. `Order.Create(...)`), never via a public constructor.
- Aggregates do not inherit from a base AggregateRoot or Entity class; inheritance is not required in DDD and should be avoided unless justified by a real business need.
- Aggregates can contain entities or value objects, but never other aggregates.
- Use private or protected constructors for aggregates to enforce factory method usage.
- Do not use navigation properties to other aggregates (e.g. do not use `Order.Customer`).
- Use private fields and properties for encapsulation; expose only business methods to change state and enforce invariants.
- Aggregates are responsible for enforcing all business rules and invariants within their boundary.

#### Entities
- Entities are owned by aggregates and should not be used outside of them.
- Entities must be created via a factory method of the aggregate root (not directly via public constructor).
- Entities must have a unique identifier (Id) and encapsulate their state (no public setters).
- Entities should have private or protected constructors and expose only business methods for state changes.
- Entities' lifecycle is managed by the aggregate root.
- Entities should not inherit from a base Entity or AggregateRoot class; inheritance is not required in DDD and should be avoided unless justified by a real business need.

#### Value Objects
- Value objects are immutable and defined only by their attributes; they have no identity.
- Use value objects to encapsulate concepts that do not require identity (e.g. Money, Address).
- Value objects must be created via constructors or static factory methods and must not expose setters.
- Always implement value equality (override Equals and GetHashCode).
- Value objects should be used to express business concepts and enforce invariants at construction.

#### Strongly Typed IDs
- Use strongly typed IDs (e.g. OrderId, CustomerId) instead of primitive types for entity and aggregate identifiers.
- Strongly typed IDs should be implemented as value objects.
- This approach prevents confusion and increases type safety across the domain.

#### Repositories
- Repositories are interfaces defined in the domain or application layer for accessing aggregates.
- Implement repositories only for aggregate roots, not for entities or value objects.
- Repositories should expose only business-relevant methods (e.g. `FindOrderByNumber`, `PlaceOrder`) and avoid CRUD-style methods (no Set, Create, Update, Delete, Get).
- The repository interface should use domain language and reflect business intent.
- Implementations of repositories belong in the infrastructure layer.

#### Business-Oriented Method Names
- Prefer business-oriented or intention-revealing names for methods in domain objects (e.g. `PlaceOrder`, `ActivateAccount`, `MarkAsShipped`).
- Avoid using generic CRUD method names (e.g. `Set`, `Create`, `Update`, `Delete`, `Get`) in domain or repository methods.
- The method name should reflect the business action or intent, not the technical operation.

## Best Practices
- Model your aggregates and entities to reflect real business concepts.
- Keep aggregates small and focused.
- Use value objects to encapsulate concepts with no identity.
- Raise domain events for significant business actions.
- Avoid using CRUD verbs (Create, Update, Delete, Get) in domain method names—prefer business-intent names (e.g., PlaceOrder, ActivateAccount).
- Encapsulate invariants and business rules within aggregates.
- Use repositories only for aggregate roots.
- Keep domain logic out of application and infrastructure layers.

## Method Naming
- Do not use generic CRUD method names like Set, Create, Update, Delete, or Get in domain or repository methods.
- Always use method names that reflect business intent and ubiquitous language (e.g. PlaceOrder, ActivateAccount, MarkAsShipped).

## Example Structure
```
src/
  [project].Domain/
    Order/
      Order.cs
      OrderLine.cs
      OrderPlacedEvent.cs
    Customer/
      Customer.cs
      Address.cs
```

## C# Example

```csharp
// Order aggregate root
public sealed class Order
{
    private readonly List<OrderLine> _orderLines = new();
    public OrderId Id { get; }
    public CustomerId? CustomerId { get; }
    public Address? ShippingAddress { get; }
    public IReadOnlyCollection<OrderLine> OrderLines => _orderLines.AsReadOnly();

    private Order(OrderId id, CustomerId? customerId, Address? shippingAddress)
    {
        Id = id;
        CustomerId = customerId;
        ShippingAddress = shippingAddress;
    }

    public static Order Create(OrderId id, CustomerId? customerId, Address? shippingAddress) => new Order(id, customerId, shippingAddress);

    public void RegisterOrderItem(ProductId productId, string productName, int quantity, decimal price)
    {
        if (quantity <= 0) throw new ArgumentException("Quantity must be greater than zero", nameof(quantity));
        if (string.IsNullOrWhiteSpace(productName)) throw new ArgumentException("Product name cannot be empty", nameof(productName));
        if (price <= 0) throw new ArgumentException("Price must be greater than zero", nameof(price));

        var orderLine = OrderLine.Create(productId, productName, quantity, price);
        // business rules...
        _orderLines.Add(orderLine);
    }

    public void ChangeShippingAddress(Address newAddress)
    {
        if (newAddress == null) throw new ArgumentNullException(nameof(newAddress));
        ShippingAddress = newAddress;
        // Event publishing logic...
        // Domain event: OrderShippingAddressChanged
        // Raise domain event... old address, new address
    }
}

// Value Object (as a record)
public sealed record Address(string Street, string City, string Country);
```

## Java Example

```java
// Order aggregate root
public final class Order {
    private final OrderId id;
    private final Address shippingAddress;
    private final List<OrderLine> orderLines = new ArrayList<>();

    private Order(OrderId id, Address shippingAddress) {
        this.id = id;
        this.shippingAddress = shippingAddress;
    }

    public static Order create(OrderId id, Address shippingAddress) {
        return new Order(id, shippingAddress);
    }

    public void registerOrderItem(OrderLine line) {
        // business rules...
        orderLines.add(line);
    }

    public List<OrderLine> getOrderLines() {
        return Collections.unmodifiableList(orderLines);
    }
}

// Value Object (as a record)
public record Address(String street, String city, String country) {}
```

# References
- Vernon, Vaughn. "Implementing Domain-Driven Design". Addison-Wesley, 2013.
- Evans, Eric. "Domain-Driven Design: Tackling Complexity in the Heart of Software". Addison-Wesley, 2003.
- [Domain-Driven Design](https://www.domainlanguage.com/ddd/)