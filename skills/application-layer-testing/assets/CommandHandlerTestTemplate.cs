using System.Collections.Generic;
using Xunit;
using FakeItEasy;

namespace MyProject.UnitTests.Application.Orders.Commands;

/// <summary>
/// Template for testing Command Handlers with sociable testing approach.
/// 
/// Key points:
/// - Mock only Infrastructure dependencies (repositories, external services)
/// - Use real Domain objects (aggregates, entities, value objects)
/// - Verify both Infrastructure calls and Domain state changes
/// - Test business rules through actual Domain methods
/// </summary>
public sealed class CommandHandlerTests
{
    [Fact]
    public async Task WhenExecutingValidCommand_ShouldSucceed()
    {
        // Arrange - Mock Infrastructure only
        var repository = A.Fake<IRepository>();
        var externalService = A.Fake<IExternalService>();
        var handler = new CommandHandler(repository, externalService);

        var command = new Command(/* parameters */);

        // Act - Use real Domain objects internally
        var result = await handler.Handle(command);

        // Assert - Verify Infrastructure calls with Domain state
        A.CallTo(() => repository.AddAsync(
            A<Aggregate>.That.Matches(agg =>
                agg.Id == command.Id &&
                agg.SomeProperty == expectedValue
            ),
            A<CancellationToken>._
        )).MustHaveHappenedOnceExactly();
    }

    [Fact]
    public async Task WhenExecutingInvalidCommand_ShouldThrowDomainException()
    {
        // Arrange
        var repository = A.Fake<IRepository>();
        var externalService = A.Fake<IExternalService>();
        var handler = new CommandHandler(repository, externalService);

        var invalidCommand = new Command(/* invalid parameters */);

        // Act & Assert - Domain validation triggers
        await Assert.ThrowsAsync<DomainException>(
            () => handler.Handle(invalidCommand)
        );

        // Verify Infrastructure not called on validation failure
        A.CallTo(() => repository.AddAsync(A<Aggregate>._, A<CancellationToken>._))
            .MustNotHaveHappened();
    }
}
