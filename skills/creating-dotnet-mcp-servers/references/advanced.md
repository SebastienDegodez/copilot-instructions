# Advanced Topics

Clean Architecture integration, configuration patterns, and production deployment for MCP servers.

## Clean Architecture Integration

Project structure example with Clean Architecture layering:

```
src/
  YourProject.Domain/         # Entities, value objects, interfaces
    PackageAggregate/
      IPackageService.cs      # Domain interface
      PackageMetadata.cs      # Domain model
      PackageVersion.cs       # Value object
      
  YourProject.Application/    # Use cases
    SearchPackages/
      SearchPackagesUseCase.cs # Application logic
      
  YourProject.Infrastructure/ # External service implementations
    NuGet/
      NuGetService.cs         # Implements IPackageService
      NuGetServiceOptions.cs  # Configuration
      
  YourProject.Api/           # MCP server
    PackageTools.cs          # MCP tool class
    Program.cs               # Server setup
    McpJsonContext.cs        # AOT serialization
```

### Tool Class Integration Patterns

Example with direct Use Case injection:

```csharp
[McpServerToolType]
public sealed class PackageTools
{
    private readonly SearchPackagesUseCase _searchUseCase;
    private readonly GetPackageInfoUseCase _getInfoUseCase;
    
    public PackageTools(
        SearchPackagesUseCase searchUseCase,
        GetPackageInfoUseCase getInfoUseCase)
    {
        _searchUseCase = searchUseCase;
        _getInfoUseCase = getInfoUseCase;
    }
    
    [McpServerTool(Name = "SearchPackages")]
    [Description("Search for packages by name or keyword")]
    public async Task<IEnumerable<PackageMetadata>> SearchAsync(
        [Description("Search query")] string query,
        [Description("Maximum results")] int limit = 10)
    {
        return await _searchUseCase.ExecuteAsync(query, limit);
    }
    
    [McpServerTool(Name = "GetPackageInfo")]
    [Description("Get detailed information about a specific package")]
    public async Task<PackageMetadata> GetInfoAsync(
        [Description("Package ID")] string packageId)
    {
        return await _getInfoUseCase.ExecuteAsync(packageId);
    }
}
```

#### Available Injection Patterns

**Direct injection:**
```csharp
// Simple, explicit, AOT-friendly
public PackageTools(SearchPackagesUseCase searchUseCase) { }
```

**Pros:**
- Explicit dependencies (easy to understand)
- AOT compatible (no reflection)
- Simpler DI registration
- Better IDE support
- Each tool method maps 1:1 to use case

**Cons:**
- Tools with many use cases get many constructor params
- Less flexible (can't swap implementations easily)

**CQRS pattern (alternative for tools with many operations):**
```csharp
// Alternative: Basic CQRS when tools have 10+ operations
public PackageTools(IQueryHandler<SearchPackagesQuery, IEnumerable<PackageMetadata>> searchHandler) { }
public Task<IEnumerable<PackageMetadata>> SearchAsync(string query)
    => searchHandler.HandleAsync(new SearchPackagesQuery(query));
```

**Pros:**
- Single dependency per query/command type
- Clear separation of concerns (queries vs commands)
- Easier to add cross-cutting concerns

**Cons:**
- More boilerplate (query/command classes, handlers)
- Less obvious what dependencies tool has

### Dependency Injection Setup

```csharp
// Infrastructure layer extension
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, 
        IConfiguration configuration)
    {
        // Register domain services
        services.AddTransient<IPackageService, NuGetService>();
        
        // Configure options
        services.Configure<NuGetServiceOptions>(
            configuration.GetSection("NuGetService"));
        
        // Add post-configuration validation
        services.AddSingleton<IPostConfigureOptions<NuGetServiceOptions>, 
            PostConfigureNuGetServiceOptions>();
        
        // Add HTTP clients
        services.AddHttpClient<IPackageService, NuGetService>();
        
        return services;
    }
}

// Application layer extension
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(
        this IServiceCollection services)
    {
        // Register use cases
        services.AddTransient<SearchPackagesUseCase>();
        services.AddTransient<GetPackageInfoUseCase>();
        
        return services;
    }
}

// Program.cs
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

builder.Services
    .AddMcpServer()
    .WithHttpTransport()
    .WithTools<PackageTools>(serializerOptions: McpJsonContext.Default.Options);
```

## Configuration Patterns

### Environment-Specific Configuration

**appsettings.json:**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    },
    "Console": {
      "LogToStandardErrorThreshold": "Trace"
    }
  },
  "NuGetService": {
    "FeedUrl": "https://api.nuget.org/v3/index.json",
    "Timeout": "00:00:30",
    "MaxRetries": 3
  }
}
```

**appsettings.Development.json:**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug"
    }
  },
  "NuGetService": {
    "FeedUrl": "http://localhost:5555/v3/index.json"
  }
}
```

