namespace [ProjectName].Application.Shared;

/// <summary>
/// Dispatches queries to their registered handlers.
/// </summary>
public interface IQueryBus
{
    Task<TResult> SendAsync<TQuery, TResult>(TQuery query, CancellationToken cancellationToken = default);
}
