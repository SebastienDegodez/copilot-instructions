using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace [ProjectName].ArchitectureTests.ArchUnit;

/// <summary>
/// Architecture rules for the Application layer.
/// Ensures Application only depends on Domain and contains use case orchestration.
/// </summary>
public static class ApplicationLayerRules
{
    private static readonly Architecture Architecture = new ArchLoader()
        .LoadAssemblies(
            typeof([ProjectName].Domain.IDomainMarker).Assembly,
            typeof([ProjectName].Application.IApplicationMarker).Assembly
        )
        .Build();

    private static IObjectProvider<IType> ApplicationLayer =>
        Types().That().ResideInNamespace("[ProjectName].Application.*", useRegularExpressions: true).As("Application Layer");

    /// <summary>
    /// Application should only depend on Domain layer.
    /// No dependencies on Infrastructure or API.
    /// </summary>
    public static void ShouldOnlyDependOnDomain()
    {
        var rule = Types()
            .That().Are(ApplicationLayer)
            .Should().NotDependOnAny(
                Types().That().ResideInNamespace("[ProjectName].Infrastructure.*", useRegularExpressions: true))
            .AndShould().NotDependOnAny(
                Types().That().ResideInNamespace("[ProjectName].Api.*", useRegularExpressions: true))
            .Because("Application layer should only depend on Domain layer");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Application should not reference Entity Framework Core.
    /// Infrastructure provides repository implementations.
    /// </summary>
    public static void ShouldNotReferenceEntityFramework()
    {
        var rule = Types()
            .That().Are(ApplicationLayer)
            .Should().NotDependOnAny("Microsoft.EntityFrameworkCore", useRegularExpressions: true)
            .Because("Application should not have direct database dependencies");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Application should not reference HTTP concerns directly.
    /// API layer handles HTTP.
    /// </summary>
    public static void ShouldNotReferenceHttpConcerns()
    {
        var rule = Types()
            .That().Are(ApplicationLayer)
            .Should().NotDependOnAny("System.Net.Http", useRegularExpressions: true)
            .AndShould().NotDependOnAny("Microsoft.AspNetCore", useRegularExpressions: true)
            .Because("Application should not have HTTP or web concerns");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Command handlers should implement ICommandHandler interface.
    /// </summary>
    public static void CommandHandlersShouldImplementICommandHandler()
    {
        var rule = Classes()
            .That().HaveNameMatching(".*CommandHandler$", useRegularExpressions: true)
            .And().Are(ApplicationLayer)
            .Should().ImplementInterface("ICommandHandler`1", useRegularExpressions: true)
            .OrShould().ImplementInterface("ICommandHandler`2", useRegularExpressions: true)
            .Because("Command handlers must implement ICommandHandler interface for convention-based discovery");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Query handlers should implement IQueryHandler interface.
    /// </summary>
    public static void QueryHandlersShouldImplementIQueryHandler()
    {
        var rule = Classes()
            .That().HaveNameMatching(".*QueryHandler$", useRegularExpressions: true)
            .And().Are(ApplicationLayer)
            .Should().ImplementInterface("IQueryHandler`2", useRegularExpressions: true)
            .Because("Query handlers must implement IQueryHandler interface for convention-based discovery");

        rule.Check(Architecture);
    }
}
