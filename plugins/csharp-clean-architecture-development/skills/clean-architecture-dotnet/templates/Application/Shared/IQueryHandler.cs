namespace [ProjectName].Application.Shared;

/// <summary>
/// Handler for queries (read operations).
/// </summary>
public interface IQueryHandler<in TQuery, TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken cancellationToken = default);
}
