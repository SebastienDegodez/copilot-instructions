---
applyTo: 'tests/**/*.cs'
description: Guidelines for writing contract tests with Microcks and Testcontainers in .NET 10+.
---

# Contract Testing with Microcks in .NET 10+

## Purpose
Define how to implement contract tests for REST/SOAP APIs using Microcks and Testcontainers in .NET 10+ projects. Ensure that API implementations conform to contracts and that contract changes are detected early.


## Prerequisite: Microcks Setup

> **You must complete the Microcks setup before writing contract tests.**
> Use the prompt: `setup-microcks-dotnet10+.prompt.md` to set up the complete infrastructure.

This file only documents contract test implementation. All infrastructure and setup code must be in place before using these guidelines.

### Additional Implementation Requirements
- Use `TestcontainersSettings.ExposeHostPortsAsync()` to expose the dynamically allocated application port before building Microcks containers
- Always allocate a free port for Kestrel using a socket, and pass it to configuration before exposing host ports and starting containers
- Start a message broker container (e.g., Kafka) and pass its connection to Microcks using `.WithKafkaConnection(...)`
- Import all relevant contract and collection artifacts into Microcks at container startup using `.WithMainArtifacts()`, `.WithSecondaryArtifacts()`
- Configure your application under test to call the Microcks mock endpoint for third-party APIs using `builder.UseSetting()` in `ConfigureWebHost`
- Use `IAsyncLifetime` in xUnit for container lifecycle management

### CRITICAL Implementation Rules

#### Required Imports and Usings
```csharp
using System.Text.Json;
using System.Threading.Tasks;
using System.Net;
using System.Net.Sockets;
using Microcks.Testcontainers;
using Microcks.Testcontainers.Model;
using Microcks.Testcontainers.Connection;
using DotNet.Testcontainers;
using DotNet.Testcontainers.Builders;
using Testcontainers.Kafka;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
```

#### Test Method Naming Convention
- Use `TestOpenApiContract` for global contract tests
- Use `TestOpenApiContract_[OperationName]` for endpoint-specific tests
- Always include `[Fact]` attribute

#### ServiceId Format Rules
- **EXACT FORMAT**: `"[API Name]:[Version]"` 
- Examples: `"WeatherForecast API:1.0.0"`, `"Order Service API:0.1.0"`
- **MUST** match exactly what's in the OpenAPI `info.title` and `info.version`

#### TestEndpoint Format Rules
- **EXACT FORMAT**: `"http://host.testcontainers.internal:" + Port + "/api"`
- **NEVER** use localhost or 127.0.0.1
- **ALWAYS** use the Port property from BaseIntegrationTest

#### Assertion Rules (MANDATORY)
```csharp
// ALWAYS include these exact assertions:
Assert.False(testResult.InProgress, "Test should not be in progress");
Assert.True(testResult.Success, "Test should be successful");

// ALWAYS include JSON serialization and output:
var json = JsonSerializer.Serialize(testResult, new JsonSerializerOptions { WriteIndented = true });
TestOutputHelper.WriteLine(json);
```

#### FilteredOperations (for endpoint-specific tests)
```csharp
// Format: HTTP_METHOD /path
FilteredOperations = new System.Collections.Generic.List<string> { "GET /forecast", "POST /orders" }
```

## Best Practices
- Use clear, explicit test names describing the contract being validated.
- Use `IAsyncLifetime` in xUnit for container lifecycle management.
- Keep contract files versioned and reviewed in your repository.
- Prefer isolated, repeatable tests that do not depend on external state.
- Use network aliases for container-to-container communication.

## Implementation Guide

### Step 1: Verify Setup Prerequisites
Ensure that the Microcks infrastructure setup is complete (use `setup-microcks-dotnet10+.prompt.md` prompt if needed)

### Step 2: Create Contract Test Class
1. Create `[ServiceName]ContractTest.cs` (e.g., `WeatherApiContractTest.cs`)
2. Use the EXACT pattern below for your contract test class:
```csharp
public class [ServiceName]ContractTest : BaseIntegrationTest
{
    private readonly ITestOutputHelper TestOutputHelper;

    public [ServiceName]ContractTest(ITestOutputHelper testOutputHelper, MicrocksWebApplicationFactory<Program> factory)
        : base(factory)
    {
        TestOutputHelper = testOutputHelper;
    }

    [Fact]
    public async Task TestOpenApiContract()
    {
        TestRequest request = new()
        {
            ServiceId = "[Service Name]:[Version]",
            RunnerType = TestRunnerType.OPEN_API_SCHEMA,
            TestEndpoint = "http://host.testcontainers.internal:" + Port + "/api",
            // FilteredOperations = new System.Collections.Generic.List<string> { "GET /endpoint" } // Only for endpoint-specific tests
        };

        var testResult = await this.MicrocksContainer.TestEndpointAsync(request);

        // MANDATORY: Serialize and output result
        var json = JsonSerializer.Serialize(testResult, new JsonSerializerOptions { WriteIndented = true });
        TestOutputHelper.WriteLine(json);

        // MANDATORY: Assert on these exact properties
        Assert.False(testResult.InProgress, "Test should not be in progress");
        Assert.True(testResult.Success, "Test should be successful");
    }
}
```
3. Replace `[ServiceName]` with your actual service name
4. Replace `[Service Name]:[Version]` with values from your OpenAPI spec
5. Add required imports from the Critical Implementation Rules

#### Step 3: Verify Contract File Location
1. Ensure your OpenAPI/AsyncAPI file is in the test project
2. Add it to `.WithMainArtifacts()` in MicrocksWebApplicationFactory
3. Verify the ServiceId matches the `info.title` and `info.version` in the contract

#### Step 4: Run and Validate
1. Run `dotnet test` to verify the test compiles and runs
2. Check the JSON output in test results for detailed validation info
3. Ensure both assertions pass (InProgress=false, Success=true)

## Examples

### Example: WeatherApi Contract Test
```csharp
public class WeatherApiContractTest : BaseIntegrationTest
{
    private readonly ITestOutputHelper TestOutputHelper;

    public WeatherApiContractTest(ITestOutputHelper testOutputHelper, MicrocksWebApplicationFactory<Program> factory)
        : base(factory)
    {
        TestOutputHelper = testOutputHelper;
    }

    [Fact]
    public async Task TestOpenApiContract()
    {
        TestRequest request = new()
        {
            ServiceId = "WeatherForecast API:1.0.0",
            RunnerType = TestRunnerType.OPEN_API_SCHEMA,
            TestEndpoint = "http://host.testcontainers.internal:" + Port + "/api",
            // FilteredOperations can be used to limit the operations to test
            // FilteredOperations = ["GET /forecast"]
        };

        var testResult = await this.MicrocksContainer.TestEndpointAsync(request);

        // You may inspect complete response object with following:
        var json = JsonSerializer.Serialize(testResult, new JsonSerializerOptions { WriteIndented = true });
        TestOutputHelper.WriteLine(json);

        Assert.False(testResult.InProgress, "Test should not be in progress");
        Assert.True(testResult.Success, "Test should be successful");
    }
}
```

## References
- https://microcks.io
- https://dotnet.testcontainers.org/
- https://github.com/microcks/microcks-testcontainers-dotnet
