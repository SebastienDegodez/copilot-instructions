# Testing MCP Servers

Complete guide for testing MCP tools with integration tests, unit tests, and test patterns.

## Integration Test Setup

Use `WebApplicationFactory` and `SseClientTransport` to test the actual MCP protocol:

```csharp
using Microsoft.AspNetCore.Mvc.Testing;
using ModelContextProtocol.Client;
using Xunit;

public sealed class PackageToolsTests
{
    [Fact]
    public async Task ListTools_ShouldReturnRegisteredTools()
    {
        // Arrange
        var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => 
            {
                builder.UseUrls("http://localhost:5000");
            });

        var transport = new SseClientTransport(
            new SseClientTransportOptions
            {
                Endpoint = new Uri("http://localhost:5000/sse"),
            }, 
            factory.CreateClient());
        
        var client = await McpClientFactory.CreateAsync(
            transport, 
            cancellationToken: TestContext.Current.CancellationToken);

        // Act
        var tools = await client.ListToolsAsync(
            cancellationToken: TestContext.Current.CancellationToken);

        // Assert
        Assert.Single(tools);
        Assert.Equal(PackageTools.SearchPackages, tools[0].Name);
    }
    
    [Fact]
    public async Task SearchPackages_ShouldReturnResults()
    {
        // Arrange
        var factory = new WebApplicationFactory<Program>();
        var transport = new SseClientTransport(
            new SseClientTransportOptions { Endpoint = new Uri("http://localhost:5000/sse") },
            factory.CreateClient());
        
        var client = await McpClientFactory.CreateAsync(transport);

        // Act
        var result = await client.CallToolAsync(
            PackageTools.SearchPackages,
            new { query = "Newtonsoft.Json", limit = 5 });

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.Content);
    }
}
```

### Integration Test Best Practices

1. **Use WebApplicationFactory** - Tests real HTTP transport
2. **Use unique ports** - Prevents port conflicts in parallel tests
3. **Pass CancellationToken** - Enables test timeout handling
4. **Test both ListTools and CallTool** - Verifies protocol compliance
5. **Use tool name constants** - `PackageTools.SearchPackages` instead of magic strings

## Unit Test (Tool Logic Only)

Test business logic without MCP protocol overhead:

```csharp
using NSubstitute;
using Xunit;

public sealed class PackageToolsUnitTests
{
    [Fact]
    public async Task SearchAsync_ValidQuery_ReturnsResults()
    {
        // Arrange
        var mockService = Substitute.For<IPackageService>();
        mockService.SearchAsync("test", 10)
            .Returns(new[] { new PackageMetadata("Test.Package", "1.0.0") });
        
        var tools = new PackageTools(mockService);

        // Act
        var results = await tools.SearchAsync("test", 10);

        // Assert
        Assert.Single(results);
        Assert.Equal("Test.Package", results.First().Id);
    }
    
    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task SearchAsync_InvalidQuery_ReturnsError(string query)
    {
        // Arrange
        var mockService = Substitute.For<IPackageService>();
        var tools = new PackageTools(mockService);

        // Act
        var result = await tools.SearchAsync(query);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("query", result.Error, StringComparison.OrdinalIgnoreCase);
    }
}
```

## Test Organization

Recommended structure:

```
tests/
  YourProject.UnitTests/          # Fast, isolated tests
    Tools/
      PackageToolsTests.cs        # Tool business logic
    Application/
      UseCaseTests.cs             # Use case logic
      
  YourProject.IntegrationTests/   # Slower, MCP protocol tests
    Features/
      PackageToolsIntegrationTests.cs  # Full MCP stack
```

## Testing Multiple Tools

```csharp
[Theory]
[InlineData(PackageTools.SearchPackages)]
[InlineData(PackageTools.GetPackageInfo)]
[InlineData(PackageTools.ListVersions)]
public async Task AllTools_ShouldBeDiscoverable(string expectedToolName)
{
    // Arrange
    var factory = new WebApplicationFactory<Program>();
    var transport = new SseClientTransport(
        new SseClientTransportOptions { Endpoint = new Uri("http://localhost:5000/sse") },
        factory.CreateClient());
    
    var client = await McpClientFactory.CreateAsync(transport);

    // Act
    var tools = await client.ListToolsAsync();

    // Assert
    Assert.Contains(tools, t => t.Name == expectedToolName);
}
```

## Testing Error Scenarios

```csharp
[Fact]
public async Task CallTool_WithInvalidParameters_ReturnsErrorResponse()
{
    // Arrange
    var factory = new WebApplicationFactory<Program>();
    var transport = new SseClientTransport(
        new SseClientTransportOptions { Endpoint = new Uri("http://localhost:5000/sse") },
        factory.CreateClient());
    
    var client = await McpClientFactory.CreateAsync(transport);

    // Act
    var result = await client.CallToolAsync(
        PackageTools.SearchPackages,
        new { query = "", limit = -1 });  // Invalid parameters

    // Assert
    Assert.NotNull(result);
    // Verify error is returned in structured format
    var content = result.Content[0].Text;
    Assert.Contains("error", content, StringComparison.OrdinalIgnoreCase);
}
```

