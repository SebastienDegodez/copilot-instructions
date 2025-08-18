---
applyTo: '**/*.java'
description: Guidelines for implementing Command objects and handlers in Java using CQS, Spring Boot, and jmolecules, following Clean Architecture principles.
---

# Command CQS Java (Spring Boot + jmolecules) Instruction Rule

## Applicability
This rule applies **only if the project already includes jmolecules as a dependency**. If jmolecules is not present, ask the user for confirmation before applying these rules or suggesting jmolecules usage.

## Purpose
These rules define how to implement **Command** objects and their handlers in a Java/Spring Boot project using the [jmolecules](https://github.com/xmolecules/jmolecules) library, following the Command Query Separation (CQS) pattern and Clean Architecture principles.

## Structure
- **Command objects** represent a request to perform an action (write operation, may have side effects).
- **Command handlers** process commands and return results (or void).
- Use jmolecules annotations (`@Command`, `@CommandHandler`) to mark commands and handlers.
- Place commands and handlers in the `application` layer (e.g., `src/main/java/com/example/app/application/feature/`).
- The domain layer must not depend on commands or handlers.
- Use interfaces for handler contracts; implementations can be Spring beans.

## Modeling Guidelines

### Command Object
- A command is a simple, immutable data structure (record or class) describing the action to perform.
- Annotate with `@Command` (jmolecules).
- No business logic or side effects in the command itself.
- Example:

```java
import org.jmolecules.architecture.cqs.Command;

@Command
public record PlaceOrderCommand(Long customerId, List<Long> productIds) {}
```

### Command Handler
- Handles a specific command and performs the requested action.
- Annotate with `@CommandHandler` (jmolecules).
- Implement as a Spring `@Component` or `@Service`.
- Should depend only on repositories, domain services, or other application services.
- May have side effects (write operations).
- Example:

```java
import org.jmolecules.architecture.cqs.CommandHandler;
import org.springframework.stereotype.Service;

@Service
public class PlaceOrderHandler {
    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;

    public PlaceOrderHandler(OrderRepository orderRepository, CustomerRepository customerRepository) {
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
    }

    @CommandHandler
    public OrderDto handle(PlaceOrderCommand command) {
        // Business logic to place order
        // ...
        return new OrderDto(/* ... */);
    }
}
```

## Best Practices
- Commands should represent business intent, not technical operations.
- Handlers should be single-responsibility and intention-revealing.
- Use DTOs for results, not domain entities.
- Keep commands and handlers decoupled from infrastructure (except for dependency injection).
- Use constructor injection for dependencies.
- Name commands and handlers according to business language (e.g., `PlaceOrderCommand`, `PlaceOrderHandler`).

## References
- [jmolecules CQS documentation](https://github.com/xmolecules/jmolecules#command-query-separation-cqs)
- [Clean Architecture](https://8thlight.com/blog/uncle-bob/2012/08/13/the-clean-architecture.html)
- [CQS Pattern](https://martinfowler.com/bliki/CommandQuerySeparation.html)
- [Advancing Enterprise DDD (blog)](https://scabl.blogspot.com/p/advancing-enterprise-ddd.html)
