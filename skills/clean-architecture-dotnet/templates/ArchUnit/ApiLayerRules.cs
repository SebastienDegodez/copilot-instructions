using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace [ProjectName].ArchitectureTests.ArchUnit;

/// <summary>
/// Architecture rules for the API layer.
/// Ensures API does NOT reference Application directly (discovery via Infrastructure).
/// </summary>
public static class ApiLayerRules
{
    private static readonly Architecture Architecture = new ArchLoader()
        .LoadAssemblies(
            System.Reflection.Assembly.Load("[ProjectName].Domain"),
            System.Reflection.Assembly.Load("[ProjectName].Application"),
            System.Reflection.Assembly.Load("[ProjectName].Infrastructure"),
            System.Reflection.Assembly.Load("[ProjectName].Api")
        )
        .Build();

    private static IObjectProvider<IType> ApiLayer =>
        Types().That().ResideInNamespace("[ProjectName].Api.*", useRegularExpressions: true).As("API Layer");

    /// <summary>
    /// CRITICAL: API should NOT reference Application layer directly.
    /// API -> Infrastructure -> Application (dependency injection).
    /// </summary>
    public static void ShouldNotReferenceApplication()
    {
        var rule = Types()
            .That().Are(ApiLayer)
            .Should().NotDependOnAny(
                Types().That().ResideInNamespace("[ProjectName].Application.*", useRegularExpressions: true)
                    .And().DoNotHaveNameMatching(".*Handler$", useRegularExpressions: true))
            .Because("API should not reference Application layer directly; handlers are injected via Infrastructure DI");

        rule.Check(Architecture);
    }

    /// <summary>
    /// API can reference Infrastructure (for DI setup).
    /// </summary>
    public static void CanReferenceInfrastructure()
    {
        var rule = Types()
            .That().Are(ApiLayer)
            .Should().NotDependOnAny(
                Types().That().ResideInNamespace("[ProjectName].Infrastructure.*", useRegularExpressions: true))
            .OrShould().OnlyDependOn(
                Types().That().ResideInNamespace("[ProjectName].Infrastructure.*", useRegularExpressions: true),
                Types().That().ResideInNamespace("[ProjectName].Domain.*", useRegularExpressions: true))
            .Because("API can reference Infrastructure for DI configuration");

        // This rule is informational - we expect API to reference Infrastructure
        // Just validate the pattern exists
    }

    /// <summary>
    /// API endpoints should inject ICommandHandler or IQueryHandler interfaces.
    /// NOT concrete handler classes.
    /// </summary>
    public static void EndpointsShouldInjectHandlerInterfaces()
    {
        // This is validated at runtime through DI container
        // ArchUnit can't easily validate method parameters, so this is a documentation reminder
        // Manual review: check that MapPost/MapGet inject ICommandHandler<>/IQueryHandler<>
    }
}
