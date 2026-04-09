# Evaluation Pipeline Design

## Goal

Replace the current evaluation workflow prompt with a pipeline-oriented design that:

- supports same-repository PRs, fork PRs, manual runs, and scheduled runs
- evaluates only when needed by default
- preserves existing benchmark data when nothing changed
- updates `website/src/data/benchmarks/summary.json` only from newly produced evaluation results
- exposes a clear status and report flow for maintainers

## Scope

This document is the source of truth for the evaluation pipeline design in the `copilot-instructions` repository.

Its primary implementation target is the evaluation workflow authored under `.github/workflows/`.

The workflow is expected to keep evaluating these asset types:

- `skills/<name>`
- `instructions/<name>.instructions.md`
- `plugins/<name>`

with their corresponding test roots under `tests/`.

## Constraints

- Fork PR evaluation must use the default branch workflow definition for security.
- The workflow must not run a full evaluation when no evaluation is needed.
- Existing benchmark history must not be overwritten when no asset has changed.
- The site data file `website/src/data/benchmarks/summary.json` must remain the canonical persisted output for benchmark visualization.
- Evaluation runs should produce intermediate artifacts first, then merge them into benchmark data in a dedicated job.
- GitHub Actions used by the workflow must be pinned by full commit SHA, not by floating tags or version aliases.

## Recommended Trigger Model

The workflow should be unified and support these triggers:

- `pull_request`
- `pull_request_target`
- `issue_comment` for `/evaluate`
- `workflow_dispatch`
- `schedule`

### Trigger responsibilities

`pull_request`

- Used for same-repository PRs.
- Computes whether evaluation-relevant assets changed.
- Posts an initial commit status.

`pull_request_target`

- Used for fork PRs.
- Runs from the base branch workflow for security.
- Computes whether evaluation-relevant assets changed.
- Posts an initial commit status.

`issue_comment`

- Accepts `/evaluate` only on PRs.
- Allows maintainers to trigger the full evaluation pipeline.
- Verifies commenter permissions before accessing PR metadata or secrets.

`workflow_dispatch`

- Allows manual execution.
- Supports an `evaluate_all` input to force reevaluation.

`schedule`

- Runs on a cadence for background maintenance.
- Should remain incremental by default instead of forcing reevaluation.

## Trigger-To-Job Matrix

The unified workflow should not run the full evaluation pipeline for every event.

`pull_request`

- Same-repository PRs only.
- Runs `pr-status`.
- Does not run `evaluate` automatically.

`pull_request_target`

- Fork PRs only.
- Runs `pr-status` from the default branch.
- Does not run `evaluate` automatically.

`issue_comment`

- When the comment starts with `/evaluate` on a PR, runs `gate` -> `discover` -> `evaluate` -> `merge-benchmark` -> `report`.
- Never runs `persist-benchmark`.

`workflow_dispatch`

- Runs `discover` -> `evaluate` -> `merge-benchmark` -> `report`.
- Runs `persist-benchmark` when executed on the default branch.

`schedule`

- Runs `discover` -> `evaluate` -> `merge-benchmark` -> `persist-benchmark` -> `report`.

## Ref Resolution And Checkout Rules

The design must explicitly separate workflow code, evaluator code, and evaluated content.

### Same-repository PR via `/evaluate`

- Workflow logic runs from the default branch because the trigger is `issue_comment`.
- Evaluated asset content is checked out from the PR head SHA.
- Evaluator code under `tools/evaluator` may be checked out from the PR head SHA because the PR source is trusted.

### Fork PR via `/evaluate`

- Workflow logic runs from the default branch.
- Evaluator code under `tools/evaluator` runs from the default branch only.
- Evaluated asset content and matching tests are fetched from the PR head SHA in a read-only checkout or worktree with `persist-credentials: false`.
- Untrusted PR content must never replace the trusted workflow or evaluator runtime.

### Manual and scheduled runs

- Workflow logic, evaluator code, and evaluated assets all come from the checked out branch.
- Durable benchmark persistence is allowed only when the run executes on the default branch.

## Security Model

The workflow should follow this security model:

