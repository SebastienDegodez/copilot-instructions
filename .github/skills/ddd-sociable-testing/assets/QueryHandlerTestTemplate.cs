using System.Collections.Generic;
using Xunit;
using FakeItEasy;

namespace MyProject.UnitTests.Application.Orders.Queries;

/// <summary>
/// Template for testing Query Handlers.
/// 
/// Key points:
/// - Mock only Infrastructure dependencies (repositories)
/// - Set up test data with real Domain objects
/// - Return ViewModels, never Domain objects
/// - Focus on mapping correctness
/// </summary>
public sealed class QueryHandlerTests
{
    [Fact]
    public async Task WhenQueryingExistingData_ShouldReturnViewModel()
    {
        // Arrange - Create real Domain object for setup
        var aggregate = Aggregate.Create(/* parameters */);
        // ... configure aggregate state ...

        var repository = A.Fake<IRepository>();
        A.CallTo(() => repository.GetByIdAsync(aggregate.Id, A<CancellationToken>._))
            .Returns(aggregate);

        var handler = new QueryHandler(repository);
        var query = new Query(aggregate.Id);

        // Act
        var result = await handler.Handle(query);

        // Assert - Verify ViewModel mapping
        Assert.NotNull(result);
        Assert.Equal(aggregate.Id, result.Id);
        Assert.Equal(aggregate.SomeProperty, result.SomeProperty);
    }

    [Fact]
    public async Task WhenQueryingNonExistingData_ShouldReturnNull()
    {
        // Arrange
        var repository = A.Fake<IRepository>();
        A.CallTo(() => repository.GetByIdAsync(A<Id>._, A<CancellationToken>._))
            .Returns(Task.FromResult<Aggregate?>(null));

        var handler = new QueryHandler(repository);
        var query = new Query(Id.CreateNew());

        // Act
        var result = await handler.Handle(query);

        // Assert
        Assert.Null(result);
    }
}
