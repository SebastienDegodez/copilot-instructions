# Test Examples: Sociable Testing in Practice

## Example 1: Command Handler with Business Logic

### Domain: Order Aggregate

```csharp
namespace MyProject.Domain.Orders;

public sealed class Order
{
    private readonly List<OrderLine> _orderLines = new();
    
    public OrderId Id { get; }
    public CustomerId CustomerId { get; }
    public Address ShippingAddress { get; private set; }
    public OrderStatus Status { get; private set; }
    public IReadOnlyCollection<OrderLine> OrderLines => _orderLines.AsReadOnly();

    private Order(OrderId id, CustomerId customerId, Address shippingAddress)
    {
        Id = id;
        CustomerId = customerId;
        ShippingAddress = shippingAddress;
        Status = OrderStatus.Draft;
    }

    public static Order Create(OrderId id, CustomerId customerId, Address shippingAddress)
    {
        if (shippingAddress is null)
            throw new ArgumentNullException(nameof(shippingAddress));
            
        return new Order(id, customerId, shippingAddress);
    }

    public void RegisterOrderItem(ProductId productId, string productName, int quantity, decimal price)
    {
        if (quantity <= 0)
            throw new DomainException("Quantity must be greater than zero");
        if (price <= 0)
            throw new DomainException("Price must be greater than zero");
        if (string.IsNullOrWhiteSpace(productName))
            throw new DomainException("Product name cannot be empty");

        var orderLine = OrderLine.Create(productId, productName, quantity, price);
        _orderLines.Add(orderLine);
    }

    public void Confirm()
    {
        if (!_orderLines.Any())
            throw new DomainException("Cannot confirm order without items");
            
        Status = OrderStatus.Confirmed;
    }
}
```

### Application: Command Handler

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
        // Create real Domain aggregate
        var order = Order.Create(
            command.OrderId,
            command.CustomerId,
            command.ShippingAddress
        );

        // Register items (Domain business logic)
        foreach (var line in command.OrderLines)
        {
            order.RegisterOrderItem(
                line.ProductId,
                line.ProductName,
                line.Quantity,
                line.Price
            );
        }

        // Confirm order (Domain business logic)
        order.Confirm();

        // Check inventory (Infrastructure - mocked in tests)
        await _inventoryService.ReserveItems(order.OrderLines, cancellationToken);

        // Persist (Infrastructure - mocked in tests)
        await _orderRepository.AddAsync(order, cancellationToken);

        return order.Id;
    }
}
```

### Test: Sociable Test for Command Handler

```csharp
namespace MyProject.UnitTests.Application.Orders.Commands;

public sealed class PlaceOrderCommandHandlerTests
{
    [Fact]
    public async Task WhenPlacingValidOrder_ShouldCreateConfirmedOrderWithItems()
    {
        // Arrange - Mock only Infrastructure
        var orderRepository = A.Fake<IOrderRepository>();
        var inventoryService = A.Fake<IInventoryService>();
        var handler = new PlaceOrderCommandHandler(orderRepository, inventoryService);

        var orderId = OrderId.CreateNew();
        var customerId = CustomerId.CreateNew();
        var command = new PlaceOrderCommand(
            orderId,
            customerId,
            new List<OrderLineDto>
            {
                new(ProductId.CreateNew(), "Product A", 2, 10.00m),
                new(ProductId.CreateNew(), "Product B", 1, 25.00m)
            },
            new Address("123 Main St", "City", "Country")
        );

        // Act - Use real Domain objects
        var resultOrderId = await handler.Handle(command);

        // Assert - Verify Infrastructure calls and Domain state
        Assert.Equal(orderId, resultOrderId);

        A.CallTo(() => inventoryService.ReserveItems(
            A<IReadOnlyCollection<OrderLine>>._,
            A<CancellationToken>._
        )).MustHaveHappenedOnceExactly();

        A.CallTo(() => orderRepository.AddAsync(
            A<Order>.That.Matches(o =>
                o.Id == orderId &&
                o.CustomerId == customerId &&
                o.Status == OrderStatus.Confirmed &&
                o.OrderLines.Count == 2 &&
                o.OrderLines.First().Quantity == 2
            ),
            A<CancellationToken>._
        )).MustHaveHappenedOnceExactly();
    }

