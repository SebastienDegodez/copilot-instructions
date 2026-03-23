# Project Structure Best Practices

## Domain Layer

```
Domain/
  IDomainMarker.cs
  Orders/
    Order.cs                    ← Aggregate root
    OrderLine.cs                ← Entity (owned by Order)
    OrderStatus.cs              ← Enum/Value Object
    OrderId.cs                  ← Strongly typed ID
    IOrderRepository.cs         ← Repository interface (NO implementation)
  Shared/
    DomainException.cs
    ValueObject.cs
```

**Rules:**
- No EF Core, no System.Data, no HTTP
- Interfaces only (implementations in Infrastructure)
- Business logic lives here

---

## Application Layer

```
Application/
  IApplicationMarker.cs
  Shared/
    ICommandHandler.cs
    IQueryHandler.cs
  Features/
    PlaceOrder/
      PlaceOrderCommand.cs
      PlaceOrderCommandHandler.cs
    GetOrder/
      GetOrderQuery.cs
      GetOrderQueryHandler.cs
      OrderViewModel.cs
```

**Rules:**
- References Domain only
- No Infrastructure implementations
- Orchestrates use cases

---

## Infrastructure Layer

```
Infrastructure/
  IInfrastructureMarker.cs
  Persistence/
    OrderingDbContext.cs
    Repositories/
      OrderRepository.cs        ← Implements IOrderRepository
  Services/
    InventoryService.cs         ← Implements IInventoryService
  DependencyInjection.cs        ← Convention-based DI registration
```

**Rules:**
- Implements interfaces from Domain/Application
- References EF Core, HTTP clients, etc.
- Registers handlers via convention

---

## API Layer

```
Api/
  IApiMarker.cs
  Orders/
    OrdersEndpoints.cs          ← Minimal API endpoints
  Program.cs
```

**Rules:**
- Does NOT reference Application assembly
- Injects `ICommandHandler<>` / `IQueryHandler<>`
- Infrastructure resolves handlers
