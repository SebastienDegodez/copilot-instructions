# Error Handling in MCP Tools

Best practices for handling errors gracefully in MCP tools and returning meaningful messages to clients.

## Core Principle

**Never throw unhandled exceptions** - MCP tools should return structured error responses instead of letting exceptions bubble up. This provides better UX for LLM clients and makes debugging easier.

## Structured Error Response Pattern

```csharp
public record ToolResult<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }
    public string? ErrorCode { get; init; }
}

[McpServerTool(Name = "SearchPackages")]
[Description("Search for packages")]
public async Task<ToolResult<IEnumerable<PackageMetadata>>> SearchAsync(
    [Description("Search query")] string query,
    [Description("Maximum results (default: 10)")] int limit = 10,
    CancellationToken cancellationToken = default)
{
    try
    {
        // Input validation
        if (string.IsNullOrWhiteSpace(query))
        {
            return new ToolResult<IEnumerable<PackageMetadata>>
            {
                Success = false,
                Data = null,
                Error = "Search query cannot be empty",
                ErrorCode = "INVALID_INPUT"
            };
        }
        
        if (limit < 1 || limit > 100)
        {
            return new ToolResult<IEnumerable<PackageMetadata>>
            {
                Success = false,
                Data = null,
                Error = "Limit must be between 1 and 100",
                ErrorCode = "INVALID_INPUT"
            };
        }
        
        // Business logic
        var results = await _packageService.SearchAsync(query, limit, cancellationToken);
        
        return new ToolResult<IEnumerable<PackageMetadata>>
        {
            Success = true,
            Data = results,
            Error = null,
            ErrorCode = null
        };
    }
    catch (ArgumentException ex)
    {
        return new ToolResult<IEnumerable<PackageMetadata>>
        {
            Success = false,
            Data = null,
            Error = ex.Message,
            ErrorCode = "INVALID_ARGUMENT"
        };
    }
    catch (HttpRequestException ex)
    {
        _logger.LogError(ex, "Network error during package search for query: {Query}", query);
        
        return new ToolResult<IEnumerable<PackageMetadata>>
        {
            Success = false,
            Data = null,
            Error = $"Network error: {ex.Message}",
            ErrorCode = "NETWORK_ERROR"
        };
    }
    catch (TimeoutException ex)
    {
        _logger.LogError(ex, "Timeout during package search for query: {Query}", query);
        
        return new ToolResult<IEnumerable<PackageMetadata>>
        {
            Success = false,
            Data = null,
            Error = "Request timed out. Please try again.",
            ErrorCode = "TIMEOUT"
        };
    }
    catch (Exception ex)
    {
        // Log unexpected errors with full details
        _logger.LogError(ex, "Unexpected error during package search for query: {Query}", query);
        
        return new ToolResult<IEnumerable<PackageMetadata>>
        {
            Success = false,
            Data = null,
            Error = "An unexpected error occurred. Please try again.",
            ErrorCode = "INTERNAL_ERROR"
        };
    }
}
```

## Error Categories

### 1. Validation Errors (User Input)

**Pattern:** Return immediately without calling services

```csharp
if (string.IsNullOrWhiteSpace(packageId))
{
    return ToolResult.Failure<PackageInfo>(
        "Package ID is required",
        "VALIDATION_ERROR");
}

if (!Regex.IsMatch(packageId, @"^[a-zA-Z0-9\.\-_]+$"))
{
    return ToolResult.Failure<PackageInfo>(
        "Package ID contains invalid characters",
        "VALIDATION_ERROR");
}
```

### 2. Business Logic Errors

**Pattern:** Catch domain exceptions and translate to user-friendly messages

```csharp
try
{
    var package = await _service.GetPackageAsync(packageId);
    return ToolResult.Success(package);
}
catch (PackageNotFoundException ex)
{
    return ToolResult.Failure<PackageInfo>(
        $"Package '{packageId}' not found",
        "NOT_FOUND");
}
catch (PackageDeprecatedException ex)
{
    return ToolResult.Failure<PackageInfo>(
        $"Package '{packageId}' has been deprecated. Reason: {ex.Reason}",
        "DEPRECATED");
}
```

