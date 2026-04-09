# Evaluation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the unified, incremental evaluation pipeline so PRs, manual runs, and scheduled runs evaluate only when needed, preserve existing benchmark history, and update the site benchmark data safely.

**Architecture:** Keep workflow orchestration in the repository's evaluation workflow YAML under `.github/workflows/`, and move deterministic discovery plus append-only benchmark merging into the TypeScript evaluator so the workflow can stay thin and artifact-driven. Use tests to lock the incremental rules before changing the workflow.

**Tech Stack:** GitHub Actions YAML, TypeScript, Node.js, Vitest

**Living plan rule:** This plan is intentionally living. If the evaluation workflow YAML is renamed or split during implementation, update this plan to follow the current source of truth under `.github/workflows/` instead of forcing the codebase back to an old filename.

---

## File Structure

- `.github/workflows/` evaluation workflow YAML
  Orchestrates the unified pipeline trigger model, gate logic, discovery, reporting, and benchmark persistence rules. Use the current evaluation workflow YAML file that exists at execution time.

- `tools/evaluator/src/core/types.ts`
  Defines the canonical evaluation, benchmark, and source contracts used by workflow-facing commands.

- `tools/evaluator/src/adapters/git-client.ts`
  Encapsulates git diff and content comparison helpers used by incremental discovery.

- `tools/evaluator/src/core/discoverer.ts`
  Detects changed assets, handles infrastructure invalidation, and filters evaluable assets against prior benchmark history.

- `tools/evaluator/src/core/benchmark-summary.ts`
  New focused module for append-only benchmark merge rules and logical-change detection.

- `tools/evaluator/src/reporters/benchmark-reporter.ts`
  Thin wrapper around benchmark summary merge/write behavior.

- `tools/evaluator/src/cli.ts`
  Exposes the discover/evaluate/report commands used by the workflow pipeline.

- `website/src/pages/benchmarks.astro`
  Renders benchmark history and must use the same canonical `source` vocabulary as the workflow and evaluator.

- `tools/evaluator/__tests__/discover-command.test.ts`
  Acceptance-style coverage for the `evaluator discover` entry point and its observable outputs.

- `tools/evaluator/__tests__/report-command.test.ts`
  Acceptance-style coverage for the `evaluator report --format benchmark` entry point and benchmark update signaling.

- `tools/evaluator/__tests__/discoverer.test.ts`
  Regression coverage for asset discovery, infra invalidation, and prior-result filtering.

- `tools/evaluator/__tests__/git-client.test.ts`
  New coverage for deterministic file and directory hashing behavior at a given ref.

- `tools/evaluator/__tests__/benchmark-summary.test.ts`
  New coverage for append-only merges, unchanged-summary preservation, and canonical `source` values.

## Testing Strategy

- Prefer outside-in acceptance tests when the behavior is observable from an entry point.
- For the evaluator, start from command-level behavior through `buildCLI()` and its filesystem outputs before adding lower-level tests.
- Use lower-level tests only for technical seams that are hard to cover cheaply from the outside, such as git digest computation, deterministic merge helpers, and YAML-only workflow structure.
- For workflow behavior itself, prefer acceptance-style verification of observable contracts such as `evaluation-status`, emitted artifacts, benchmark update guards, and report payloads rather than testing internal prose structure.
- Before implementing a behavior-changing test stream, capture the intended behavior in simple scenario language inside the test names and descriptions.

## Task 1: Lock Incremental Discovery Rules With Acceptance Tests First

**Files:**
- Create: `tools/evaluator/__tests__/discover-command.test.ts`
- Modify: `tools/evaluator/__tests__/discoverer.test.ts`
- Create: `tools/evaluator/__tests__/git-client.test.ts`

- [ ] **Step 1: Add failing acceptance-style tests for the discover command**

Create `tools/evaluator/__tests__/discover-command.test.ts` covering observable command behavior such as:

```ts
it('marks discovery as skipped when no evaluable asset with scenarios needs evaluation', async () => {
  // run the discover command against a fixture repo and inspect discovered.json
});

it('marks discovery as an infrastructure refresh when the evaluation workflow yaml changes', async () => {
  // run the discover command and assert isInfraChange === true in output json
});

it('forces all eligible assets into to_evaluate when evaluate_all is enabled', async () => {
  // run discover in all/forced mode and assert the resulting matrix covers all evaluable assets
});
```

