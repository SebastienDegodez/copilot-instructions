---
applyTo: '**/*.Application/*.cs'
description: Guidelines for implementing Command objects and handlers in C# using CQRS and Clean Architecture
---

# Command Instruction Rule (CQRS, Clean Architecture, C#)

## Purpose
Define how to implement Command objects and handlers in a C# microservices architecture using Clean Architecture and CQRS, following Martin Fowler and Udi Dahan.

## Principles
- A Command represents an intention to perform a business action that changes state.
- Commands are explicit, intention-revealing, immutable after creation.
- Commands do not return data (except possibly a success/failure indicator or identifier).
- Commands are not reused for queries.

## Structure
- Place Command objects and handlers in `Application/Commands/`.
- **Prefer existing command interfaces from shared kernel or libraries** when available.
- Create custom command interfaces only when shared ones don't exist.
- Each Command must implement an `ICommand` interface, and each handler must implement an `ICommandHandler<TCommand>` interface.
- Use a dispatcher (e.g. `ICommandDispatcher`) to decouple sender and handler, but only if one is not already present in the SharedKernel or provided by a library/framework.

## Typical Folder Structure
```
Application/
  UseCases/
    PlaceOrderUseCase.cs
  Commands/
    PlaceOrderCommand.cs
    PlaceOrderCommandHandler.cs
  ICommandDispatcher.cs
```

## Example (C#)
```csharp
// Use existing interface from shared kernel if available
// Example: using SharedKernel.Commands.ICommand
// Otherwise, define locally:
public interface ICommand { }

// Command object (immutable)
public sealed class PlaceOrderCommand : ICommand
{
  public Guid CustomerId { get; }
  public IReadOnlyList<OrderItemDto> Items { get; }
  public AddressDto ShippingAddress { get; }
  public PlaceOrderCommand(Guid customerId, IReadOnlyList<OrderItemDto> items, AddressDto shippingAddress)
  {
    CustomerId = customerId;
    Items = items;
    ShippingAddress = shippingAddress;
  }
}

// Use existing handler interface from shared kernel if available
// Example: using SharedKernel.Commands.ICommandHandler<TCommand>
// Otherwise, define locally:
public interface ICommandHandler<TCommand> where TCommand : ICommand
{
  Task Handle(TCommand command, CancellationToken ct);
}

// Command handler
public sealed class PlaceOrderCommandHandler : ICommandHandler<PlaceOrderCommand>
{
  public Task Handle(PlaceOrderCommand command, CancellationToken ct)
  {
    // Business logic to place order
  }
}

// Dispatcher interface
public interface ICommandDispatcher
{
  Task Dispatch<TCommand>(TCommand command, CancellationToken ct) where TCommand : ICommand;
}
```

## Flow
1. API or UseCase creates a Command and sends it to ICommandDispatcher.
2. Dispatcher locates and invokes the correct handler.
3. Handler executes business logic and persists changes.

## Best Practices
- One Command per business action.
- No domain data returned from command handlers.
- Use intention-revealing names.
- **Use existing command interfaces from shared kernel or libraries when available.**
- Create custom interfaces only when shared ones don't exist or don't fit the requirements.
- Document commands with business references.

## References
- Martin Fowler, "Command Query Separation" https://martinfowler.com/bliki/CommandQuerySeparation.html
- Udi Dahan, "Clarified CQRS" https://udidahan.com/2009/12/09/clarified-cqrs/