### 3. Infrastructure Errors

**Pattern:** Log detailed error, return generic message

```csharp
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.Unauthorized)
{
    _logger.LogError(ex, "Authentication failed for package service");
    return ToolResult.Failure<PackageInfo>(
        "Unable to authenticate with package service. Please check configuration.",
        "AUTH_ERROR");
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
{
    _logger.LogWarning("Rate limit exceeded for package service");
    return ToolResult.Failure<PackageInfo>(
        "Rate limit exceeded. Please try again in a few minutes.",
        "RATE_LIMIT");
}
```

### 4. Unexpected Errors

**Pattern:** Always log, never expose internal details to client

```csharp
catch (Exception ex)
{
    _logger.LogError(ex, "Unexpected error in SearchAsync for query: {Query}", query);
    
    // Don't expose internal exception details to client
    return ToolResult.Failure<IEnumerable<PackageMetadata>>(
        "An internal error occurred. The issue has been logged.",
        "INTERNAL_ERROR");
}
```

## Cancellation Handling

Always support cancellation tokens:

```csharp
[McpServerTool(Name = "AnalyzePackage")]
[Description("Performs deep analysis of a package")]
public async Task<ToolResult<PackageAnalysis>> AnalyzeAsync(
    [Description("Package ID")] string packageId,
    CancellationToken cancellationToken = default)
{
    try
    {
        cancellationToken.ThrowIfCancellationRequested();
        
        var package = await _service.GetPackageAsync(packageId, cancellationToken);
        var analysis = await _analyzer.AnalyzeAsync(package, cancellationToken);
        
        return ToolResult.Success(analysis);
    }
    catch (OperationCanceledException)
    {
        _logger.LogInformation("Analysis cancelled for package: {PackageId}", packageId);
        
        return ToolResult.Failure<PackageAnalysis>(
            "Analysis was cancelled",
            "CANCELLED");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error analyzing package: {PackageId}", packageId);
        return ToolResult.Failure<PackageAnalysis>(
            "Analysis failed. Please try again.",
            "ANALYSIS_ERROR");
    }
}
```

## JSON Serialization for Error Types

Don't forget to add error result types to your JSON context:

```csharp
[JsonSerializable(typeof(ToolResult<PackageMetadata>))]
[JsonSerializable(typeof(ToolResult<IEnumerable<PackageMetadata>>))]
[JsonSerializable(typeof(ToolResult<PackageAnalysis>))]
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
public partial class McpJsonContext : JsonSerializerContext
{
}
```

## Error Code Constants

**Always use constants** instead of magic strings for error codes:

```csharp
public static class ErrorCodes
{
    // Validation errors (4xx equivalent)
    public const string InvalidInput = "INVALID_INPUT";
    public const string ValidationError = "VALIDATION_ERROR";
    public const string InvalidArgument = "INVALID_ARGUMENT";
    
    // Business logic errors (4xx equivalent)
    public const string NotFound = "NOT_FOUND";
    public const string AlreadyExists = "ALREADY_EXISTS";
    public const string Deprecated = "DEPRECATED";
    public const string Forbidden = "FORBIDDEN";
    
    // Infrastructure errors (5xx equivalent)
    public const string NetworkError = "NETWORK_ERROR";
    public const string Timeout = "TIMEOUT";
    public const string AuthError = "AUTH_ERROR";
    public const string RateLimit = "RATE_LIMIT";
    public const string ServiceUnavailable = "SERVICE_UNAVAILABLE";
    
    // Operation errors
    public const string Cancelled = "CANCELLED";
    public const string InternalError = "INTERNAL_ERROR";
    public const string AnalysisError = "ANALYSIS_ERROR";
}
```

**Usage:**

```csharp
if (string.IsNullOrWhiteSpace(query))
{
    return ToolResult.Failure<PackageInfo>(
        "Search query cannot be empty",
        ErrorCodes.InvalidInput);  // ✅ Type-safe constant
}

// Not this:
return ToolResult.Failure<PackageInfo>(
    "Search query cannot be empty",
    "INVALID_INPUT");  // ❌ Magic string
```

