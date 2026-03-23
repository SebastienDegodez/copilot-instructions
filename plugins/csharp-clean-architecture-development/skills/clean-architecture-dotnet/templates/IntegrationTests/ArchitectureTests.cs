using System.Reflection;
using NetArchTest.Rules;
using [ProjectName].Api;
using [ProjectName].Application;
using [ProjectName].Domain;
using [ProjectName].Infrastructure;
using Xunit;

namespace [ProjectName].IntegrationTests;

/// <summary>
/// Architecture tests using NetArchTest.Rules to enforce Clean Architecture layer dependencies.
/// These tests ensure the four layers maintain proper dependencies:
/// - Domain: No dependencies on other layers
/// - Application: Only depends on Domain
/// - Infrastructure: Depends on Domain and Application
/// - API: Does not depend on Application (uses Infrastructure for DI)
/// </summary>
public sealed class ArchitectureTests
{
    private const string DomainNamespace = "[ProjectName].Domain";
    private const string ApplicationNamespace = "[ProjectName].Application";
    private const string InfrastructureNamespace = "[ProjectName].Infrastructure";
    private const string ApiNamespace = "[ProjectName].Api";

    private static readonly Assembly DomainAssembly = typeof(IDomainMarker).Assembly;
    private static readonly Assembly ApplicationAssembly = typeof(IApplicationMarker).Assembly;
    private static readonly Assembly InfrastructureAssembly = typeof(IInfrastructureMarker).Assembly;
    private static readonly Assembly ApiAssembly = typeof(IApiMarker).Assembly;

    /// <summary>
    /// Ensures all Domain classes are sealed for immutability and better performance.
    /// </summary>
    [Fact]
    public void Domain_Classes_Should_Be_Sealed()
    {
       var result = Types
            .InAssembly(DomainAssembly)
            .That().AreClasses()
            .Should().BeSealed()
            .GetResult();
 
       Assert.True(result.IsSuccessful, "All Domain classes must be sealed.");
    }

    /// <summary>
    /// Ensures that the Domain layer does not have dependencies on other layers.
    /// This is crucial for maintaining the separation of concerns and ensuring that the Domain layer remains independent
    /// from Application, Infrastructure, and API layers.
    /// </summary>
    [Fact]
    public void Domain_ShouldNotHaveDependencyOn_OtherLayers()
    {
        // Act
        var result = Types.InAssembly(DomainAssembly)
            .Should()
            .NotHaveDependencyOn(ApplicationNamespace)
            .And()
            .NotHaveDependencyOn(InfrastructureNamespace)
            .And()
            .NotHaveDependencyOn(ApiNamespace)
            .GetResult();

        // Assert
        Assert.True(result.IsSuccessful, $"Domain layer should not depend on other layers. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }

    /// <summary>
    /// Ensures Application layer only depends on Domain, not on Infrastructure or API.
    /// </summary>
    [Fact]
    public void Application_ShouldOnlyDependOn_Domain()
    {
        // Act
        var result = Types.InAssembly(ApplicationAssembly)
            .Should()
            .NotHaveDependencyOn(InfrastructureNamespace)
            .And()
            .NotHaveDependencyOn(ApiNamespace)
            .GetResult();

        // Assert
        Assert.True(result.IsSuccessful, $"Application layer should not depend on Infrastructure or API. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }

    /// <summary>
    /// Ensures Infrastructure doesn't depend on API layer.
    /// Infrastructure implements interfaces but should not know about HTTP concerns.
    /// </summary>
    [Fact]
    public void Infrastructure_ShouldNotHaveDependencyOn_Api()
    {
        // This test ensures Infrastructure doesn't depend on API layer
        var result = Types.InAssembly(InfrastructureAssembly)
            .Should()
            .NotHaveDependencyOn(ApiNamespace)
            .GetResult();

        // Assert
        Assert.True(result.IsSuccessful, $"Infrastructure should not depend on API layer. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }

    /// <summary>
    /// Ensures API doesn't directly depend on Application.
    /// API should get handlers through Infrastructure's DI container.
    /// </summary>
    [Fact]
    public void Api_ShouldNotHaveDependencyOn_Application()
    {
        var result = Types.InAssembly(ApiAssembly)
            .Should()
            .NotHaveDependencyOn(ApplicationNamespace)
            .GetResult();

        Assert.True(result.IsSuccessful, $"API should not depend on Application. Use Infrastructure DI instead. Violations: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }
}
