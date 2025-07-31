---
applyTo: 'tests/**/*.cs'
description: Guidelines for writing contract tests with Microcks and Testcontainers in .NET.
---

# Contract Testing with Microcks in .NET

## Purpose
This instruction defines how to implement contract tests for REST/SOAP APIs using Microcks and Testcontainers in .NET projects. It ensures that your API implementation conforms to the contract and that contract changes are detected early.

## Version-Specific Instructions

**IMPORTANT**: Choose the correct approach based on your .NET version:

### For Setup (Use Prompts)
- **For .NET 8 and .NET 9**: Use prompt `setup-microcks-dotnet8-9.prompt.md`
- **For .NET 10 and above**: Use prompt `setup-microcks-dotnet10+.prompt.md`

### For Contract Testing (Use Instructions)  
- **For .NET 8 and .NET 9**: Use `contract-testing-microcks-dotnet8-9.instructions.md`
- **For .NET 10 and above**: Use `contract-testing-microcks-dotnet10+.instructions.md`

## References
- For detailed .NET 8/9 instructions: `contract-testing-microcks-dotnet8-9.instructions.md`
- For detailed .NET 10+ instructions: `contract-testing-microcks-dotnet10+.instructions.md`
- https://microcks.io
- https://dotnet.testcontainers.org/
- https://github.com/microcks/microcks-testcontainers-dotnet
