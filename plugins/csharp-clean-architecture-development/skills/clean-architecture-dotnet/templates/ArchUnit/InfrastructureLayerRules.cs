using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace [ProjectName].ArchitectureTests.ArchUnit;

/// <summary>
/// Architecture rules for the Infrastructure layer.
/// Ensures Infrastructure can reference Domain and Application (implements contracts).
/// </summary>
public static class InfrastructureLayerRules
{
    private static readonly Architecture Architecture = new ArchLoader()
        .LoadAssemblies(
            System.Reflection.Assembly.Load("[ProjectName].Domain"),
            System.Reflection.Assembly.Load("[ProjectName].Application"),
            System.Reflection.Assembly.Load("[ProjectName].Infrastructure")
        )
        .Build();

    private static IObjectProvider<IType> InfrastructureLayer =>
        Types().That().ResideInNamespace("[ProjectName].Infrastructure.*", useRegularExpressions: true).As("Infrastructure Layer");

    /// <summary>
    /// Infrastructure can reference both Domain and Application.
    /// Infrastructure implements interfaces defined in those layers.
    /// </summary>
    public static void CanReferenceDomainAndApplication()
    {
        var rule = Types()
            .That().Are(InfrastructureLayer)
            .Should().NotDependOnAny(
                Types().That().ResideInNamespace("[ProjectName].Api.*", useRegularExpressions: true))
            .Because("Infrastructure should not depend on API layer");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Repository implementations should be in Infrastructure.Persistence namespace.
    /// </summary>
    public static void RepositoryImplementationsShouldBeInPersistence()
    {
        var rule = Classes()
            .That().HaveNameMatching(".*Repository$", useRegularExpressions: true)
            .And().Are(InfrastructureLayer)
            .Should().ResideInNamespace("[ProjectName].Infrastructure.Persistence.*", useRegularExpressions: true)
            .Because("Repository implementations belong in Infrastructure.Persistence");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Repository implementations should implement Domain repository interfaces.
    /// </summary>
    public static void RepositoriesShouldImplementDomainInterfaces()
    {
        var rule = Classes()
            .That().HaveNameMatching(".*Repository$", useRegularExpressions: true)
            .And().Are(InfrastructureLayer)
            .Should().ImplementInterface(".*IRepository", useRegularExpressions: true)
            .Because("Repository implementations must implement Domain interfaces");

        rule.Check(Architecture);
    }

    /// <summary>
    /// DbContext should be in Infrastructure.Persistence namespace.
    /// </summary>
    public static void DbContextShouldBeInPersistence()
    {
        var rule = Classes()
            .That().HaveNameMatching(".*DbContext$", useRegularExpressions: true)
            .Should().ResideInNamespace("[ProjectName].Infrastructure.Persistence.*", useRegularExpressions: true)
            .Because("DbContext belongs in Infrastructure.Persistence");

        rule.Check(Architecture);
    }
}