**Benefits:**
- Compile-time safety
- Autocomplete support
- Easy refactoring
- Consistent error codes across tools
- Easier to test (can reference constants in assertions)

## Helper Extension Methods

Create reusable helpers for common patterns:

```csharp
public static class ToolResult
{
    public static ToolResult<T> Success<T>(T data)
    {
        return new ToolResult<T>
        {
            Success = true,
            Data = data,
            Error = null,
            ErrorCode = null
        };
    }
    
    public static ToolResult<T> Failure<T>(string error, string errorCode)
    {
        return new ToolResult<T>
        {
            Success = false,
            Data = default,
            Error = error,
            ErrorCode = errorCode
        };
    }
}
```

## Logging Best Practices

```csharp
// ✅ Good: Structured logging with context
_logger.LogError(ex, 
    "Failed to search packages. Query: {Query}, Limit: {Limit}, User: {UserId}",
    query, limit, userId);

// ❌ Bad: String concatenation
_logger.LogError($"Failed to search packages: {ex.Message}");

// ✅ Good: Different log levels for different scenarios
_logger.LogWarning("Package {PackageId} not found", packageId);  // Expected scenario
_logger.LogError(ex, "Unexpected error searching packages");      // Unexpected error

// ✅ Good: Don't log sensitive data
_logger.LogInformation("Authentication successful for user: {UserId}", userId);

// ❌ Bad: Logging credentials
_logger.LogInformation("Login attempt: {Username} / {Password}", user, pass);
```

## Error Response Examples

LLM clients will see responses like:

```json
{
  "success": true,
  "data": [
    { "id": "Newtonsoft.Json", "version": "13.0.3" }
  ],
  "error": null,
  "errorCode": null
}
```

```json
{
  "success": false,
  "data": null,
  "error": "Search query cannot be empty",
  "errorCode": "INVALID_INPUT"
}
```

```json
{
  "success": false,
  "data": null,
  "error": "Network error: Connection timed out",
  "errorCode": "NETWORK_ERROR"
}
```

## Common Error Codes

Standardize error codes across your tools:

| Code | Meaning | Usage |
|------|---------|-------|
| `INVALID_INPUT` | Input validation failed | Required fields missing, format errors |
| `NOT_FOUND` | Resource not found | Package doesn't exist, ID not found |
| `VALIDATION_ERROR` | Business rule violation | Invalid state, rule violation |
| `AUTH_ERROR` | Authentication failed | Invalid credentials, unauthorized |
| `RATE_LIMIT` | Too many requests | API rate limit exceeded |
| `NETWORK_ERROR` | Network/connectivity issue | HTTP errors, timeouts |
| `TIMEOUT` | Operation timed out | Long-running operation exceeded limit |
| `CANCELLED` | Operation cancelled | User or system cancellation |
| `INTERNAL_ERROR` | Unexpected error | Unhandled exceptions |

## Testing Error Handling

```csharp
[Fact]
public async Task SearchAsync_EmptyQuery_ReturnsValidationError()
{
    // Arrange
    var tools = new PackageTools(_mockService);

    // Act
    var result = await tools.SearchAsync("");

    // Assert
    Assert.False(result.Success);
    Assert.Equal("INVALID_INPUT", result.ErrorCode);
    Assert.Contains("query", result.Error, StringComparison.OrdinalIgnoreCase);
}

[Fact]
public async Task SearchAsync_NetworkError_ReturnsNetworkError()
{
    // Arrange
    _mockService.SearchAsync(Arg.Any<string>(), Arg.Any<int>())
        .ThrowsAsync(new HttpRequestException("Connection failed"));
    
    var tools = new PackageTools(_mockService);

    // Act
    var result = await tools.SearchAsync("test");

    // Assert
    Assert.False(result.Success);
    Assert.Equal("NETWORK_ERROR", result.ErrorCode);
    Assert.Contains("Network error", result.Error);
}
```