### Options Pattern with Validation

```csharp
public sealed class NuGetServiceOptions
{
    public const string SectionName = "NuGetService";
    
    public string FeedUrl { get; set; } = string.Empty;
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(30);
    public int MaxRetries { get; set; } = 3;
}

// Post-configure validation
public sealed class PostConfigureNuGetServiceOptions 
    : IPostConfigureOptions<NuGetServiceOptions>
{
    public void PostConfigure(string? name, NuGetServiceOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.FeedUrl))
        {
            throw new InvalidOperationException(
                "NuGetService:FeedUrl is required");
        }
        
        if (!Uri.TryCreate(options.FeedUrl, UriKind.Absolute, out _))
        {
            throw new InvalidOperationException(
                "NuGetService:FeedUrl must be a valid URL");
        }
        
        if (options.Timeout <= TimeSpan.Zero)
        {
            throw new InvalidOperationException(
                "NuGetService:Timeout must be positive");
        }
    }
}
```

### Multiple Tool Classes

```csharp
builder.Services
    .AddMcpServer()
    .WithHttpTransport()
    .WithTools<PackageTools>(serializerOptions: McpJsonContext.Default.Options)
    .WithTools<DocumentationTools>(serializerOptions: McpJsonContext.Default.Options)
    .WithTools<AnalyticsTools>(serializerOptions: McpJsonContext.Default.Options);
```

## Production Deployment

### Dockerfile for AOT

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files
COPY *.sln .
COPY src/**/*.csproj ./
RUN for file in $(ls *.csproj); do mkdir -p src/${file%.*}/ && mv $file src/${file%.*}/; done

# Restore dependencies
RUN dotnet restore

# Copy source code
COPY . .

# Publish with AOT
WORKDIR /src/src/YourProject.Api
RUN dotnet publish -c Release -o /app --self-contained true

# Runtime image - use runtime-deps for AOT
FROM mcr.microsoft.com/dotnet/runtime-deps:9.0-alpine
WORKDIR /app

# Install required libraries for AOT
RUN apk add --no-cache \
    icu-libs \
    libintl

# Copy published app
COPY --from=build /app .

# Create non-root user
RUN adduser -D -u 1000 mcpuser && \
    chown -R mcpuser:mcpuser /app

USER mcpuser

EXPOSE 8080

