#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Initializes a Clean Architecture CQRS project structure for .NET.

.DESCRIPTION
    Creates a complete solution with Domain, Application, Infrastructure, and API layers,
    plus UnitTests, IntegrationTests, and ArchitectureTests projects.
    
.PARAMETER ProjectName
    The name of the project (e.g., "Ordering", "Catalog").
    
.EXAMPLE
    .\init-project.ps1 -ProjectName "Ordering"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Initializing Clean Architecture CQRS project: $ProjectName" -ForegroundColor Cyan

# Create solution
Write-Host "`n📦 Creating solution..." -ForegroundColor Yellow
dotnet new sln -n $ProjectName

# Create src directory structure
Write-Host "`n📁 Creating source projects..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "src" | Out-Null

# Domain layer
dotnet new classlib -n "$ProjectName.Domain" -o "src/$ProjectName.Domain" -f net10.0
Remove-Item "src/$ProjectName.Domain/Class1.cs" -Force
dotnet sln add "src/$ProjectName.Domain/$ProjectName.Domain.csproj"

# Application layer
dotnet new classlib -n "$ProjectName.Application" -o "src/$ProjectName.Application" -f net10.0
Remove-Item "src/$ProjectName.Application/Class1.cs" -Force
dotnet sln add "src/$ProjectName.Application/$ProjectName.Application.csproj"

# Infrastructure layer
dotnet new classlib -n "$ProjectName.Infrastructure" -o "src/$ProjectName.Infrastructure" -f net10.0
Remove-Item "src/$ProjectName.Infrastructure/Class1.cs" -Force
dotnet sln add "src/$ProjectName.Infrastructure/$ProjectName.Infrastructure.csproj"

# API layer
dotnet new web -n "$ProjectName.Api" -o "src/$ProjectName.Api" -f net10.0
dotnet sln add "src/$ProjectName.Api/$ProjectName.Api.csproj"

# Create tests directory structure
Write-Host "`n🧪 Creating test projects..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "tests" | Out-Null

# UnitTests
dotnet new xunit -n "$ProjectName.UnitTests" -o "tests/$ProjectName.UnitTests" -f net10.0
dotnet sln add "tests/$ProjectName.UnitTests/$ProjectName.UnitTests.csproj"

# IntegrationTests
dotnet new xunit -n "$ProjectName.IntegrationTests" -o "tests/$ProjectName.IntegrationTests" -f net10.0
dotnet sln add "tests/$ProjectName.IntegrationTests/$ProjectName.IntegrationTests.csproj"

# ArchitectureTests
dotnet new xunit -n "$ProjectName.ArchitectureTests" -o "tests/$ProjectName.ArchitectureTests" -f net10.0
dotnet sln add "tests/$ProjectName.ArchitectureTests/$ProjectName.ArchitectureTests.csproj"

# Add project references
Write-Host "`n🔗 Configuring project references..." -ForegroundColor Yellow

# Application -> Domain
dotnet add "src/$ProjectName.Application/$ProjectName.Application.csproj" reference "src/$ProjectName.Domain/$ProjectName.Domain.csproj"

# Infrastructure -> Application, Domain
dotnet add "src/$ProjectName.Infrastructure/$ProjectName.Infrastructure.csproj" reference "src/$ProjectName.Application/$ProjectName.Application.csproj"
dotnet add "src/$ProjectName.Infrastructure/$ProjectName.Infrastructure.csproj" reference "src/$ProjectName.Domain/$ProjectName.Domain.csproj"

# API -> Infrastructure, Domain (NOT Application)
dotnet add "src/$ProjectName.Api/$ProjectName.Api.csproj" reference "src/$ProjectName.Infrastructure/$ProjectName.Infrastructure.csproj"
dotnet add "src/$ProjectName.Api/$ProjectName.Api.csproj" reference "src/$ProjectName.Domain/$ProjectName.Domain.csproj"

# UnitTests -> Application, Domain
dotnet add "tests/$ProjectName.UnitTests/$ProjectName.UnitTests.csproj" reference "src/$ProjectName.Application/$ProjectName.Application.csproj"
dotnet add "tests/$ProjectName.UnitTests/$ProjectName.UnitTests.csproj" reference "src/$ProjectName.Domain/$ProjectName.Domain.csproj"

