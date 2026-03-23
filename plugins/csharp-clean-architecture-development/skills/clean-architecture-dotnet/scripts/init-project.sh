#!/usr/bin/env bash

#
# Initializes a Clean Architecture CQRS project structure for .NET
#
# Usage: ./init-project.sh "ProjectName"
# Example: ./init-project.sh "Ordering"
#

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "❌ Error: Project name required"
    echo "Usage: $0 <ProjectName>"
    echo "Example: $0 Ordering"
    exit 1
fi

PROJECT_NAME="$1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$(dirname "$SCRIPT_DIR")/templates"

# Copy a template file to destination, substituting [ProjectName] with the actual project name.
copy_template() {
    local src="$TEMPLATES_DIR/$1"
    local dest="$2"
    mkdir -p "$(dirname "$dest")"
    sed "s/\[ProjectName\]/$PROJECT_NAME/g" "$src" > "$dest"
}

echo "🚀 Initializing Clean Architecture CQRS project: $PROJECT_NAME"

# Create solution
echo ""
echo "📦 Creating solution..."
dotnet new sln -n "$PROJECT_NAME"

# Create src directory structure
echo ""
echo "📁 Creating source projects..."
mkdir -p src

# Domain layer
dotnet new classlib -n "$PROJECT_NAME.Domain" -o "src/$PROJECT_NAME.Domain" -f net10.0
rm -f "src/$PROJECT_NAME.Domain/Class1.cs"
dotnet sln add "src/$PROJECT_NAME.Domain/$PROJECT_NAME.Domain.csproj"

# Application layer
dotnet new classlib -n "$PROJECT_NAME.Application" -o "src/$PROJECT_NAME.Application" -f net10.0
rm -f "src/$PROJECT_NAME.Application/Class1.cs"
dotnet sln add "src/$PROJECT_NAME.Application/$PROJECT_NAME.Application.csproj"

# Infrastructure layer
dotnet new classlib -n "$PROJECT_NAME.Infrastructure" -o "src/$PROJECT_NAME.Infrastructure" -f net10.0
rm -f "src/$PROJECT_NAME.Infrastructure/Class1.cs"
dotnet sln add "src/$PROJECT_NAME.Infrastructure/$PROJECT_NAME.Infrastructure.csproj"

# API layer
dotnet new web -n "$PROJECT_NAME.Api" -o "src/$PROJECT_NAME.Api" -f net10.0
dotnet sln add "src/$PROJECT_NAME.Api/$PROJECT_NAME.Api.csproj"

# Create tests directory structure
echo ""
echo "🧪 Creating test projects..."
mkdir -p tests

# UnitTests
dotnet new xunit -n "$PROJECT_NAME.UnitTests" -o "tests/$PROJECT_NAME.UnitTests" -f net10.0
dotnet sln add "tests/$PROJECT_NAME.UnitTests/$PROJECT_NAME.UnitTests.csproj"

# IntegrationTests
dotnet new xunit -n "$PROJECT_NAME.IntegrationTests" -o "tests/$PROJECT_NAME.IntegrationTests" -f net10.0
dotnet sln add "tests/$PROJECT_NAME.IntegrationTests/$PROJECT_NAME.IntegrationTests.csproj"

# Add project references
echo ""
echo "🔗 Configuring project references..."

# Application -> Domain
dotnet add "src/$PROJECT_NAME.Application/$PROJECT_NAME.Application.csproj" reference "src/$PROJECT_NAME.Domain/$PROJECT_NAME.Domain.csproj"

# Infrastructure -> Application, Domain
dotnet add "src/$PROJECT_NAME.Infrastructure/$PROJECT_NAME.Infrastructure.csproj" reference "src/$PROJECT_NAME.Application/$PROJECT_NAME.Application.csproj"
dotnet add "src/$PROJECT_NAME.Infrastructure/$PROJECT_NAME.Infrastructure.csproj" reference "src/$PROJECT_NAME.Domain/$PROJECT_NAME.Domain.csproj"

# API -> Infrastructure only (Application and Domain are transitive — do NOT add direct references)
dotnet add "src/$PROJECT_NAME.Api/$PROJECT_NAME.Api.csproj" reference "src/$PROJECT_NAME.Infrastructure/$PROJECT_NAME.Infrastructure.csproj"

# UnitTests -> Application, Domain
dotnet add "tests/$PROJECT_NAME.UnitTests/$PROJECT_NAME.UnitTests.csproj" reference "src/$PROJECT_NAME.Application/$PROJECT_NAME.Application.csproj"
dotnet add "tests/$PROJECT_NAME.UnitTests/$PROJECT_NAME.UnitTests.csproj" reference "src/$PROJECT_NAME.Domain/$PROJECT_NAME.Domain.csproj"