    [Fact]
    public async Task WhenPlacingOrderWithInvalidQuantity_ShouldThrowDomainException()
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
                new(ProductId.CreateNew(), "Product A", -1, 10.00m) // Invalid quantity
            },
            new Address("123 Main St", "City", "Country")
        );

        // Act & Assert - Domain validation triggers exception
        await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command));

        // Verify infrastructure was never called
        A.CallTo(() => orderRepository.AddAsync(A<Order>._, A<CancellationToken>._))
            .MustNotHaveHappened();
    }

    [Fact]
    public async Task WhenPlacingOrderWithoutItems_ShouldThrowDomainException()
    {
        // Arrange
        var orderRepository = A.Fake<IOrderRepository>();
        var inventoryService = A.Fake<IInventoryService>();
        var handler = new PlaceOrderCommandHandler(orderRepository, inventoryService);

        var command = new PlaceOrderCommand(
            OrderId.CreateNew(),
            CustomerId.CreateNew(),
            new List<OrderLineDto>(), // Empty items
            new Address("123 Main St", "City", "Country")
        );

        // Act & Assert - Domain business rule enforced
        await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command));
    }
}
```

## Example 2: Query Handler Test

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
        var order = await _orderRepository.GetByIdAsync(query.OrderId, cancellationToken);

        if (order is null)
            return null;

        return new OrderViewModel(
            order.Id,
            order.CustomerId,
            order.Status,
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

### Query Test

```csharp
namespace MyProject.UnitTests.Application.Orders.Queries;

public sealed class GetOrderQueryHandlerTests
{
    [Fact]
    public async Task WhenGettingExistingOrder_ShouldReturnCorrectViewModel()
    {
        // Arrange
        var orderId = OrderId.CreateNew();
        var customerId = CustomerId.CreateNew();
        
        // Create real Domain object for test setup
        var order = Order.Create(
            orderId,
            customerId,
            new Address("123 Main St", "City", "Country")
        );
        order.RegisterOrderItem(
            ProductId.CreateNew(),
            "Product A",
            2,
            10.00m
        );
        order.Confirm();

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
        Assert.Equal(customerId, result.CustomerId);
        Assert.Equal(OrderStatus.Confirmed, result.Status);
        Assert.Single(result.OrderLines);
        Assert.Equal(2, result.OrderLines.First().Quantity);
    }

    [Fact]
    public async Task WhenGettingNonExistingOrder_ShouldReturnNull()
    {
        // Arrange
        var orderId = OrderId.CreateNew();
        var orderRepository = A.Fake<IOrderRepository>();
        A.CallTo(() => orderRepository.GetByIdAsync(orderId, A<CancellationToken>._))
            .Returns(Task.FromResult<Order?>(null));

        var handler = new GetOrderQueryHandler(orderRepository);
        var query = new GetOrderQuery(orderId);

        // Act
        var result = await handler.Handle(query);

        // Assert
        Assert.Null(result);
    }
}
```

## Key Patterns

### ✅ DO: Use Real Domain Objects

```csharp
// Create real aggregates
var order = Order.Create(orderId, customerId, address);

// Invoke real Domain methods
order.RegisterOrderItem(productId, name, quantity, price);
order.Confirm();

// Verify Domain state
Assert.Equal(OrderStatus.Confirmed, order.Status);
```

### ❌ DON'T: Mock Domain Objects

```csharp
// ❌ Bad: Mocking Domain behavior
var fakeOrder = A.Fake<Order>();
A.CallTo(() => fakeOrder.RegisterOrderItem(...)).DoesNothing();
```

### ✅ DO: Mock Infrastructure

```csharp
// Mock repositories
var orderRepository = A.Fake<IOrderRepository>();
A.CallTo(() => orderRepository.AddAsync(...)).Returns(Task.CompletedTask);

// Mock external services
var inventoryService = A.Fake<IInventoryService>();
A.CallTo(() => inventoryService.ReserveItems(...)).Returns(Task.CompletedTask);
```

### ✅ DO: Verify Infrastructure Calls

```csharp
// Verify repository was called correctly
A.CallTo(() => orderRepository.AddAsync(
    A<Order>.That.Matches(o => 
        o.Id == expectedId &&
        o.Status == OrderStatus.Confirmed
    ),
    A<CancellationToken>._
)).MustHaveHappenedOnceExactly();
```

### ✅ DO: Test Domain Validation

```csharp
// Domain validation throws exception
await Assert.ThrowsAsync<DomainException>(
    () => handler.Handle(invalidCommand)
);
```

## Benefits Demonstrated

1. **Real behavior**: Tests verify actual Domain logic
2. **Fast**: No external dependencies (< 100ms)
3. **Maintainable**: Tests focus on behavior, not implementation
4. **Refactoring-safe**: Changes to Domain structure don't break tests
5. **Clear intent**: Tests show how Domain and Application collaborate
