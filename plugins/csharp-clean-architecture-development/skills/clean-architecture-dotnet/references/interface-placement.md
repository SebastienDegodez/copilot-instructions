# Interface Placement — Repository, Authorization, and Authentication

Where an interface lives depends on *who needs the contract*, not *where it is implemented*. Implementation is always in Infrastructure.

## Repository Interfaces

The placement depends on **whether you have a Domain aggregate or not**.

| Situation | Define in | Implement in | Reason |
|-----------|-----------|--------------|--------|
| Write repository for a Domain aggregate (`Order`, `Policy`) | **Domain** | Infrastructure | The aggregate defines its own persistence contract — Domain says "I need to be stored", Infrastructure says how |
| Write repository for a CRUD entity with no invariants (Pattern A) | **Application** | Infrastructure | No Domain aggregate exists — Application owns the use case and its data access contract |
| Read repository / query service (returns ViewModels) | **Application** | Infrastructure | No domain object involved; contract is an application concern |

> **Rule of thumb:** if the repository returns or persists a **Domain aggregate**, declare the interface in Domain. If the repository deals only with **plain data** (CRUD records, ViewModels), declare the interface in Application.

```csharp
// Domain/Orders/IOrderRepository.cs — write side for a Domain aggregate → defined in Domain
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct = default);
    Task AddAsync(Order order, CancellationToken ct = default);
}

// Application/Contacts/IContactRepository.cs — write side for a CRUD entity (no aggregate) → defined in Application
public interface IContactRepository
{
    Task AddAsync(Contact contact, CancellationToken ct = default);
    Task<Contact?> FindAsync(ContactId id, CancellationToken ct = default);
}

// Application/Orders/IOrderReadService.cs — read side, always defined in Application
public interface IOrderReadService
{
    Task<OrderViewModel?> GetByIdAsync(OrderId id, CancellationToken ct = default);
    Task<IReadOnlyList<OrderSummaryViewModel>> ListAsync(CancellationToken ct = default);
}

// Infrastructure implements all of them
public sealed class OrderRepository : IOrderRepository { ... }
public sealed class ContactRepository : IContactRepository { ... }
public sealed class OrderReadService : IOrderReadService { ... }
```

## Authorization — Domain, Application, or Infrastructure?

Authorization is **not a single concern** — it spans three layers depending on the nature of the rule.

| Type | Layer | Example | Deciding question |
|------|-------|---------|-------------------|
| **Technical access control** (authentication, role gate) | **Infrastructure** (middleware) | `[Authorize(Roles = "Admin")]`, JWT validation | "Is the token valid? Does the user have this role?" — no business logic, pure technical filter |
| **Use case policy** (can this user access/perform this action?) | **Application** | "Only a Manager can approve a quote"; "Only the portfolio owner can consult a contract" | "Is this user allowed to invoke this use case or access this resource?" — a policy that combines user context + resource/action |
| **Domain invariant** (the object protects its own state) | **Domain** | `order.Cancel(userId)` throws if `userId != OwnerId` | "Does this **mutation** violate the object's business rules?" — the aggregate enforces its own integrity |

> **Key distinction:** if the rule protects **the object's state during a mutation** (invariant), it belongs in Domain. If the rule gates **access** to a use case or a read operation, it belongs in Application. If it's a technical gate (token, role), it belongs in Infrastructure.

**Read vs Write — where does the check go?**

| Operation | Rule type | Layer | Why |
|-----------|-----------|-------|-----|
| Get an order (read) | "Only the order owner can view" | **Application** | No mutation, no invariant — the order object itself doesn't "know" who is looking at it; the use case enforces visibility |
| Cancel an order (write) | "Only the owner can cancel" | **Domain** | The aggregate protects its own state transition: `order.Cancel(userId)` throws if not owner |