# IntegrationTests -> All layers (API for endpoint tests, all layers for architecture tests)
dotnet add "tests/$PROJECT_NAME.IntegrationTests/$PROJECT_NAME.IntegrationTests.csproj" reference "src/$PROJECT_NAME.Api/$PROJECT_NAME.Api.csproj"
dotnet add "tests/$PROJECT_NAME.IntegrationTests/$PROJECT_NAME.IntegrationTests.csproj" reference "src/$PROJECT_NAME.Domain/$PROJECT_NAME.Domain.csproj"
dotnet add "tests/$PROJECT_NAME.IntegrationTests/$PROJECT_NAME.IntegrationTests.csproj" reference "src/$PROJECT_NAME.Application/$PROJECT_NAME.Application.csproj"
dotnet add "tests/$PROJECT_NAME.IntegrationTests/$PROJECT_NAME.IntegrationTests.csproj" reference "src/$PROJECT_NAME.Infrastructure/$PROJECT_NAME.Infrastructure.csproj"

# Add NuGet packages
echo ""
echo "📦 Adding NuGet packages..."

# UnitTests packages
dotnet add "tests/$PROJECT_NAME.UnitTests/$PROJECT_NAME.UnitTests.csproj" package FakeItEasy

# IntegrationTests packages
dotnet add "tests/$PROJECT_NAME.IntegrationTests/$PROJECT_NAME.IntegrationTests.csproj" package Microsoft.AspNetCore.Mvc.Testing
dotnet add "tests/$PROJECT_NAME.IntegrationTests/$PROJECT_NAME.IntegrationTests.csproj" package NetArchTest.Rules

# Create directory structure
echo ""
echo "📂 Creating directory structure..."

# Domain
mkdir -p "src/$PROJECT_NAME.Domain/Shared"

# Application  
mkdir -p "src/$PROJECT_NAME.Application/Shared"
mkdir -p "src/$PROJECT_NAME.Application/Features"

# Infrastructure
mkdir -p "src/$PROJECT_NAME.Infrastructure/Persistence/Repositories"
mkdir -p "src/$PROJECT_NAME.Infrastructure/Services"

# API
# No additional directories needed

# UnitTests
mkdir -p "tests/$PROJECT_NAME.UnitTests/Application"

# IntegrationTests
mkdir -p "tests/$PROJECT_NAME.IntegrationTests/Api"

# Create marker interfaces
echo ""
echo "📄 Creating marker interfaces and CQRS files from templates..."

copy_template "Domain/IDomainMarker.cs"              "src/$PROJECT_NAME.Domain/IDomainMarker.cs"
copy_template "Application/IApplicationMarker.cs"    "src/$PROJECT_NAME.Application/IApplicationMarker.cs"
copy_template "Application/Shared/ICommandHandler.cs" "src/$PROJECT_NAME.Application/Shared/ICommandHandler.cs"
copy_template "Application/Shared/IQueryHandler.cs"  "src/$PROJECT_NAME.Application/Shared/IQueryHandler.cs"
copy_template "Application/Shared/ICommandBus.cs"    "src/$PROJECT_NAME.Application/Shared/ICommandBus.cs"
copy_template "Application/Shared/IQueryBus.cs"      "src/$PROJECT_NAME.Application/Shared/IQueryBus.cs"
copy_template "Infrastructure/IInfrastructureMarker.cs" "src/$PROJECT_NAME.Infrastructure/IInfrastructureMarker.cs"
copy_template "Infrastructure/CQRS/CommandBus.cs"    "src/$PROJECT_NAME.Infrastructure/CQRS/CommandBus.cs"
copy_template "Infrastructure/CQRS/QueryBus.cs"      "src/$PROJECT_NAME.Infrastructure/CQRS/QueryBus.cs"
copy_template "Infrastructure/DependencyInjection.cs" "src/$PROJECT_NAME.Infrastructure/DependencyInjection.cs"
copy_template "Api/IApiMarker.cs"                    "src/$PROJECT_NAME.Api/IApiMarker.cs"

# Copy Architecture test template to IntegrationTests
echo ""
echo "🏛️ Creating architecture tests..."

copy_template "IntegrationTests/ArchitectureTests.cs" "tests/$PROJECT_NAME.IntegrationTests/ArchitectureTests.cs"

# Build to verify
echo ""
echo "🔨 Building solution..."
dotnet build

echo ""
echo "✅ Clean Architecture CQRS project initialized successfully!"
echo ""
echo "Next steps:"
echo "  1. Review src/$PROJECT_NAME.Domain for business logic"
echo "  2. Create Commands/Queries in src/$PROJECT_NAME.Application/Features/"
echo "  3. Implement handlers with *CommandHandler/*QueryHandler suffix"
echo "  4. Run architecture tests: dotnet test --filter 'FullyQualifiedName~IntegrationTests'"
echo ""
echo "📚 See .github/skills/clean-architecture-dotnet/SKILL.md for complete guide"