- For fork PRs, the workflow logic always comes from the default branch.
- PR content may be checked out for evaluation as untrusted input only after permission checks are satisfied.
- Secrets are available only in trusted execution contexts.
- `/evaluate` is accepted only from users with `write`, `maintain`, or `admin` permission.

## Pipeline Shape

The workflow should be structured as explicit jobs.

### 1. `pr-status`

Purpose:

- determine whether evaluation is expected for a PR
- ensure required checks do not remain stuck in `Expected`

Behavior:

- if no relevant asset changed, post `success` with a message equivalent to `No assets to evaluate`
- if relevant assets changed, post `pending` with a message equivalent to `Post /evaluate to trigger evaluation`

### 2. `gate`

Purpose:

- validate `/evaluate` commands
- centralize authorization and PR metadata lookup

Outputs:

- PR number
- head SHA
- base SHA
- whether the PR comes from a fork

Behavior:

- fail fast if the comment is not on a PR
- fail fast if the comment does not start with `/evaluate`
- fail fast if the commenter lacks sufficient permissions

### 3. `discover`

Purpose:

- compute the evaluation plan
- decide what must be evaluated and what must be skipped

Outputs:

- `to_evaluate`
- `to_skip`
- a matrix payload for evaluation
- a flag for infrastructure changes

Discovery rules:

- detect changed assets among `skills`, `instructions`, and `plugins`
- include only assets that have matching test scenarios
- if infrastructure affecting evaluation changed, mark all evaluable assets for evaluation
- if nothing requires evaluation, produce an empty evaluation matrix

Infrastructure changes should include at least:

- the evaluation workflow source under `.github/workflows/`
- generated evaluation workflow YAML if present
- `tools/evaluator/**`

### Deterministic freshness algorithm

`discover` should make decisions per asset type using both source paths and test paths.

Asset mappings:

- skill `<name>` -> source `skills/<name>` and tests `tests/skills/<name>`
- instruction `<name>` -> source `instructions/<name>.instructions.md` and tests `tests/instructions/<name>`
- plugin `<name>` -> source `plugins/<name>` and tests `tests/plugins/<name>`

PR-triggered incremental discovery:

- compare the PR base SHA and head SHA
- mark an asset for evaluation when any file under its source path or test path changed

Scheduled and manual incremental discovery:

- read the latest benchmark history item for each asset
- use that history item's recorded commit SHA as the previous evaluation baseline
- compare current source and test content against the content at that recorded commit
- if both source and tests are unchanged, skip the asset
- if either source or tests changed, evaluate the asset

Fallback rule:

- if the recorded baseline commit or path can no longer be resolved, evaluate the asset instead of skipping it

Canonical comparison method:

- for file-backed assets, compare file content hashes
- for directory-backed assets, compare a deterministic digest built from the sorted relative file list plus each file content hash

If an asset has no previous benchmark history, it must be evaluated.

### 4. `evaluate`

Purpose:

- execute evaluation for each planned asset

Behavior:

- run only for entries present in `to_evaluate`
- produce one structured result per asset as an artifact
- keep asset runs isolated so failures are attributable and rerunnable
- continue collecting results even if one asset fails

Important boundary:

- this job must not update `website/src/data/benchmarks/summary.json` directly

### 5. `merge-benchmark`

Purpose:

- merge newly produced evaluation results into site benchmark data

Inputs:

- existing `website/src/data/benchmarks/summary.json`
- artifacts produced by `evaluate`

Behavior:

- read the current benchmark file
- index existing entries by asset ID
- create a new benchmark history item only for assets that produced a fresh result in the current run
- preserve all existing entries that received no fresh result
- update `lastUpdated` only when the benchmark file was logically changed

This job is the only job allowed to modify `website/src/data/benchmarks/summary.json`.

### 5b. `persist-benchmark`

Purpose:

- durably publish the updated benchmark file when the run context is trusted

Behavior:

- runs only when `merge-benchmark` produced a logical change
- runs only on the default branch in trusted contexts
- persists the updated `website/src/data/benchmarks/summary.json` back to the default branch with a direct bot commit so the site can render the new evaluation history
- does not run for untrusted fork PR content

