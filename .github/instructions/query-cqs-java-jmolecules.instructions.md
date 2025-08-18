---
applyTo: '**/*.java'
description: Guidelines for implementing Query objects and handlers in Java using CQS, Spring Boot, and jmolecules, following Clean Architecture principles.
---

# Query CQS Java (Spring Boot + jmolecules) Instruction Rule

## Applicability
This rule applies **only if the project already includes jmolecules as a dependency**. If jmolecules is not present, ask the user for confirmation before applying these rules or suggesting jmolecules usage.

## Purpose
These rules define how to implement **Query** objects and their handlers in a Java/Spring Boot project using the [jmolecules](https://github.com/xmolecules/jmolecules) library, following the Command Query Separation (CQS) pattern and Clean Architecture principles.

## Structure
- **Query objects** represent a request for data (read-only, no side effects).
- **Query handlers** process queries and return results.
- Use jmolecules annotations (`@Query`, `@QueryHandler`) to mark queries and handlers.
- Place queries and handlers in the `application` layer (e.g., `src/main/java/com/example/app/application/feature/`).
- The domain layer must not depend on queries or handlers.
- Use interfaces for handler contracts; implementations can be Spring beans.

## Modeling Guidelines

### Query Object
- A query is a simple, immutable data structure (record or class) describing what data is requested.
- Annotate with `@Query` (jmolecules).
- No business logic or side effects.
- Example:

```java
import org.jmolecules.architecture.cqs.Query;

@Query
public record FindOrderByIdQuery(Long orderId) {}
```

### Query Handler
- Handles a specific query and returns a result.
- Annotate with `@QueryHandler` (jmolecules).
- Implement as a Spring `@Component` or `@Service`.
- Should depend only on repositories, domain services, or other application services.
- No side effects (read-only operations).
- Example:

```java
import org.jmolecules.architecture.cqs.QueryHandler;
import org.springframework.stereotype.Service;

@Service
public class FindOrderByIdHandler {
    private final OrderRepository orderRepository;

    public FindOrderByIdHandler(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @QueryHandler
    public OrderDto handle(FindOrderByIdQuery query) {
        // Fetch and map to DTO
        return orderRepository.findById(query.orderId())
            .map(OrderDto::from)
            .orElseThrow(() -> new NotFoundException("Order not found"));
    }
}
```

## Best Practices
- Queries must not mutate state.
- Handlers should be single-responsibility and intention-revealing.
- Use DTOs for results, not domain entities.
- Keep queries and handlers decoupled from infrastructure (except for dependency injection).
- Use constructor injection for dependencies.
- Name queries and handlers according to business language (e.g., `FindOrderByIdQuery`, `FindOrderByIdHandler`).

## References
- [jmolecules CQS documentation](https://github.com/xmolecules/jmolecules#command-query-separation-cqs)
- [Clean Architecture](https://8thlight.com/blog/uncle-bob/2012/08/13/the-clean-architecture.html)
- [CQS Pattern](https://martinfowler.com/bliki/CommandQuerySeparation.html)
- [Advancing Enterprise DDD (blog)](https://scabl.blogspot.com/p/advancing-enterprise-ddd.html)