---
applyTo: 'tests/**/*.cs'
description: Guidelines for writing contract tests with Microcks and Testcontainers in .NET.
---

# Contract Testing with Microcks in .NET

## Purpose
This instruction defines how to implement contract tests for REST/SOAP APIs using Microcks and Testcontainers in .NET projects. It ensures that your API implementation conforms to the contract and that contract changes are detected early.

## Rules or Guidelines
- Use `Testcontainers` to start a Microcks container in your test setup.
- **CRITICAL**: Use `TestcontainersSettings.ExposeHostPortsAsync()` to expose the application port before building Microcks containers.
- Expose host ports **before** creating MicrocksContainerEnsemble or MicrocksContainer to ensure proper communication. 
   - Don't call `.Build()` on properties if you need to expose host ports.
   - Don't call `.Build()` before exposing host ports methods.
- Import the relevant OpenAPI/AsyncAPI/Soap contract into Microcks at container startup using `.WithMainArtifacts()`.
- Configure your application under test to call the Microcks mock endpoint.
- Use `KestrelWebApplicationFactory` for .NET versions before .NET 10 to enable real HTTP server testing.
- For .NET 10+, use the built-in Kestrel support in WebApplicationFactory.
- Write tests that call your API and assert responses against the contract served by Microcks.
- Clean up containers after tests using `IAsyncLifetime`.
- Document the contract file and Microcks version used in the test file header.

## Best Practices
- Use clear, explicit test names describing the contract being validated.
- Use `IAsyncLifetime` in xUnit for container lifecycle management.
- Keep contract files versioned and reviewed in your repository.
- Prefer isolated, repeatable tests that do not depend on external state.
- Use network aliases for container-to-container communication.

## Examples

### Basic Contract Test Setup
```csharp
public class OrderApiContractTest : BaseIntegrationTest
{
    private readonly ITestOutputHelper TestOutputHelper;

    public OrderApiContractTest(ITestOutputHelper testOutputHelper, MicrocksWebApplicationFactory<Program> factory)
        : base(factory)
    {
        TestOutputHelper = testOutputHelper;
    }

    [Fact]
    public async Task TestOpenApiContract()
    {
        TestRequest request = new()
        {
            ServiceId = "Order Service API:0.1.0",
            RunnerType = TestRunnerType.OPEN_API_SCHEMA,
            TestEndpoint = "http://host.testcontainers.internal:" + Port + "/api",
            // FilteredOperations can be used to limit the operations to test
            // FilteredOperations = ["GET /orders", "POST /orders"]
        };

        var microcksContainer = this.MicrocksContainerEnsemble.MicrocksContainer;
        var testResult = await microcksContainer.TestEndpointAsync(request);

        // You may inspect complete response object with following:
        var json = JsonSerializer.Serialize(testResult, new JsonSerializerOptions { WriteIndented = true });
        TestOutputHelper.WriteLine(json);

        Assert.False(testResult.InProgress, "Test should not be in progress");
        Assert.True(testResult.Success, "Test should be successful");
    }
}
```

### Custom WebApplicationFactory: .NET 10+ and below

For both .NET 10+ and below, you must call `UseKestrel()` in your `MicrocksWebApplicationFactory` to ensure real HTTP server testing for contract tests. The only difference is the base class:

For .NET 10 and above, inherit from `WebApplicationFactory<TProgram>`:
```csharp
public class MicrocksWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram>
    where TProgram : class
{
    public MicrocksWebApplicationFactory()
    {
        // Even in .NET 10+, call UseKestrel() for consistency and explicitness
        UseKestrel();
    }
}
```

For .NET 9 and below, inherit from `KestrelWebApplicationFactory<TProgram>`:
```csharp
public class MicrocksWebApplicationFactory<TProgram> : KestrelWebApplicationFactory<TProgram>
    where TProgram : class
{
    public MicrocksWebApplicationFactory()
    {
        // Enable Kestrel by default for Microcks integration tests
        UseKestrel();
    }
}
```

> **Note:** In .NET 10+, `WebApplicationFactory` supports Kestrel natively, but calling `UseKestrel()` is **mandatory** so that Testcontainers can access the host application.

### Base Integration Test with Proper Initialization
```csharp
public class BaseIntegrationTest : IClassFixture<MicrocksWebApplicationFactory<Program>>, IAsyncLifetime
{
    public async ValueTask InitializeAsync()
    {
        // CRITICAL: Expose host ports BEFORE creating containers
        await TestcontainersSettings.ExposeHostPortsAsync(Port, TestContext.Current.CancellationToken)
            .ConfigureAwait(true);

        var network = new NetworkBuilder().Build();
        
        // Create Microcks container ensemble
        this.MicrocksContainerEnsemble = new MicrocksContainerEnsemble(network, MicrocksImage)
            .WithAsyncFeature()
            .WithMainArtifacts("resources/order-service-openapi.yaml", "resources/order-events-asyncapi.yaml")
            .WithSecondaryArtifacts("resources/order-service-postman-collection.json");

        await this.MicrocksContainerEnsemble.StartAsync()
            .ConfigureAwait(true);
    }
}
```

### KestrelWebApplicationFactory for .NET 9 and below (Base Example)
```csharp
// This file is included as a base reference because enabling Kestrel in integration tests for .NET 9 and below is exceptional and non-standard.
// Use this as the canonical example for such scenarios.
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Diagnostics;
using System.Linq;
using System.Net;

namespace Order.Service.Tests;

/// <summary>
/// Custom WebApplicationFactory that enables Kestrel for integration tests in .NET 9 and below.
/// This is included in base as an exceptional case for contract/integration testing.
/// </summary>
public class KestrelWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram> where TProgram : class
{
    private IHost? _host;
    private bool _useKestrel;
    private ushort _kestrelPort = 0;

    public Uri ServerAddress
    {
        get
        {
            EnsureServer();
            return ClientOptions.BaseAddress;
        }
    }

    /// <summary>
    /// Configures the factory to use Kestrel server with the specified port.
    /// </summary>
    public KestrelWebApplicationFactory<TProgram> UseKestrel(ushort port = 0)
    {
        _useKestrel = true;
        _kestrelPort = port;
        return this;
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var testHost = builder.Build();

        if (_useKestrel)
        {
            builder.ConfigureWebHost(webHostBuilder =>
            {
                webHostBuilder.UseKestrel(options =>
                {
                    options.Listen(IPAddress.Any, _kestrelPort, listenOptions =>
                    {
                        if (Debugger.IsAttached)
                        {
                            listenOptions.UseConnectionLogging();
                        }
                    });
                });
            });

            _host = builder.Build();
            _host.Start();

            var server = _host.Services.GetRequiredService<IServer>();
            var addresses = server.Features.Get<IServerAddressesFeature>();
            ClientOptions.BaseAddress = addresses!.Addresses.Select(x => new Uri(x)).Last();

            testHost.Start();
            return testHost;
        }

        return base.CreateHost(builder);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _host?.Dispose();
        }
        base.Dispose(disposing);
    }

    private void EnsureServer()
    {
        if (_host is null && _useKestrel)
        {
            using var _ = CreateDefaultClient();
        }
    }
}
```

## References
- https://microcks.io
- https://dotnet.testcontainers.org/
- https://github.com/microcks/microcks-testcontainers-dotnet
