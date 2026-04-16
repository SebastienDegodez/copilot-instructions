# Copilot SDK Evaluator Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Copilot SDK as the default LLM provider in the evaluator while preserving OpenAI as an explicit compatibility provider.

**Architecture:** Introduce a provider-aware `LLMClient` factory in the adapter layer and keep `runner`/`judge` provider-agnostic. Implement Copilot session handling in a dedicated adapter that maps usage to existing input/output token fields and throws explicit provider errors with no fallback.

**Tech Stack:** TypeScript, Node.js, Vitest, Commander CLI, OpenAI SDK, GitHub Copilot SDK

---

## File Structure

- `tools/evaluator/src/adapters/llm-client.ts`
  Shared contracts (`LLMClient`, options, response), provider type, and provider factory.

- `tools/evaluator/src/adapters/llm/openai-client.ts`
  OpenAI-backed `LLMClient` implementation extracted from current monolithic adapter.

- `tools/evaluator/src/adapters/llm/copilot-client.ts`
  Copilot SDK-backed `LLMClient` implementation with session/event handling, timeout, and token mapping.

- `tools/evaluator/src/cli.ts`
  Adds `--provider <copilot|openai>` to `evaluate`, defaults to `copilot`, and applies provider-aware validation.

- `tools/evaluator/src/core/runner.ts`
  Must continue receiving a generic `LLMClient` only (no provider branching).

- `tools/evaluator/src/core/judge.ts`
  Must continue using `LLMClient` methods only; provider-specific behavior remains in adapters.

- `tools/evaluator/package.json`
  Adds `@github/copilot-sdk` dependency used by Copilot adapter.

- `tools/evaluator/__tests__/llm-client-factory.test.ts`
  New tests for provider dispatch, defaulting behavior contract, and unsupported provider errors.

- `tools/evaluator/__tests__/evaluate-provider.integration.test.ts`
  New command-level tests for provider defaulting, copilot fail-fast, and no-fallback behavior.

- `tools/evaluator/__tests__/copilot-client.test.ts`
  New tests for Copilot token mapping, timeout, empty response, and explicit failures.

- `tools/evaluator/__tests__/cli-provider.test.ts`
  New tests for CLI provider parsing and provider-aware env validation.

- `tools/evaluator/__tests__/runner.test.ts`
  Extend to assert the runner remains provider-agnostic and consumes `LLMClient` only.

- `tools/evaluator/__tests__/judge.test.ts`
  Extend to lock behavior when `completeWithTools` is unsupported by the selected provider.

## Testing Strategy

- Outside-in first for CLI provider selection and evaluate flow behavior.
- Then adapter-level unit tests for Copilot/OpenAI provider contracts.
- Keep token schema assertions strict: only `tokensInput` and `tokensOutput` are persisted.
- Validate explicit failure behavior and the absence of fallback path.

## Task 1: Lock Provider Selection Behavior With Failing CLI Tests

**Files:**
- Create: `tools/evaluator/__tests__/cli-provider.test.ts`
- Modify: `tools/evaluator/src/cli.ts` (later task)

- [ ] **Step 1: Add failing tests for default provider and explicit provider values**

Create tests such as:

```ts
it('uses copilot provider when --provider is omitted', async () => {
  // execute evaluate command parsing with no --provider and assert selected provider is 'copilot'
});

it('accepts --provider openai', async () => {
  // parse args and assert selected provider is 'openai'
});

it('fails fast for unsupported provider values', async () => {
  // assert non-zero exit path and clear error message
});
```

- [ ] **Step 2: Add failing tests for provider-aware env validation**

```ts
it('requires LLM_API_KEY when provider is openai', async () => {
  // expect failure when key is absent
});

it('does not require LLM_API_KEY when provider is copilot', async () => {
  // expect no env validation failure on key absence
});
```

- [ ] **Step 3: Add failing command-level dispatch test before implementation**

In `cli-provider.test.ts`, add a command-level evaluate-path test (with mocked `createLLMClient`) that asserts omitted `--provider` dispatches `provider: 'copilot'` into the factory.

- [ ] **Step 4: Run tests to confirm red state**

- [ ] **Step 3: Run tests to confirm red state**

Run:

```bash
cd tools/evaluator
npx vitest run __tests__/cli-provider.test.ts
```

Expected: FAIL because provider flag/default, command-level dispatch, and provider-aware validation are not implemented yet.

- [ ] **Step 5: Commit red tests**

```bash
git add tools/evaluator/__tests__/cli-provider.test.ts
git commit -S -m "test: lock evaluator provider cli behavior"
```

## Task 2: Extract OpenAI Provider And Add Provider Factory