- [ ] **Step 2: Add failing lower-level discovery tests for technical seams**

Add cases to `tools/evaluator/__tests__/discoverer.test.ts` covering:

```ts
it('treats the current evaluation workflow yaml as an infrastructure change', async () => {
  const gitClient = makeMockGitClient(['.github/workflows/<current-evaluation-workflow>.yml']);
  const result = await discoverChangedEntries(gitClient, FIXTURES_DIR, 'origin/main', 'HEAD');
  expect(result.isInfraChange).toBe(true);
});

it('includes an entry when the previously recorded commit cannot be resolved safely', async () => {
  const summaryPath = writeSummary({
    lastUpdated: '2026-01-01T00:00:00Z',
    entries: [
      {
        id: 'skill:my-skill',
        kind: 'skill',
        name: 'my-skill',
        history: [{ date: '2026-01-01T00:00:00Z', commit: { sha: 'not-a-real-sha', url: '' }, model: 'gpt-4o', overallScore: 1, passRate: 1, scenarios: [], tokens: { input: 0, output: 0 }, source: 'scheduled' }],
      },
    ],
  });

  const gitClient = makeMockGitClient([], []);
  const result = await filterByPreviousResults(baseEntries, summaryPath, gitClient);
  expect(result.find((entry) => entry.id === 'skill:my-skill')).toBeDefined();
});
```

- [ ] **Step 3: Add failing git-client tests for canonical path comparison**

Create `tools/evaluator/__tests__/git-client.test.ts` with focused tests for:

```ts
it('hashes a single file deterministically at a ref', async () => {
  const git = createGitClient(repoRoot);
  const digest = await git.getPathDigestAtRef('HEAD', 'instructions/clean-architecture.instructions.md');
  expect(digest).toMatch(/^[0-9a-f]{64}$/);
});

it('hashes a directory from its sorted relative file list plus content hashes', async () => {
  const git = createGitClient(repoRoot);
  const digest = await git.getPathDigestAtRef('HEAD', 'skills/setup-husky-dotnet');
  expect(digest).toMatch(/^[0-9a-f]{64}$/);
});
```

- [ ] **Step 4: Run the new tests to verify they fail first**

Run:

```bash
cd tools/evaluator
npx vitest run __tests__/discover-command.test.ts __tests__/discoverer.test.ts __tests__/git-client.test.ts
```

Expected: FAIL because the current evaluation workflow YAML is not yet treated as infra and `getPathDigestAtRef` does not exist yet.

- [ ] **Step 5: Commit the red tests**

```bash
git add tools/evaluator/__tests__/discover-command.test.ts tools/evaluator/__tests__/discoverer.test.ts tools/evaluator/__tests__/git-client.test.ts
git commit -S -m "test: lock incremental discovery contracts"
```

## Task 2: Implement Deterministic Discovery And Baseline Comparison

**Files:**
- Modify: `tools/evaluator/src/adapters/git-client.ts`
- Modify: `tools/evaluator/src/core/discoverer.ts`
- Modify: `tools/evaluator/src/core/types.ts`
- Modify: `tools/evaluator/src/cli.ts`

- [ ] **Step 1: Extend the git client with digest helpers**

Update `tools/evaluator/src/adapters/git-client.ts` to add methods like:

```ts
export interface GitClient {
  getChangedFiles(baseRef: string, headRef: string): Promise<string[]>;
  getChangedFilesSince(commitSha: string): Promise<string[]>;
  getCurrentSha(): Promise<string>;
  getPathDigestAtRef(ref: string, path: string): Promise<string | null>;
}
```

Implementation rule:

```ts
// file-backed assets -> hash file content
// directory-backed assets -> hash sorted relative file list + each file content hash
```

- [ ] **Step 2: Update discovery invalidation rules and fallback behavior**

Modify `tools/evaluator/src/core/discoverer.ts` so that:

```ts
const INFRA_PATTERNS: RegExp[] = [
  /^tools\/evaluator\//,
  /^\.github\/workflows\/.+\.ya?ml$/,
  /^\.github\/workflows\/evaluation(-run)?\.yml$/,
];
```

and `filterByPreviousResults` uses digest comparison against the previously recorded commit when possible, falling back to inclusion when the prior baseline cannot be resolved.

