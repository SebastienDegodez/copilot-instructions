using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace [ProjectName].ArchitectureTests.ArchUnit;

/// <summary>
/// Architecture rules for the Domain layer.
/// Ensures Domain has ZERO external dependencies and remains isolated.
/// </summary>
public static class DomainLayerRules
{
    private static readonly Architecture Architecture = new ArchLoader()
        .LoadAssemblies(
            typeof([ProjectName].Domain.IDomainMarker).Assembly,
            typeof([ProjectName].Application.IApplicationMarker).Assembly
        )
        .Build();

    private static IObjectProvider<IType> DomainLayer =>
        Types().That().ResideInNamespace("[ProjectName].Domain.*", useRegularExpressions: true).As("Domain Layer");

    /// <summary>
    /// Domain should not depend on Application, Infrastructure, or API layers.
    /// Domain should only depend on itself and .NET BCL.
    /// </summary>
    public static void ShouldNotDependOnOtherLayers()
    {
        var rule = Types()
            .That().Are(DomainLayer)
            .Should().NotDependOnAny(
                Types().That().ResideInNamespace("[ProjectName].Application.*", useRegularExpressions: true))
            .AndShould().NotDependOnAny(
                Types().That().ResideInNamespace("[ProjectName].Infrastructure.*", useRegularExpressions: true))
            .AndShould().NotDependOnAny(
                Types().That().ResideInNamespace("[ProjectName].Api.*", useRegularExpressions: true))
            .Because("Domain layer must remain isolated and have no dependencies on other layers");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Domain should not reference Entity Framework Core.
    /// Persistence concerns belong in Infrastructure.
    /// </summary>
    public static void ShouldNotReferenceEntityFramework()
    {
        var rule = Types()
            .That().Are(DomainLayer)
            .Should().NotDependOnAny("Microsoft.EntityFrameworkCore", useRegularExpressions: true)
            .Because("Domain should not have persistence concerns");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Domain should not reference HTTP concerns.
    /// HTTP belongs in API or Infrastructure layers.
    /// </summary>
    public static void ShouldNotReferenceHttpConcerns()
    {
        var rule = Types()
            .That().Are(DomainLayer)
            .Should().NotDependOnAny("System.Net.Http", useRegularExpressions: true)
            .AndShould().NotDependOnAny("Microsoft.AspNetCore", useRegularExpressions: true)
            .Because("Domain should not have HTTP or web concerns");

        rule.Check(Architecture);
    }

    /// <summary>
    /// Domain repository interfaces should be defined in Domain (not Infrastructure).
    /// Infrastructure provides implementations.
    /// </summary>
    public static void RepositoryInterfacesShouldBeInDomain()
    {
        var rule = Interfaces()
            .That().HaveNameMatching(".*Repository$", useRegularExpressions: true)
            .Should().ResideInNamespace("[ProjectName].Domain.*", useRegularExpressions: true)
            .Because("Repository interfaces are contracts defined in Domain, implemented in Infrastructure");

        rule.Check(Architecture);
    }
}
