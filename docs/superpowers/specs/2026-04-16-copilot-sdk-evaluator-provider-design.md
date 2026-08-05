# Copilot SDK Provider Design For Evaluator

## Goal

Introduce GitHub Copilot SDK support into `tools/evaluator` while keeping OpenAI support as a coexisting provider.

The evaluator must:

- support both `copilot` and `openai` providers
- default to `copilot`
- expose provider choice through CLI flag `--provider`
- use the selected provider across all evaluators
- report only input/output tokens
- raise an explicit error when Copilot initialization or execution fails (no automatic fallback)

## Scope

Primary implementation scope:

- `tools/evaluator/src/cli.ts`
- `tools/evaluator/src/adapters/llm-client.ts` (or split into provider files)
- evaluator call sites using `LLMClient` (runner/judge paths)
- tests in `tools/evaluator/__tests__/**`
- evaluator package dependencies in `tools/evaluator/package.json`

Out of scope:

- changing benchmark schema beyond existing `input` and `output`
- adding provider auto-detection or silent fallback behavior

## Constraints

- Provider behavior must be deterministic and explicit.
- Invalid provider values must fail fast.
- Copilot failures must fail the run with actionable errors.
- Existing OpenAI behavior must remain available when `--provider openai` is selected.
- The public `LLMClient` interface used by evaluators should stay stable or change minimally with clear migration updates.

## Current Baseline

The current evaluator creates one OpenAI-backed client from `createLLMClient({ apiKey, model })` and uses it for all evaluation calls.

Key observations:

- `LLMResponse` already carries `tokensInput` and `tokensOutput`
- all downstream reporting expects input/output totals
- CLI currently does not expose provider selection

## Recommended Architecture

Use a provider abstraction with two implementations behind a unified `LLMClient` contract.

### 1. Provider model

Introduce provider type:

- `type LLMProvider = 'copilot' | 'openai'`

Introduce a provider-aware client config:

- `provider: LLMProvider` (defaulted by CLI to `copilot`)
- `model: string`
- OpenAI-specific `apiKey` and `baseURL` remain required only for `openai`
- Copilot-specific options are explicit:
  - `workDir: string` (repository root)
  - `timeoutMs: number` (default `60_000`)
  - `systemPromptMode: 'replace'` for parity with .NET `LlmSession`

### 2. Factory

Replace the monolithic OpenAI construction path with a provider factory:

- `createLLMClient(config)` switches on `config.provider`
- returns `CopilotLLMClient` or `OpenAiLLMClient`
- throws for unknown provider

### 3. Copilot implementation

Implement single-turn request flow analogous to the .NET `LlmSession` pattern:

- create session with requested model/system prompt/working directory
- stream events until idle
- accumulate assistant content
- accumulate usage events by summing all usage events emitted before idle
- map token usage to evaluator schema:
  - `tokensInput = inputTokens`
  - `tokensOutput = outputTokens`
- ignore cache token fields for persisted metrics
- enforce timeout (default `60_000ms`) and propagate explicit error messages

No fallback path:

- if session creation fails, throw
- if no assistant content returned, throw
- if timeout occurs, throw

### 4. OpenAI implementation

Move existing OpenAI logic into a dedicated implementation preserving behavior.

- support `complete`
- preserve existing `completeWithTools` behavior
- keep existing token accounting

Provider capability boundary:

- `completeWithTools` remains OpenAI-capable behavior.
- Copilot provider returns an explicit unsupported error when tool-calling is requested.
- Error text must include provider name and operation (`completeWithTools`).

### 5. CLI and wiring

Add CLI option to `evaluate` command:

- `--provider <provider>`
- allowed values: `copilot`, `openai`
- default: `copilot`

Pass selected provider through to client factory.

Validation behavior:

- fail fast with clear message for unsupported value
- for `openai`, require `LLM_API_KEY`
- for `copilot`, validate runtime prerequisites explicitly and fail fast when missing:
  - Copilot SDK package is resolvable at runtime
  - session initialization succeeds for the selected model

### 6. Compatibility for evaluators

All evaluator flows continue to consume `LLMClient` only.

No evaluator-specific branching by provider should appear in business logic; provider branching remains inside adapter/factory layer.

## File-Level Change Plan

- `tools/evaluator/src/adapters/llm-client.ts`
  - add provider types and factory dispatch
  - split provider implementations in-place or into:
    - `tools/evaluator/src/adapters/llm/openai-client.ts`
    - `tools/evaluator/src/adapters/llm/copilot-client.ts`
- `tools/evaluator/src/cli.ts`
  - add `--provider` option with default `copilot`
  - wire provider into `createLLMClient`
  - gate env validation by provider
- `tools/evaluator/src/core/*` (only if typing changes propagate)
  - minimal adaptation if required
- `tools/evaluator/package.json`
  - add `@github/copilot-sdk` dependency (pin to a concrete semver range in implementation PR)
- tests under `tools/evaluator/__tests__`
  - add/adjust unit tests for provider selection and error behavior

## Error Handling Contract

Expected explicit failures:

- unknown provider
- Copilot SDK unavailable or session initialization failure
- Copilot timeout
- Copilot empty response
- OpenAI selected without required API key

Error messages must name the provider and remediation hint where possible.

Stable error categories for assertions:

- `provider_invalid`
- `provider_unavailable`
- `provider_timeout`
- `provider_empty_response`
- `provider_unsupported_operation`

## Testing Strategy

### Unit tests

- provider parsing and default value behavior in CLI
- factory returns correct implementation for `copilot` and `openai`
- factory throws on unsupported provider
- Copilot adapter maps usage to input/output correctly
- Copilot adapter surfaces timeout and session errors

### Integration-level tests (mocked SDK boundaries)

- `evaluate --provider copilot` runs through full evaluation path
- `evaluate --provider openai` preserves existing path
- no hidden fallback from copilot to openai on error

### Requirement-to-test traceability

| Requirement | Acceptance Criteria | Minimum tests |
| --- | --- | --- |
| Coexistence of providers | #1, #2 | factory selection tests for `copilot` and `openai` |
| `--provider` flag with default `copilot` | #1 | CLI parsing test for omitted flag and explicit values |
| Applies to all evaluator flows | #6, #7 | call-site propagation tests for all `LLMClient` consumers (`runner` and `judge`) |
| Input/output token reporting only | #3 | usage mapping tests for OpenAI and Copilot adapters |
| Copilot failure must error, no fallback | #4 | failure-path integration tests asserting no provider switch |

## Acceptance Criteria

1. Running `evaluate` without `--provider` uses `copilot`.
2. Running with `--provider openai` continues to work with current OpenAI behavior.
3. All evaluator runs record only input/output tokens regardless of provider.
4. Copilot failure causes evaluation failure with explicit error; no provider fallback occurs.
5. Existing reporters and benchmark outputs continue to work without schema changes.
6. Test suite includes provider selection and failure-mode coverage.
7. Provider selection is propagated to all evaluator call sites that consume `LLMClient` (`runner` and `judge`) with explicit tests.

## Risks and Mitigations

- Risk: Copilot SDK event model mismatch with current assumptions.
  - Mitigation: isolate in dedicated adapter and test with mocked event streams.
- Risk: provider-specific env requirements create UX confusion.
  - Mitigation: provider-aware validation and clear CLI help text.
- Risk: regression in tool-calling flow (`completeWithTools`).
  - Mitigation: keep OpenAI implementation untouched except extraction/refactor.

## Rollout Notes

- Merge provider abstraction and OpenAI extraction first.
- Add Copilot provider behind same interface next.
- Ship with default provider = `copilot` in the first merged release.
- Keep `--provider openai` documented as compatibility mode.