**Files:**
- Modify: `tools/evaluator/src/adapters/llm-client.ts`
- Create: `tools/evaluator/src/adapters/llm/openai-client.ts`
- Create: `tools/evaluator/__tests__/llm-client-factory.test.ts`

- [ ] **Step 1: Add failing tests for provider factory dispatch**

Create tests such as:

```ts
it('returns openai client when provider=openai', () => {
  const client = createLLMClient({ provider: 'openai', model: 'gpt-4o', apiKey: 'k' });
  expect(client).toBeDefined();
});

it('throws provider_invalid for unknown provider', () => {
  expect(() => createLLMClient({ provider: 'x' as never, model: 'gpt-4o' })).toThrow();
});
```

- [ ] **Step 2: Extract current OpenAI implementation into dedicated file**

Move current logic into `tools/evaluator/src/adapters/llm/openai-client.ts` and export a constructor used by the factory.

- [ ] **Step 3: Update shared adapter contracts and provider-aware config**

Define:

```ts
export type LLMProvider = 'copilot' | 'openai';

export interface LLMClientConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseURL?: string;
  workDir?: string;
  timeoutMs?: number;
}
```

- [ ] **Step 4: Run tests for factory and legacy tests**

Run:

```bash
cd tools/evaluator
npx vitest run __tests__/llm-client-factory.test.ts __tests__/runner.test.ts __tests__/judge.test.ts
```

Expected: PASS for factory/openai dispatch tests; existing runner/judge tests still pass.

- [ ] **Step 5: Commit extraction and factory**

```bash
git add tools/evaluator/src/adapters/llm-client.ts tools/evaluator/src/adapters/llm/openai-client.ts tools/evaluator/__tests__/llm-client-factory.test.ts
git commit -S -m "refactor: introduce provider-based llm client factory"
```

## Task 3: Add Copilot Provider Tests First

**Files:**
- Create: `tools/evaluator/__tests__/copilot-client.test.ts`
- Modify: `tools/evaluator/src/adapters/llm/copilot-client.ts` (later task)

- [ ] **Step 1: Add failing token mapping tests**

```ts
it('maps copilot usage input/output to tokensInput/tokensOutput', async () => {
  // mock usage events and assert sums map correctly
});

it('ignores cache token fields and persists only input/output totals', async () => {
  // mock usage payload containing cache fields and assert output object only uses input/output
});
```

- [ ] **Step 2: Add failing explicit error behavior tests**

```ts
it('throws provider_timeout when session does not become idle before timeout', async () => {
  // expect explicit timeout category in error message
});

it('throws provider_empty_response when assistant content is empty', async () => {
  // expect explicit category in error message
});

it('throws provider_unsupported_operation for completeWithTools', async () => {
  // assert message contains both "copilot" and "completeWithTools"
});
```

- [ ] **Step 3: Run tests to confirm red state**

Run:

```bash
cd tools/evaluator
npx vitest run __tests__/copilot-client.test.ts
```

Expected: FAIL because Copilot adapter and explicit errors are not implemented yet.

- [ ] **Step 4: Commit red tests**

```bash
git add tools/evaluator/__tests__/copilot-client.test.ts
git commit -S -m "test: lock copilot provider contract"
```

## Task 4: Implement Copilot Adapter And CLI Wiring

**Files:**
- Create: `tools/evaluator/src/adapters/llm/copilot-client.ts`
- Modify: `tools/evaluator/src/adapters/llm-client.ts`
- Modify: `tools/evaluator/src/cli.ts`
- Modify: `tools/evaluator/package.json`

- [ ] **Step 1: Add Copilot SDK dependency**

Add dependency:

```json
"@github/copilot-sdk": "<pin-concrete-version>"
```

Then install:

```bash
cd tools/evaluator
npm install
```

- [ ] **Step 2: Implement single-turn Copilot session flow**

In `copilot-client.ts`, implement:

```ts
// pseudo-contract
complete(prompt, options) =>
  create session (model, working directory, system prompt replace mode)
  subscribe events
  aggregate assistant content + usage events
  enforce timeout (default 60000ms)
  return { content, tokensInput, tokensOutput }
```

Error categories required in thrown messages:

- `provider_unavailable`
- `provider_timeout`
- `provider_empty_response`

- [ ] **Step 3: Implement explicit unsupported tool-calling behavior on Copilot**

`completeWithTools(...)` must throw `provider_unsupported_operation` with provider name (`copilot`) in message.

- [ ] **Step 4: Add CLI provider option and provider-aware validation**

Update evaluate command options:

```ts
.option('--provider <provider>', 'LLM provider: copilot | openai', 'copilot')
```