# IntegrationTests -> API
dotnet add "tests/$ProjectName.IntegrationTests/$ProjectName.IntegrationTests.csproj" reference "src/$ProjectName.Api/$ProjectName.Api.csproj"

# ArchitectureTests -> All layers
dotnet add "tests/$ProjectName.ArchitectureTests/$ProjectName.ArchitectureTests.csproj" reference "src/$ProjectName.Domain/$ProjectName.Domain.csproj"
dotnet add "tests/$ProjectName.ArchitectureTests/$ProjectName.ArchitectureTests.csproj" reference "src/$ProjectName.Application/$ProjectName.Application.csproj"
dotnet add "tests/$ProjectName.ArchitectureTests/$ProjectName.ArchitectureTests.csproj" reference "src/$ProjectName.Infrastructure/$ProjectName.Infrastructure.csproj"
dotnet add "tests/$ProjectName.ArchitectureTests/$ProjectName.ArchitectureTests.csproj" reference "src/$ProjectName.Api/$ProjectName.Api.csproj"

# Add NuGet packages
Write-Host "`n📦 Adding NuGet packages..." -ForegroundColor Yellow

# UnitTests packages
dotnet add "tests/$ProjectName.UnitTests/$ProjectName.UnitTests.csproj" package FakeItEasy
dotnet add "tests/$ProjectName.UnitTests/$ProjectName.UnitTests.csproj" package FluentAssertions

# IntegrationTests packages
dotnet add "tests/$ProjectName.IntegrationTests/$ProjectName.IntegrationTests.csproj" package Microsoft.AspNetCore.Mvc.Testing
dotnet add "tests/$ProjectName.IntegrationTests/$ProjectName.IntegrationTests.csproj" package FluentAssertions

# ArchitectureTests packages
dotnet add "tests/$ProjectName.ArchitectureTests/$ProjectName.ArchitectureTests.csproj" package TngTech.ArchUnitNET.xUnit

# Create directory structure
Write-Host "`n📂 Creating directory structure..." -ForegroundColor Yellow

# Domain
New-Item -ItemType Directory -Force -Path "src/$ProjectName.Domain/_Markers" | Out-Null
New-Item -ItemType Directory -Force -Path "src/$ProjectName.Domain/Shared" | Out-Null

# Application
New-Item -ItemType Directory -Force -Path "src/$ProjectName.Application/_Markers" | Out-Null
New-Item -ItemType Directory -Force -Path "src/$ProjectName.Application/_Contracts" | Out-Null

# Infrastructure
New-Item -ItemType Directory -Force -Path "src/$ProjectName.Infrastructure/Persistence/Repositories" | Out-Null
New-Item -ItemType Directory -Force -Path "src/$ProjectName.Infrastructure/Services" | Out-Null

# UnitTests
New-Item -ItemType Directory -Force -Path "tests/$ProjectName.UnitTests/Application" | Out-Null

# IntegrationTests
New-Item -ItemType Directory -Force -Path "tests/$ProjectName.IntegrationTests/Api" | Out-Null

# ArchitectureTests
New-Item -ItemType Directory -Force -Path "tests/$ProjectName.ArchitectureTests/ArchUnit" | Out-Null

# Copy marker interfaces
Write-Host "`n📄 Creating marker interfaces..." -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$templatesDir = Join-Path (Split-Path -Parent $scriptDir) "templates"

# IDomainMarker
$domainMarker = @"
namespace $ProjectName.Domain;

/// <summary>
/// Marker interface to identify the Domain assembly.
/// Use: typeof(IDomainMarker).Assembly
/// </summary>
public interface IDomainMarker { }
"@
Set-Content -Path "src/$ProjectName.Domain/_Markers/IDomainMarker.cs" -Value $domainMarker

# IApplicationMarker
$applicationMarker = @"
namespace $ProjectName.Application;

/// <summary>
/// Marker interface to identify the Application assembly.
/// Use: typeof(IApplicationMarker).Assembly
/// </summary>
public interface IApplicationMarker { }
"@
Set-Content -Path "src/$ProjectName.Application/_Markers/IApplicationMarker.cs" -Value $applicationMarker

