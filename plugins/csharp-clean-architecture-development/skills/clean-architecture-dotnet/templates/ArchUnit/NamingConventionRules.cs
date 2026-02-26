using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace [ProjectName].ArchitectureTests.ArchUnit;

/// <summary>
/// Naming convention rules for Clean Architecture CQRS pattern.
/// Ensures consistent naming for discovery and maintainability.
/// </summary>
public static class NamingConventionRules
{
    private static readonly Architecture Architecture = new ArchLoader()
        .LoadAssemblies(
            typeof([ProjectName].Domain.IDomainMarker).Assembly,
            typeof([ProjectName].Application.IApplicationMarker).Assembly
        )
        .Build();

    /// <summary>
    /// ViewModels (DTOs for frontend) should end with "ViewModel" suffix.
    /// NOT "Dto" - ViewModel is more expressive for frontend data.
    /// </summary>
    public static void ViewModelsShouldEndWithViewModel()
    {
        var rule = Classes()
            .That().ResideInNamespace("[ProjectName].Application.*", useRegularExpressions: true)
            .And().AreAssignableTo(".*ViewModel$", useRegularExpressions: true)
            .Should().HaveNameMatching(".*ViewModel$", useRegularExpressions: true)
            .Because("Frontend DTOs should be named *ViewModel for clarity");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Command handlers must end with "CommandHandler" suffix.
    /// Required for convention-based discovery in Infrastructure.
    /// </summary>
    public static void CommandHandlersShouldEndWithCommandHandler()
    {
        var rule = Classes()
            .That().ImplementInterface("ICommandHandler`1", useRegularExpressions: true)
            .OrShould().ImplementInterface("ICommandHandler`2", useRegularExpressions: true)
            .Should().HaveNameMatching(".*CommandHandler$", useRegularExpressions: true)
            .Because("Command handlers must end with 'CommandHandler' for convention-based discovery");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Query handlers must end with "QueryHandler" suffix.
    /// Required for convention-based discovery in Infrastructure.
    /// </summary>
    public static void QueryHandlersShouldEndWithQueryHandler()
    {
        var rule = Classes()
            .That().ImplementInterface("IQueryHandler`2", useRegularExpressions: true)
            .Should().HaveNameMatching(".*QueryHandler$", useRegularExpressions: true)
            .Because("Query handlers must end with 'QueryHandler' for convention-based discovery");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Commands should end with "Command" suffix.
    /// </summary>
    public static void CommandsShouldEndWithCommand()
    {
        var rule = Classes()
            .That().ResideInNamespace("[ProjectName].Application.*.Commands.*", useRegularExpressions: true)
            .And().AreNotNested()
            .Should().HaveNameMatching(".*Command$", useRegularExpressions: true)
            .Because("Commands should end with 'Command' for clarity");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Queries should end with "Query" suffix.
    /// </summary>
    public static void QueriesShouldEndWithQuery()
    {
        var rule = Classes()
            .That().ResideInNamespace("[ProjectName].Application.*.Queries.*", useRegularExpressions: true)
            .And().AreNotNested()
            .Should().HaveNameMatching(".*Query$", useRegularExpressions: true)
            .Because("Queries should end with 'Query' for clarity");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Domain aggregates should NOT have "Aggregate" suffix.
    /// Just the entity name (e.g., Order, Customer, not OrderAggregate).
    /// </summary>
    public static void AggregatesShouldNotHaveAggregateSuffix()
    {
        var rule = Classes()
            .That().ResideInNamespace("[ProjectName].Domain.*", useRegularExpressions: true)
            .Should().NotHaveNameMatching(".*Aggregate$", useRegularExpressions: true)
            .Because("Aggregates should use business names without 'Aggregate' suffix (e.g., Order, not OrderAggregate)");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Repository interfaces should end with "Repository" suffix.
    /// </summary>
    public static void RepositoryInterfacesShouldEndWithRepository()
    {
        var rule = Interfaces()
            .That().ResideInNamespace("[ProjectName].Domain.*", useRegularExpressions: true)
            .And().HaveNameMatching(".*Repository$", useRegularExpressions: true)
            .Should().HaveNameMatching("I.*Repository$", useRegularExpressions: true)
            .Because("Repository interfaces should be named I*Repository");

        rule.Check(Architecture);
    }
}
