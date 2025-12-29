# CQRS Patterns for DDD

## Overview

CQRS (Command Query Responsibility Segregation) separates write operations (Commands) from read operations (Queries).

## Structure

```
[Project].Application/
  Orders/
    Commands/
      PlaceOrder/
        PlaceOrderCommand.cs
        PlaceOrderCommandHandler.cs
    Queries/
      GetOrder/
        GetOrderQuery.cs
        GetOrderQueryHandler.cs
```

## Commands

**Purpose**: Modify system state, trigger business logic

### Command Definition

```csharp
namespace MyProject.Application.Orders.Commands.PlaceOrder;

public sealed record PlaceOrderCommand(
    OrderId OrderId,
    CustomerId CustomerId,
    List<OrderLineDto> OrderLines,
    Address ShippingAddress
);

public sealed record OrderLineDto(
    ProductId ProductId,
    string ProductName,
    int Quantity,
    decimal Price
);
```

### Command Handler

```csharp
namespace MyProject.Application.Orders.Commands.PlaceOrder;

public sealed class PlaceOrderCommandHandler
{
    private readonly IOrderRepository _orderRepository;
    private readonly IInventoryService _inventoryService;

    public PlaceOrderCommandHandler(
        IOrderRepository orderRepository,
        IInventoryService inventoryService)
    {
        _orderRepository = orderRepository;
        _inventoryService = inventoryService;
    }

    public async Task<OrderId> Handle(
        PlaceOrderCommand command,
        CancellationToken cancellationToken = default)
    {
        // 1. Create Domain aggregate
        var order = Order.Create(
            command.OrderId,
            command.CustomerId,
            command.ShippingAddress
        );

        // 2. Apply business logic through Domain methods
        foreach (var line in command.OrderLines)
        {
            order.RegisterOrderItem(
                line.ProductId,
                line.ProductName,
                line.Quantity,
                line.Price
            );
        }

        // 3. Validate with external service if needed
        await _inventoryService.ReserveItems(order.OrderLines, cancellationToken);

        // 4. Persist through repository
        await _orderRepository.AddAsync(order, cancellationToken);

        return order.Id;
    }
}
```

### Key Points for Commands

- Accept primitive types or DTOs as parameters
- Create/load Domain aggregates
- Invoke Domain methods (business logic)
- Call Infrastructure services (mocked in tests)
- Return IDs or void
- No business logic in handler (only orchestration)

## Queries

**Purpose**: Read data without modifying state

### Query Definition

```csharp
namespace MyProject.Application.Orders.Queries.GetOrder;

public sealed record GetOrderQuery(OrderId OrderId);
```

### Query Handler

```csharp
namespace MyProject.Application.Orders.Queries.GetOrder;

public sealed class GetOrderQueryHandler
{
    private readonly IOrderRepository _orderRepository;

    public GetOrderQueryHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }

    public async Task<OrderViewModel?> Handle(
        GetOrderQuery query,
        CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(
            query.OrderId,
            cancellationToken
        );

        if (order is null)
            return null;

        return MapToViewModel(order);
    }

    private static OrderViewModel MapToViewModel(Order order)
    {
        return new OrderViewModel(
            order.Id,
            order.CustomerId,
            order.ShippingAddress,
            order.OrderLines.Select(l => new OrderLineViewModel(
                l.ProductId,
                l.ProductName,
                l.Quantity,
                l.Price
            )).ToList()
        );
    }
}
```

### Query ViewModels

```csharp
namespace MyProject.Application.Orders.Queries.GetOrder;

public sealed record OrderViewModel(
    OrderId Id,
    CustomerId CustomerId,
    Address ShippingAddress,
    List<OrderLineViewModel> OrderLines
);

public sealed record OrderLineViewModel(
    ProductId ProductId,
    string ProductName,
    int Quantity,
    decimal Price
);
```

### Key Points for Queries

- Read-only operations
- Return ViewModels, not Domain objects
- Simple mapping from Domain to ViewModel
- No business logic
- Can bypass Domain for performance (direct DB queries)

## Testing Commands vs Queries

### Command Tests (Sociable)

```csharp
[Fact]
public async Task WhenPlacingOrder_ShouldCreateOrderWithItems()
{
    // Arrange
    var orderRepository = A.Fake<IOrderRepository>();
    var inventoryService = A.Fake<IInventoryService>();
    var handler = new PlaceOrderCommandHandler(orderRepository, inventoryService);

    var command = new PlaceOrderCommand(
        OrderId.CreateNew(),
        CustomerId.CreateNew(),
        new List<OrderLineDto>
        {
            new(ProductId.CreateNew(), "Product 1", 2, 10.00m)
        },
        new Address("Street", "City", "Country")
    );

    // Act
    var orderId = await handler.Handle(command);

    // Assert
    A.CallTo(() => orderRepository.AddAsync(
        A<Order>.That.Matches(o =>
            o.Id == command.OrderId &&
            o.OrderLines.Count == 1 &&
            o.OrderLines.First().Quantity == 2
        ),
        A<CancellationToken>._
    )).MustHaveHappenedOnceExactly();
}
```

### Query Tests

```csharp
[Fact]
public async Task WhenGettingExistingOrder_ShouldReturnViewModel()
{
    // Arrange
    var orderId = OrderId.CreateNew();
    var order = Order.Create(
        orderId,
        CustomerId.CreateNew(),
        new Address("Street", "City", "Country")
    );

    var orderRepository = A.Fake<IOrderRepository>();
    A.CallTo(() => orderRepository.GetByIdAsync(orderId, A<CancellationToken>._))
        .Returns(order);

    var handler = new GetOrderQueryHandler(orderRepository);
    var query = new GetOrderQuery(orderId);

    // Act
    var result = await handler.Handle(query);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(orderId, result.Id);
}
```

## Best Practices

1. **One handler per command/query**
2. **Commands return IDs or void**
3. **Queries return ViewModels**
4. **Business logic stays in Domain**
5. **Handlers orchestrate, don't implement logic**
6. **Test handlers with real Domain objects**
7. **Mock only Infrastructure dependencies**