# Create CQRS interfaces
Write-Host "`n📝 Creating CQRS handler interfaces..." -ForegroundColor Yellow

$commandHandler = @"
namespace $ProjectName.Application._Contracts;

/// <summary>
/// Handler for commands that don't return a result (void operations).
/// </summary>
public interface ICommandHandler<in TCommand>
{
    Task HandleAsync(TCommand command, CancellationToken cancellationToken = default);
}

/// <summary>
/// Handler for commands that return a result.
/// </summary>
public interface ICommandHandler<in TCommand, TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken cancellationToken = default);
}
"@
Set-Content -Path "src/$ProjectName.Application/_Contracts/ICommandHandler.cs" -Value $commandHandler

$queryHandler = @"
namespace $ProjectName.Application._Contracts;

/// <summary>
/// Handler for queries (read operations).
/// </summary>
public interface IQueryHandler<in TQuery, TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken cancellationToken = default);
}
"@
Set-Content -Path "src/$ProjectName.Application/_Contracts/IQueryHandler.cs" -Value $queryHandler

# Copy ArchUnit rules templates
Write-Host "`n🏛️ Creating ArchUnit test rules..." -ForegroundColor Yellow

$archUnitTemplatesDir = Join-Path $templatesDir "ArchUnit"
if (Test-Path $archUnitTemplatesDir) {
    Copy-Item "$archUnitTemplatesDir/*" "tests/$ProjectName.ArchitectureTests/ArchUnit/" -Force
    
    # Replace placeholder project name in templates
    Get-ChildItem "tests/$ProjectName.ArchitectureTests/ArchUnit/*.cs" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $content = $content -replace '\[ProjectName\]', $ProjectName
        Set-Content $_.FullName -Value $content
    }
}

# Create CleanArchitectureTests
$cleanArchTests = @"
using Xunit;

namespace $ProjectName.ArchitectureTests;

public sealed class CleanArchitectureTests
{
    [Fact]
    public void Domain_ShouldNotDependOnOtherLayers()
    {
        ArchUnit.DomainLayerRules.ShouldNotDependOnOtherLayers();
    }

    [Fact]
    public void Application_ShouldOnlyDependOnDomain()
    {
        ArchUnit.ApplicationLayerRules.ShouldOnlyDependOnDomain();
    }

    [Fact]
    public void Api_ShouldNotReferenceApplication()
    {
        ArchUnit.ApiLayerRules.ShouldNotReferenceApplication();
    }

    [Fact]
    public void Infrastructure_CanReferenceDomainAndApplication()
    {
        ArchUnit.InfrastructureLayerRules.CanReferenceDomainAndApplication();
    }

    [Fact]
    public void ViewModels_ShouldEndWithViewModel()
    {
        ArchUnit.NamingConventionRules.ViewModelsShouldEndWithViewModel();
    }

    [Fact]
    public void CommandHandlers_ShouldEndWithCommandHandler()
    {
        ArchUnit.NamingConventionRules.CommandHandlersShouldEndWithCommandHandler();
    }

    [Fact]
    public void QueryHandlers_ShouldEndWithQueryHandler()
    {
        ArchUnit.NamingConventionRules.QueryHandlersShouldEndWithQueryHandler();
    }
}
"@
Set-Content -Path "tests/$ProjectName.ArchitectureTests/CleanArchitectureTests.cs" -Value $cleanArchTests

# Build to verify
Write-Host "`n🔨 Building solution..." -ForegroundColor Yellow
dotnet build

Write-Host "`n✅ Clean Architecture CQRS project initialized successfully!" -ForegroundColor Green
Write-Host "`nNext steps:"
Write-Host "  1. Review src/$ProjectName.Domain for business logic"
Write-Host "  2. Create Commands/Queries in src/$ProjectName.Application"
Write-Host "  3. Implement handlers with *CommandHandler/*QueryHandler suffix"
Write-Host "  4. Run architecture tests: dotnet test --filter 'FullyQualifiedName~ArchitectureTests'"
Write-Host "`n📚 See .github/skills/clean-architecture-dotnet/SKILL.md for complete guide"
