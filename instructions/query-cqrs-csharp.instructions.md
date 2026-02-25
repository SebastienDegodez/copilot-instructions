---
applyTo: '**/*.Application/*.cs'
description: Guidelines for implementing Query objects and handlers in C# using CQRS and Clean Architecture
---

# Query Instruction Rule (CQRS, Clean Architecture, C#)

## Purpose
Define how to implement Query objects and handlers in a C# microservices architecture using Clean Architecture and CQRS, following Martin Fowler and Udi Dahan.

## Principles
- A Query represents a read-only business request (no state change).
- Queries are explicit, intention-revealing, immutable after creation.
- Queries return data relevant to the business use case.
- Queries are not reused for commands.

## Structure
- Place Query objects and handlers in `Application/Queries/`.
- **Prefer existing query interfaces from shared kernel or libraries** when available.
- Create custom query interfaces only when shared ones don't exist.
- Each Query must implement an `IQuery<TResult>` interface, and each handler must implement an `IQueryHandler<TQuery, TResult>` interface.
- Use a dispatcher (e.g. `IQueryDispatcher`) to decouple sender and handler, but only if one is not already present in the SharedKernel or provided by a library/framework.

## Typical Folder Structure
```
Application/
  [feature]/
    GetOrderDetailsUseCase.cs
  Queries/
    GetOrderDetailsQuery.cs
    GetOrderDetailsQueryHandler.cs
  IQueryDispatcher.cs
```

## Example (C#)
```csharp
// Use existing interface from shared kernel if available
// Example: using SharedKernel.Queries.IQuery<TResult>
// Otherwise, define locally:
public interface IQuery<TResult> { }

// Query object (immutable)
public sealed class GetOrderDetailsQuery : IQuery<OrderDetailsDto>
{
  public Guid OrderId { get; }
  public GetOrderDetailsQuery(Guid orderId) => OrderId = orderId;
}

// Use existing handler interface from shared kernel if available
// Example: using SharedKernel.Queries.IQueryHandler<TQuery, TResult>
// Otherwise, define locally:
public interface IQueryHandler<TQuery, TResult> where TQuery : IQuery<TResult>
{
  Task<TResult> Handle(TQuery query, CancellationToken ct);
}

// Query handler
public sealed class GetOrderDetailsQueryHandler : IQueryHandler<GetOrderDetailsQuery, OrderDetailsDto>
{
  public Task<OrderDetailsDto> Handle(GetOrderDetailsQuery query, CancellationToken ct)
  {
    // Data retrieval logic
  }
}

// Dispatcher interface
public interface IQueryDispatcher
{
  Task<TResult> Dispatch<TQuery, TResult>(TQuery query, CancellationToken ct) where TQuery : IQuery<TResult>;
}
```

## Flow
1. API or UseCase creates a Query and sends it to IQueryDispatcher.
2. Dispatcher locates and invokes the correct handler.
3. Handler retrieves data and returns result.

## Best Practices
- One Query per business use case.
- No state change in query handlers.
- Use intention-revealing names.
- **Use existing query interfaces from shared kernel or libraries when available.**
- Create custom interfaces only when shared ones don't exist or don't fit the requirements.
- Document queries with business references.

## References
- Martin Fowler, "Command Query Separation" https://martinfowler.com/bliki/CommandQuerySeparation.html
- Udi Dahan, "Clarified CQRS" https://udidahan.com/2009/12/09/clarified-cqrs/