## Test Fixtures for Reusability

Use fixtures to avoid duplicating MCP client setup:

```csharp
public sealed class McpServerFixture : IAsyncLifetime
{
    private WebApplicationFactory<Program>? _factory;
    
    public McpClient Client { get; private set; } = null!;
    public WebApplicationFactory<Program> Factory => _factory!;

    public async Task InitializeAsync()
    {
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseUrls("http://localhost:5000");
            });

        var transport = new SseClientTransport(
            new SseClientTransportOptions
            {
                Endpoint = new Uri("http://localhost:5000/sse"),
            },
            _factory.CreateClient());

        Client = await McpClientFactory.CreateAsync(transport);
    }

    public async Task DisposeAsync()
    {
        if (_factory != null)
        {
            await _factory.DisposeAsync();
        }
    }
}

// Usage in test class
public sealed class PackageToolsTests : IClassFixture<McpServerFixture>
{
    private readonly McpServerFixture _fixture;

    public PackageToolsTests(McpServerFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task ListTools_ShouldReturnRegisteredTools()
    {
        // Arrange - fixture provides ready client
        var client = _fixture.Client;

        // Act
        var tools = await client.ListToolsAsync();

        // Assert
        Assert.Single(tools);
        Assert.Equal(PackageTools.SearchPackages, tools[0].Name);
    }
    
    [Fact]
    public async Task SearchPackages_ShouldReturnResults()
    {
        // Reuse same client - much faster than creating new factory per test
        var result = await _fixture.Client.CallToolAsync(
            PackageTools.SearchPackages,
            new { query = "Newtonsoft.Json", limit = 5 });

        Assert.NotNull(result);
    }
}
```

**Benefits:**
- Single MCP client initialization per test class (~80% faster test execution)
- Shared factory reduces resource usage
- Cleaner test methods (no setup boilerplate)
- Proper cleanup via `IAsyncLifetime`

## Testing with Test Containers

For services requiring external dependencies (e.g., database, Redis):

```csharp
// Install: dotnet add package Testcontainers.MsSql
using Testcontainers.MsSql;

public sealed class PackageToolsWithDatabaseTests : IAsyncLifetime
{
    private readonly MsSqlContainer _dbContainer;
    
    public PackageToolsWithDatabaseTests()
    {
        _dbContainer = new MsSqlBuilder()
            .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();
    }

    public async Task DisposeAsync()
    {
        await _dbContainer.StopAsync();
    }

    [Fact]
    public async Task SearchPackages_AgainstRealDatabase_ReturnsResults()
    {
        // Test against real containerized database
        var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Override connection string to use test container
                    var connectionString = _dbContainer.GetConnectionString();
                    services.AddDbContext<PackageDbContext>(options =>
                        options.UseSqlServer(connectionString));
                });
            });

        var transport = new SseClientTransport(
            new SseClientTransportOptions { Endpoint = new Uri("http://localhost:5000/sse") },
            factory.CreateClient());
        
        var client = await McpClientFactory.CreateAsync(transport);

        var result = await client.CallToolAsync(
            PackageTools.SearchPackages,
            new { query = "test" });

        Assert.NotNull(result);
    }
}
```

**Available Testcontainers:**
- `Testcontainers.MsSql` - SQL Server
- `Testcontainers.PostgreSql` - PostgreSQL
- `Testcontainers.Redis` - Redis
- `Testcontainers.MongoDb` - MongoDB
- `Microcks.Testcontainers` - API mocking and testing
- Many more at [dotnet.testcontainers.org](https://dotnet.testcontainers.org/)

## Testing Cancellation

```csharp
[Fact]
public async Task LongRunningTool_SupportsCancellation()
{
    // Arrange
    var mockService = Substitute.For<IPackageService>();
    mockService.SearchAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
        .Returns(async callInfo =>
        {
            var ct = callInfo.Arg<CancellationToken>();
            await Task.Delay(TimeSpan.FromSeconds(10), ct);
            return Array.Empty<PackageMetadata>();
        });
    
    var tools = new PackageTools(mockService);
    var cts = new CancellationTokenSource();

    // Act
    var task = tools.SearchAsync("test", 10, cts.Token);
    cts.CancelAfter(100); // Cancel after 100ms

    // Assert
    await Assert.ThrowsAsync<TaskCanceledException>(() => task);
}
```

## Common Test Mistakes

| Mistake | Fix |
|---------|-----|
| No `WebApplicationFactory` in integration tests | Can't test real transport → Use factory pattern |
| Port conflicts in parallel tests | Use unique ports per test or dynamic port allocation |
| Missing cancellation tokens | Can't test cancellation → Always pass CancellationToken |
| Testing only happy path | Add error scenario tests with invalid inputs |
| Not testing tool discovery | Test both `ListToolsAsync` and `CallToolAsync` |
| Magic strings for tool names | Use constants defined in tool class |
| Not cleaning up resources | Implement `IAsyncLifetime` for proper cleanup |