- [ ] **Step 3: Narrow the canonical source contract in types**

Update `tools/evaluator/src/core/types.ts` so the source union matches the approved spec:

```ts
source: 'pr' | 'scheduled' | 'manual';
```

and remove `slash-command` from the evaluator-facing types.

- [ ] **Step 4: Run tests until discovery is green**

Run:

```bash
cd tools/evaluator
npx vitest run __tests__/discover-command.test.ts __tests__/discoverer.test.ts __tests__/git-client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the discovery implementation**

```bash
git add tools/evaluator/src/adapters/git-client.ts tools/evaluator/src/core/discoverer.ts tools/evaluator/src/core/types.ts tools/evaluator/src/cli.ts
git commit -S -m "feat: make evaluator discovery incremental and deterministic"
```

## Task 3: Lock Benchmark Merge Semantics With Acceptance Tests First

**Files:**
- Create: `tools/evaluator/__tests__/report-command.test.ts`
- Create: `tools/evaluator/__tests__/benchmark-summary.test.ts`
- Modify: `tools/evaluator/__tests__/discoverer.test.ts`

- [ ] **Step 1: Add failing acceptance-style tests for the benchmark report command**

Create `tools/evaluator/__tests__/report-command.test.ts` to cover observable behavior such as:

```ts
it('does not rewrite summary.json when no fresh results are provided', async () => {
  // run report --format benchmark and verify the file content and changed signal stay stable
});

it('writes an updated summary and changed signal when fresh results are provided', async () => {
  // run report --format benchmark and inspect summary.json plus returned status payload
});
```

- [ ] **Step 2: Add failing lower-level benchmark merge tests**

Create `tools/evaluator/__tests__/benchmark-summary.test.ts` with cases covering:

```ts
it('preserves existing entries when no fresh results are provided', () => {
  const existing = {
    lastUpdated: '2026-03-01T00:00:00Z',
    entries: [{ id: 'skill:setup-husky-dotnet', kind: 'skill', name: 'setup-husky-dotnet', history: [existingHistory] }],
  };

  const merged = mergeBenchmarkSummary(existing, []);
  expect(merged.entries).toEqual(existing.entries);
  expect(merged.changed).toBe(false);
});

it('appends history only for assets that produced fresh results', () => {
  const merged = mergeBenchmarkSummary(existing, [freshResult]);
  expect(merged.summary.entries[0]?.history).toHaveLength(2);
});

it('keeps source values restricted to scheduled, manual, or pr', () => {
  const merged = mergeBenchmarkSummary(emptySummary, [freshResult]);
  expect(merged.summary.entries[0]?.history[0]?.source).toBe('pr');
});
```

- [ ] **Step 3: Add a failing regression test for unchanged `lastUpdated`**

Add an assertion that `lastUpdated` is not rewritten when `mergeBenchmarkSummary` receives no fresh results.

- [ ] **Step 4: Run the benchmark tests to verify they fail**

Run:

```bash
cd tools/evaluator
npx vitest run __tests__/report-command.test.ts __tests__/benchmark-summary.test.ts
```

Expected: FAIL because the merge helper does not exist yet and the current reporter always rewrites `lastUpdated`.

- [ ] **Step 5: Commit the red tests**

```bash
git add tools/evaluator/__tests__/report-command.test.ts tools/evaluator/__tests__/benchmark-summary.test.ts tools/evaluator/__tests__/discoverer.test.ts
git commit -S -m "test: lock benchmark merge behavior"
```

## Task 4: Implement Append-Only Benchmark Merge

**Files:**
- Create: `tools/evaluator/src/core/benchmark-summary.ts`
- Modify: `tools/evaluator/src/reporters/benchmark-reporter.ts`
- Modify: `tools/evaluator/src/cli.ts`
- Modify: `tools/evaluator/src/core/types.ts`

- [ ] **Step 1: Create a focused benchmark merge module**

Create `tools/evaluator/src/core/benchmark-summary.ts` with a pure merge function:

```ts
export function mergeBenchmarkSummary(
  existing: BenchmarkSummary,
  results: EvaluationResult[],
): { summary: BenchmarkSummary; changed: boolean } {
  // preserve entries with no fresh result
  // append history only for fresh results
  // update lastUpdated only when changed === true
}
```

- [ ] **Step 2: Make the reporter delegate to the merge helper**

Refactor `tools/evaluator/src/reporters/benchmark-reporter.ts` so `updateBenchmarkSummary`:

```ts
const { summary, changed } = mergeBenchmarkSummary(existingSummary, results);
if (!changed) return { changed: false, summaryPath };
writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
return { changed: true, summaryPath };
```

- [ ] **Step 3: Return workflow-usable benchmark status from the CLI**

Adjust `tools/evaluator/src/cli.ts` so the benchmark report path can be consumed by the workflow, for example by logging or writing a small JSON payload:

```ts
{ changed: true, path: 'website/src/data/benchmarks/summary.json' }
```

Keep the command surface minimal. Do not add a second benchmark writer if the existing `report --format benchmark` path can satisfy the workflow.

- [ ] **Step 4: Run the benchmark tests until they pass**

Run:

```bash
cd tools/evaluator
npx vitest run __tests__/report-command.test.ts __tests__/benchmark-summary.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the benchmark merge implementation**