Validation rules:

- unsupported provider => fail fast
- `openai` without `LLM_API_KEY` => fail fast
- `copilot` path does not require `LLM_API_KEY`
- `copilot` preflight fails fast with `provider_unavailable` when:
  - Copilot SDK is not resolvable at runtime
  - Copilot session initialization fails for selected model

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd tools/evaluator
npx vitest run __tests__/cli-provider.test.ts __tests__/llm-client-factory.test.ts __tests__/copilot-client.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit implementation**

```bash
git add tools/evaluator/src/adapters/llm/copilot-client.ts tools/evaluator/src/adapters/llm-client.ts tools/evaluator/src/cli.ts tools/evaluator/package.json tools/evaluator/package-lock.json
git commit -S -m "feat: add copilot sdk provider for evaluator"
```

## Task 5: Add Command-Level Provider Integration Tests

**Files:**
- Create: `tools/evaluator/__tests__/evaluate-provider.integration.test.ts`

- [ ] **Step 1: Add evaluate command tests for provider defaults and fail-fast behavior**

Add tests such as:

```ts
it('fails evaluate when copilot initialization fails and does not fallback to openai', async () => {
  // assert command exits with provider_unavailable and openai constructor is never called
});

it('uses openai when --provider openai is provided', async () => {
  // assert openai path selected and copilot path not used
});
```

- [ ] **Step 2: Run integration tests**

Run:

```bash
cd tools/evaluator
npx vitest run __tests__/evaluate-provider.integration.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit integration test coverage**

```bash
git add tools/evaluator/__tests__/evaluate-provider.integration.test.ts
git commit -S -m "test: cover provider selection in evaluate command"
```

## Task 6: Lock End-to-End Evaluator Behavior Across Runner/Judge

**Files:**
- Modify: `tools/evaluator/__tests__/runner.test.ts`
- Modify: `tools/evaluator/__tests__/judge.test.ts`
- Modify: `tools/evaluator/src/core/runner.ts` (only if required by signatures)
- Modify: `tools/evaluator/src/core/judge.ts` (only if required by signatures)

- [ ] **Step 1: Add tests proving provider-agnostic core behavior**

Add tests verifying `runner` and `judge` use only `LLMClient` contract and do not branch by provider.

- [ ] **Step 2: Add no-fallback failure-path test**

Add a test where Copilot client throws provider error and assert evaluation fails without reattempting OpenAI.

- [ ] **Step 3: Run scenario tests**

Run:

```bash
cd tools/evaluator
npx vitest run __tests__/runner.test.ts __tests__/judge.test.ts
```

Expected: PASS with explicit failure behavior preserved.

- [ ] **Step 4: Commit behavior locks**

```bash
git add tools/evaluator/__tests__/runner.test.ts tools/evaluator/__tests__/judge.test.ts
git commit -S -m "test: enforce provider-agnostic evaluator core"
```

## Task 7: Full Verification Before Completion

**Files:**
- Modify: none expected (verification only)

- [ ] **Step 1: Run full evaluator test suite**

```bash
cd tools/evaluator
npm test
```

Expected: PASS.

- [ ] **Step 2: Run typecheck and lint**

```bash
cd tools/evaluator
npm run typecheck
npm run lint
```

Expected: PASS with no new errors.

- [ ] **Step 3: Smoke test evaluate CLI for both providers**

- [ ] **Step 3: Generate deterministic entries file for smoke testing**

```bash
cd tools/evaluator
npm run dev -- discover --all --repo-root ../.. --output ./tmp/discovered.json
```

Expected: `./tmp/discovered.json` exists and contains at least an `entries` array.

- [ ] **Step 4: Smoke test evaluate CLI for both providers**

```bash
cd tools/evaluator
npm run dev -- evaluate --entries ./tmp/discovered.json --provider copilot --model gpt-4o --repo-root ../..
LLM_API_KEY=<value> npm run dev -- evaluate --entries ./tmp/discovered.json --provider openai --model gpt-4o --repo-root ../..
```

Expected:

- Copilot path starts and uses provider `copilot` by default when omitted.
- OpenAI path requires `LLM_API_KEY` and runs when provided.

- [ ] **Step 5: Final signed commit for any remaining integration fixes**

```bash
git add -A
git commit -S -m "chore: finalize copilot/openai provider integration"
```

## Relevant Skills During Execution

- `@superpowers:test-driven-development` for red/green discipline task-by-task.
- `@superpowers:verification-before-completion` before claiming success.
- `@superpowers:subagent-driven-development` (recommended execution mode).
- `@superpowers:requesting-code-review` after implementation stabilizes.
