using Microsoft.Extensions.DependencyInjection;
using [ProjectName].Application.Shared;

namespace [ProjectName].Infrastructure.CQRS;

/// <summary>
/// Default implementation of query bus using DI to resolve handlers.
/// </summary>
public sealed class QueryBus : IQueryBus
{
    private readonly IServiceProvider _serviceProvider;

    public QueryBus(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<TResult> SendAsync<TQuery, TResult>(TQuery query, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);
        var handler = _serviceProvider.GetRequiredService<IQueryHandler<TQuery, TResult>>();
        return await handler.HandleAsync(query, cancellationToken);
    }
}
