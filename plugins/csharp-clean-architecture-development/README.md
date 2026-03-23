# C# Clean Architecture Development Plugin

Comprehensive plugin for C# developers using Domain-Driven Design, Clean Architecture, and CQRS patterns.

## What's Included

### Skills
- **clean-architecture-dotnet** - Framework for creating new .NET projects with Clean Architecture and CQRS

### Migration Note
- Testing guidance previously exposed as `application-layer-testing` now lives in the `outside-in-tdd` skill from the `superpowers-whetstone` plugin.

### Related Instructions (global)
The following instructions complement this plugin:
- `clean-architecture.instructions.md`
- `coding-style-csharp.instructions.md`
- `domain-driven-design.instructions.md`
- `specification-business-rules-csharp.instructions.md`
- `unit-and-integration-tests.instructions.md`

## Installation

Install this plugin via Copilot CLI:

```bash
copilot plugin install csharp-clean-architecture-development
```

Install `superpowers-whetstone` as well if you need the `outside-in-tdd` testing skill:

```bash
copilot plugin install superpowers-whetstone
```

Or clone the repository and reference locally.

## What You'll Learn

This plugin provides comprehensive guidance on:
- Building layered applications with clean architecture
- Encapsulating business logic with Domain-Driven Design
- Implementing CQRS pattern for command/query separation
- Writing domain logic using value objects and aggregates
- Using specification pattern for business rules

## Quick Start

1. Review `clean-architecture-dotnet` skill for project setup
2. Install the `superpowers-whetstone` plugin and use the `outside-in-tdd` skill for testing guidance
3. Reference the global instructions for coding standards and patterns

## Contributing

See main repository CONTRIBUTING.md for guidelines.