ENTRYPOINT ["./YourProject.Api"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  mcp-server:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=http://+:8080
      - NuGetService__FeedUrl=https://api.nuget.org/v3/index.json
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Health Checks

```csharp
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy())
    .AddCheck<NuGetServiceHealthCheck>("nuget-service");

var app = builder.Build();

app.MapHealthChecks("/health");
app.MapMcp();
```

```csharp
public sealed class NuGetServiceHealthCheck : IHealthCheck
{
    private readonly IPackageService _packageService;
    
    public NuGetServiceHealthCheck(IPackageService packageService)
    {
        _packageService = packageService;
    }
    
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Simple connectivity check
            await _packageService.PingAsync(cancellationToken);
            return HealthCheckResult.Healthy("NuGet service is reachable");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy(
                "NuGet service is unreachable",
                ex);
        }
    }
}
```

### Performance Metrics

**AOT Compilation Benefits:**

| Metric | Without AOT | With AOT | Improvement |
|--------|-------------|----------|-------------|
| Startup Time | ~500ms | ~50ms | 10x faster |
| Memory Usage | ~100MB | ~30MB | 70% reduction |
| Binary Size | ~80MB | ~15MB | 80% smaller |
| JIT Overhead | Present | None | Eliminated |

### Production Configuration

```csharp
var builder = WebApplication.CreateSlimBuilder(args);

// Production logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole(options =>
{
    options.LogToStandardErrorThreshold = LogLevel.Information;
    options.TimestampFormat = "[yyyy-MM-dd HH:mm:ss] ";
});

// Add structured logging (Serilog)
builder.Host.UseSerilog((context, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
        .WriteTo.File("logs/mcp-server-.log", 
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 7);
});

// Add metrics
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics
            .AddAspNetCoreInstrumentation()
            .AddPrometheusExporter();
    });

var app = builder.Build();

// Metrics endpoint
app.MapPrometheusScrapingEndpoint();

// Health checks
app.MapHealthChecks("/health");

// MCP endpoints
app.MapMcp();

await app.RunAsync();
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: your-registry/mcp-server:latest
        ports:
        - containerPort: 8080
        env:
        - name: ASPNETCORE_ENVIRONMENT
          value: "Production"
        - name: NuGetService__FeedUrl
          valueFrom:
            configMapKeyRef:
              name: mcp-config
              key: nuget-feed-url
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-server
spec:
  selector:
    app: mcp-server
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

## Monitoring and Observability

### Application Insights

```csharp
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
    options.EnableAdaptiveSampling = true;
});
```

### Custom Metrics

```csharp
public sealed class PackageTools
{
    private readonly SearchPackagesUseCase _searchUseCase;
    private readonly ILogger<PackageTools> _logger;
    private readonly IMeterFactory _meterFactory;
    private readonly Counter<long> _searchCounter;
    
    public PackageTools(
        SearchPackagesUseCase searchUseCase,
        ILogger<PackageTools> logger,
        IMeterFactory meterFactory)
    {
        _searchUseCase = searchUseCase;
        _logger = logger;
        _meterFactory = meterFactory;
        
        var meter = _meterFactory.Create("McpServer.PackageTools");
        _searchCounter = meter.CreateCounter<long>("package_searches_total");
    }
    
    [McpServerTool(Name = "SearchPackages")]
    [Description("Search for packages")]
    public async Task<IEnumerable<PackageMetadata>> SearchAsync(string query)
    {
        _searchCounter.Add(1, new TagList { { "query_length", query.Length } });
        
        var sw = Stopwatch.StartNew();
        try
        {
            var results = await _searchUseCase.ExecuteAsync(query);
            _logger.LogInformation(
                "Search completed in {ElapsedMs}ms, found {Count} results",
                sw.ElapsedMilliseconds, results.Count());
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Search failed after {ElapsedMs}ms", sw.ElapsedMilliseconds);
            throw;
        }
    }
}
```

## Security Considerations

### Authentication/Authorization

MCP servers typically run in trusted environments. For public-facing deployments:

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Authority"];
        options.Audience = builder.Configuration["Auth:Audience"];
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// Secure MCP endpoints
app.MapMcp().RequireAuthorization();
```

### Rate Limiting

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("fixed", options =>
    {
        options.Window = TimeSpan.FromMinutes(1);
        options.PermitLimit = 100;
    });
});

var app = builder.Build();
app.UseRateLimiter();

app.MapMcp().RequireRateLimiting("fixed");
```