```csharp
// Application — READ access policy: "only the order owner can view" is a use case concern
public sealed class GetOrderUseCase
{
    private readonly IOrderReadService _orders;
    private readonly ICurrentUser _currentUser;

    public GetOrderUseCase(IOrderReadService orders, ICurrentUser currentUser)
    {
        _orders = orders;
        _currentUser = currentUser;
    }

    public async Task<OrderViewModel> GetAsync(OrderId id, CancellationToken ct)
    {
        var order = await _orders.GetByIdAsync(id, ct)
            ?? throw new NotFoundException();

        // USE CASE POLICY — read access gated by ownership
        if (order.OwnerId != _currentUser.Id)
            throw new ForbiddenException("Order not accessible");

        return order;
    }
}
```

> **Why not `GetByIdAndOwnerAsync(id, ownerId)`?**
> Filtering by owner inside the query loses the distinction between *not found* (404) and *forbidden* (403) — a `null` result can't tell you which case it is. More importantly, the access rule belongs in the use case, not in `IOrderReadService`. A neutral `GetByIdAsync` stays reusable: an admin use case can call the same method without modifying the interface.
>
> **Exception for large lists:** when querying collections at high volume, loading all records then filtering in memory is unacceptable. In that case, add a dedicated method on the read service (`ListByOwnerAsync(ownerId)`) — but the *decision* to call it remains in the use case, not inside the repository implementation.

```csharp
// Domain — WRITE invariant: "only the owner can cancel" is the aggregate's job
public sealed class Order : AggregateRoot
{
    public UserId OwnerId { get; }

    public void Cancel(UserId requestedBy)
    {
        if (requestedBy != OwnerId)
            throw new DomainException("Only the owner can cancel this order");   // ← DOMAIN invariant (mutation)

        // ... state transition
    }
}
```

## Authentication / User Context Interfaces

`ICurrentUser` resolves *who is calling*. It is always defined in **Application** and implemented in **Infrastructure**.

| Interface | Define in | Implement in | When |
|-----------|-----------|--------------|------|
| `ICurrentUser` / `IUserContext` (who is calling?) | **Application** | **Infrastructure** | Use cases need the caller's identity for authorization policies |

```csharp
// Application/Shared/ICurrentUser.cs — defined in Application
public interface ICurrentUser
{
    UserId Id { get; }
    bool IsAuthenticated { get; }
}

// Infrastructure/Auth/CurrentUserFromHttpContext.cs — reads from HttpContext / JWT
public sealed class CurrentUserFromHttpContext : ICurrentUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserFromHttpContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public UserId Id => new(Guid.Parse(_httpContextAccessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!));
    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}
```

## Putting It All Together — CancelOrder Example

```csharp
// Application/Orders/CancelOrderUseCase.cs — Application checks use-case-level policy, then delegates to Domain
public sealed class CancelOrderUseCase
{
    private readonly IOrderRepository _orders;
    private readonly ICurrentUser _currentUser;    // Application resolves the caller

    public CancelOrderUseCase(IOrderRepository orders, ICurrentUser currentUser)
    {
        _orders = orders;
        _currentUser = currentUser;
    }

    public async Task CancelAsync(OrderId id, CancellationToken ct)
    {
        var order = await _orders.GetByIdAsync(id, ct) ?? throw new NotFoundException();

        // Domain enforces the INVARIANT: only the owner can cancel
        // Application passes UserId as typed value — Domain never sees ICurrentUser
        order.Cancel(_currentUser.Id);

        await _orders.SaveAsync(ct);
    }
}

// Domain/Orders/Order.cs — aggregate protects its own state
public sealed class Order : AggregateRoot
{
    public UserId OwnerId { get; }

    public void Cancel(UserId requestedBy)
    {
        if (requestedBy != OwnerId)
            throw new DomainException("Only the owner can cancel this order");    // ← DOMAIN invariant

        // ... state transition
    }
}
```

**Rules:**
- `ICurrentUser` is **never** in Domain — Domain must not depend on the HTTP request lifecycle. Domain must be testable in complete isolation without any web framework.
- Domain aggregates receive `UserId` as a **value parameter** (passed from Application), not `ICurrentUser` directly. Application is responsible for resolving the caller and passing only the typed ID.
- **Authentication** (is the token valid?) → Infrastructure / middleware.
- **Use case policy** (can this user call this use case?) → Application.
- **Domain invariant** (does this state change violate the object's rules?) → Domain.