Recommended policy:

- PR `/evaluate` runs produce an updated benchmark artifact and report output, but do not push benchmark data
- scheduled runs persist benchmark updates to the default branch
- manual runs persist benchmark updates only when executed on the default branch

Concurrency requirement:

- `persist-benchmark` must use workflow concurrency or a pull-before-push reconciliation step to avoid losing benchmark history when multiple trusted runs complete close together

### 6. `report`

Purpose:

- publish the final result to humans and branch protection

Behavior:

- set the final commit status
- publish a PR comment for `/evaluate` runs
- write a GitHub Actions summary for all runs
- clearly distinguish `evaluated`, `skipped`, and `failed` assets

## Incremental Evaluation Policy

The default policy should be incremental.

An asset should be evaluated when one of these conditions is true:

- it has never been evaluated before
- its source content changed since the latest recorded evaluation
- its corresponding tests changed since the latest recorded evaluation
- evaluation infrastructure changed and a full refresh is required
- the run was manually forced with `evaluate_all=true`

An asset should be skipped when all of these conditions are true:

- it already has at least one evaluation in benchmark history
- its source content did not change
- its corresponding tests did not change
- evaluation infrastructure did not require reevaluating it
- the run was not forced

## Persistence Rules For Benchmark Data

These rules are mandatory.

### Rule 1: Never erase an existing evaluation when nothing changed

If there is no update for a `skill`, `instruction`, or `plugin`, and the asset already has recorded history, the workflow must keep the existing benchmark entry unchanged.

### Rule 2: Only merge fresh results

`merge-benchmark` must only append history items for assets that produced fresh evaluation results during the current run.

### Rule 3: No synthetic empty rewrite

If no assets were evaluated, the workflow must not replace benchmark content with an empty or reduced dataset.

### Rule 4: Preserve history

The benchmark file remains append-only at the history level.
Existing history items are never rewritten or dropped during a normal evaluation run.

### Rule 5: Persist only from trusted contexts

Durable publication of `website/src/data/benchmarks/summary.json` happens only from trusted default-branch contexts.
PR evaluation may generate a candidate updated file, but must not publish it durably.

## Scheduled Run Recommendation

Scheduled runs should also be incremental by default.

Recommended behavior:

- if an asset changed since its last evaluation, evaluate it
- if an asset was never evaluated, evaluate it
- otherwise skip it

This keeps costs controlled while preserving meaningful historical updates.

If periodic full rebasing is ever needed, it should be exposed as a separate explicit manual option instead of being the default scheduled behavior.

## Reporting Model

The workflow summary and PR comment should include:

- run trigger type
- total asset counts for `evaluated`, `skipped`, and `failed`
- per-asset status
- score and pass rate for evaluated assets
- preserved previous status for skipped assets when useful
- link to the workflow run

## Benchmark History Contract

Each newly appended benchmark history item must persist a canonical `source` value.

Allowed values:

- `scheduled` for `schedule`
- `manual` for `workflow_dispatch`
- `pr` for `/evaluate` runs triggered from PR comments

The workflow, report output, and website consumers must use the same source vocabulary.

## Branch Protection And Status Contract

The workflow must publish a single stable commit status context named `evaluation-status`.

Contract:

- `pr-status` sets the initial `evaluation-status` value for PRs
- `report` sets the final `evaluation-status` value for `/evaluate` runs
- all PR trigger paths that participate in branch protection must update the same `evaluation-status` context
- when no evaluation is needed, `evaluation-status` must resolve to `success` instead of remaining pending or absent

## Non-Goals

- Rebuilding unrelated site content outside benchmark data
- Overwriting benchmark history for unchanged assets
- Running evaluation automatically for every PR event without a necessity check
- Allowing fork-controlled workflow logic to access privileged execution paths

## Resulting Design Decision

Adopt a unified, secure, pipeline-based evaluation workflow with incremental discovery, artifact-based evaluation, and a dedicated benchmark merge stage.

This design keeps evaluation costs under control, preserves existing site data, and gives maintainers explicit control over PR-triggered evaluation.