```bash
git add tools/evaluator/src/core/benchmark-summary.ts tools/evaluator/src/reporters/benchmark-reporter.ts tools/evaluator/src/cli.ts tools/evaluator/src/core/types.ts
git commit -S -m "feat: preserve benchmark history during incremental merges"
```

## Task 5: Implement Trigger, Gate, And Discovery Jobs In The Workflow YAML

**Files:**
- Modify: current evaluation workflow YAML under `.github/workflows/`

- [ ] **Step 1: Rewrite the trigger model and initial status flow**

Rewrite the current evaluation workflow YAML so it declares and explains:

```md
- pull_request -> pr-status only for same-repo PRs
- pull_request_target -> pr-status only for fork PRs
- issue_comment -> gate + full /evaluate pipeline
- workflow_dispatch -> manual pipeline with evaluate_all support
- schedule -> scheduled incremental pipeline
```

Required behaviors:

- `pull_request` and `pull_request_target` only post initial `evaluation-status`
- `pr-status` resolves `evaluation-status` to `success` when no relevant asset changed
- `pr-status` resolves `evaluation-status` to `pending` when relevant assets changed and `/evaluate` is required
- no PR trigger path leaves `evaluation-status` stuck in `Expected`

- [ ] **Step 2: Implement the `/evaluate` gate contract explicitly in the workflow YAML**

Add concrete gate behavior for:

```md
- comment must be on a PR
- comment must start with /evaluate
- commenter must have write, maintain, or admin permission
- gate outputs must include PR number, base SHA, head SHA, and fork status
```

- [ ] **Step 3: Implement incremental discovery job behavior in the authored workflow**

The workflow YAML must make `discover` responsible for:

```md
- building to_evaluate and to_skip
- treating workflow/evaluator changes as infra invalidation
- using the benchmark summary as the previous baseline for manual and scheduled runs
- including only assets that have matching test scenarios
- forcing all eligible assets into to_evaluate when workflow_dispatch uses evaluate_all=true
- producing an empty matrix when nothing needs evaluation
```

- [ ] **Step 4: Validate the workflow YAML and fix syntax errors**

Run:

```bash
cd tools/evaluator
node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parse } from 'yaml'; parse(readFileSync('../../.github/workflows/<current-evaluation-workflow>.yml', 'utf8')); console.log('YAML OK');"
```

Expected: the workflow YAML parses successfully.

- [ ] **Step 5: Commit the trigger/gate/discovery rewrite**

```bash
git add .github/workflows/
git commit -S -m "feat: add gated incremental evaluation workflow entrypoints"
```

## Task 6: Implement Evaluate, Merge, Persist, And Report Jobs In The Workflow YAML

**Files:**
- Modify: current evaluation workflow YAML under `.github/workflows/`

- [ ] **Step 1: Add the evaluate and merge-benchmark job contract**

Ensure the workflow YAML makes these responsibilities explicit:

```md
- evaluate runs only for to_evaluate entries
- evaluate produces per-asset artifacts
- merge-benchmark is the only stage allowed to modify summary.json in the pipeline workspace
- merge-benchmark emits a workflow-usable changed/path status payload
- persist-benchmark runs only when merge-benchmark reports changed=true
```

