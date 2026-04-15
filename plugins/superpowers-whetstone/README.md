# Superpowers Whetstone Plugin

Collection of testing skills for behavior-first development with Outside-In TDD, Gherkin, and mutation testing.

## What's Included

### Skills
- **gherkin-gate** - Capture observable behavior in business language and require user approval before writing tests or implementation.
- **red-synthesize-green** - Enforce the 2-step AI TDD cycle: write a failing test with stubs only, validate the red state with a human, then synthesize the real implementation.
- **outside-in-tdd** - Drive implementation from approved scenarios, start from observable behavior, and let domain design emerge from failing tests.
- **mutation-testing** - Verify that your test suite actually detects regressions once the baseline is green.

### Migration Note
- Testing guidance that used to live in `application-layer-testing` is now part of the `outside-in-tdd` skill in this plugin.

## Installation

Install this plugin via Copilot CLI:

```bash
copilot plugin install superpowers-whetstone
```

Or clone the repository and reference locally.

## What You'll Learn

This plugin provides practical guidance on:
- Describing behavior with Gherkin before implementation
- Translating business scenarios into acceptance-style tests
- Letting domain objects emerge from red instead of designing them upfront
- Using real domain objects and mocking only external boundaries
- Running mutation testing after the test baseline is green

## Quick Start

1. Start with `gherkin-gate` to write and validate business scenarios.
2. Use `red-synthesize-green` to enforce the AI TDD cycle: write a failing test with stubs, validate the red state, then synthesize implementation.
3. Continue with `outside-in-tdd` to turn approved scenarios into tests and implementation.
4. Finish with `mutation-testing` to validate test effectiveness before merge.

## Best Fit

Use this plugin when you want to:
- Practice behavior-first development
- Work with DDD and Clean Architecture in a test-first workflow
- Improve confidence in test quality beyond code coverage

## Contributing

See main repository CONTRIBUTING.md for guidelines.