- [ ] **Step 2: Encode trusted/untrusted ref rules and persistence rules explicitly**

Ensure the workflow YAML says:

```md
- fork PR workflow logic comes from the default branch
- evaluator code stays on the default branch for fork PRs
- fork PR asset/test content is fetched read-only with persist-credentials: false
- same-repo PRs may evaluate PR-head evaluator changes
- /evaluate runs never execute persist-benchmark
- workflow_dispatch may execute persist-benchmark only on the default branch
- schedule may execute persist-benchmark on the default branch
```

- [ ] **Step 3: Implement the status and reporting contract explicitly**

Add concrete workflow requirements for:

```md
- pr-status sets the initial evaluation-status context
- report sets the final evaluation-status context
- /evaluate runs publish a PR comment plus Actions summary
- scheduled and manual runs publish an Actions summary
- persist-benchmark uses concurrency or pull-before-push reconciliation
- report includes evaluated, skipped, and failed counts
- report includes per-asset status lines
- report preserves previous skipped status when useful
- report includes the workflow run link
```

- [ ] **Step 4: Use SHA-pinned GitHub Actions references in the workflow YAML**

If the workflow YAML references standard GitHub Actions, pin them by full commit SHA rather than `@v4`, `@v5`, or other version tags.

- [ ] **Step 5: Validate the workflow YAML and fix syntax errors**

Run:

```bash
cd tools/evaluator
node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parse } from 'yaml'; parse(readFileSync('../../.github/workflows/<current-evaluation-workflow>.yml', 'utf8')); console.log('YAML OK');"
```

Expected: the workflow YAML parses successfully.

- [ ] **Step 6: Commit the evaluate/merge/report workflow rewrite**

```bash
git add .github/workflows/
git commit -S -m "feat: add benchmark merge and reporting pipeline jobs"
```

## Task 7: Align Website Source Labels With The Canonical Contract

**Files:**
- Modify: `website/src/pages/benchmarks.astro`

- [ ] **Step 1: Add a failing website-facing assertion or checklist for source labels**

Add an executable validation step by searching the page source before changing it:

```bash
rg "slash-command|scheduled|manual|pr" website/src/pages/benchmarks.astro
```

Expected before the change: the file still contains `slash-command` and the canonical labels table.

- [ ] **Step 2: Update the benchmarks page to the canonical source vocabulary**

Modify `website/src/pages/benchmarks.astro` so it no longer expects `slash-command` and remains backward-compatible only if historical data still contains it.

- [ ] **Step 3: Verify the source vocabulary is consistent across code**

Run:

```bash
rg "slash-command|scheduled|manual|pr" tools/evaluator website/src/pages/benchmarks.astro
```

Expected: active code paths use only `scheduled`, `manual`, and `pr` as canonical source values.

- [ ] **Step 4: Commit the source-label alignment**

```bash
git add website/src/pages/benchmarks.astro tools/evaluator/src/core/types.ts
git commit -S -m "fix: align benchmark source labels across site and evaluator"
```

## Task 8: Run End-To-End Validation

**Files:**
- Verify only: current evaluation workflow YAML under `.github/workflows/`
- Verify only: `tools/evaluator/src/**`
- Verify only: `tools/evaluator/__tests__/**`
- Verify only: `website/src/pages/benchmarks.astro`

- [ ] **Step 1: Run the full evaluator test suite**

Run:

```bash
cd tools/evaluator
npm test
```

Expected: PASS.

- [ ] **Step 2: Run type checking**

Run:

```bash
cd tools/evaluator
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Re-validate the workflow YAML**

Run:

```bash
cd tools/evaluator
node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parse } from 'yaml'; parse(readFileSync('../../.github/workflows/<current-evaluation-workflow>.yml', 'utf8')); console.log('YAML OK');"
```

Expected: PASS.

- [ ] **Step 4: Verify the benchmark file is not accidentally rewritten during validation**

Run:

```bash
git diff -- website/src/data/benchmarks/summary.json
```

Expected: no unexpected diff unless a trusted benchmark persistence step was intentionally executed.

- [ ] **Step 5: Commit the validation pass**

```bash
git add .github/workflows/ tools/evaluator/src tools/evaluator/__tests__
git commit -S -m "test: validate unified evaluation pipeline"
```