---
name: "Evaluation Pipeline"
description: >
  Weekly skill and instruction evaluation with smart caching.
  Evaluates only changed items, updates benchmark data, and auto-commits.
  Runs on schedule (Mondays), manual dispatch, and on pull requests.

on:
  schedule:
    - cron: "0 6 * * 1"  # Every Monday 06:00 UTC
  workflow_dispatch:
    inputs:
      evaluate_all:
        description: "Force evaluate all items (ignore cache)"
        type: boolean
        default: true
      model:
        description: "LLM model to use"
        type: string
        default: "gpt-4o"
      runs:
        description: "Number of evaluation runs per scenario"
        type: string
        default: "3"
  pull_request:
    paths:
      - 'skills/**'
      - 'plugins/**'
      - 'instructions/**'
      - 'tests/**'
      - 'tools/evaluator/**'

permissions:
  contents: write
  issues: write
  pull-requests: read
  actions: read

tools:
  github:
    toolsets: [repos, issues, pull_requests, actions]
  bash: ["find", "grep", "jq", "cat", "ls", "md5sum", "date", "node", "npx"]
  cache-memory:

safe-outputs:
  create-issue:
    max: 1
  update-issue:
    max: 1
  add-comment:
    target: "*"
    max: 1

timeout-minutes: 120
---

# Evaluation Pipeline

You are an automated evaluation agent for the `SebastienDegodez/copilot-instructions` repository. Your job is to evaluate skills and instructions using the evaluator tool, update benchmark data, and report results.

## Configuration

- **Benchmark data file**: `website/src/data/benchmarks/summary.json`
- **Evaluator tool**: `tools/evaluator/`
- **Skills directory**: `skills/`
- **Instructions directory**: `instructions/`
- **Tests directory**: `tests/`
- **Default model**: Use `${{ inputs.model || 'gpt-4o' }}`
- **Default runs**: Use `${{ inputs.runs || '3' }}`
- **Force evaluate all**: `${{ inputs.evaluate_all || 'false' }}`
- **Trigger source**: `${{ github.event_name == 'schedule' && 'schedule' || github.event_name == 'workflow_dispatch' && 'manual' || 'pr' }}`

## Phase 1: Data Collection

### Step 1.1 — Load existing benchmark data

Read `website/src/data/benchmarks/summary.json` to get the current benchmark state. Remember:
- `entries[].id` format: `"skill:name"` or `"instruction:name"` or `"plugin:name"`
- `entries[].history` is an append-only array of evaluation results
- Each history entry has `date`, `commit`, `model`, `overallScore`, `passRate`, `scenarios`, `tokens`, `source`

Store the full file contents in cache-memory under key `benchmark_summary`.

### Step 1.2 — Discover all assets

Run the following bash commands to discover available assets:

```bash
find skills -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort
find instructions -maxdepth 1 -name "*.instructions.md" 2>/dev/null | sort
find plugins -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort
```

For each asset discovered, compute its file hash:

```bash
# For skills: hash the SKILL.md file
find skills -name "SKILL.md" -exec sh -c 'echo "$(md5sum "$1" | cut -d" " -f1) $1"' _ {} \;

# For instructions: hash the instructions file
find instructions -name "*.instructions.md" -exec sh -c 'echo "$(md5sum "$1" | cut -d" " -f1) $1"' _ {} \;

# For plugins: hash the plugin directory
find plugins -mindepth 1 -maxdepth 1 -type d -exec sh -c 'find "$1" -type f | sort | xargs md5sum 2>/dev/null | md5sum | cut -d" " -f1 | tr -d "\n"; echo " $1"' _ {} \;
```

Also check which assets have test scenarios:
```bash
find tests -name "scenarios.yaml" | sort
```

### Step 1.3 — Determine what needs evaluation

For each discovered asset (skill, instruction, plugin) that has a `tests/` scenario file:

1. Get the asset ID in format `kind:name` (e.g., `skill:setup-husky-dotnet`)
2. Find its entry in `benchmark_summary` (from cache-memory)
3. Check the latest history entry's date and compare with current file hash

**Skip decision logic** (unless `evaluate_all` is `true` or trigger is `manual`):
- If the trigger source is `manual` (i.e., `${{ github.event_name }}` is `workflow_dispatch`) → **EVALUATE** (manual run always evaluates all)
- If the entry has NO history → **EVALUATE** (new asset)
- If `evaluate_all` input is `true` → **EVALUATE** (forced)
- Otherwise, check both conditions:
  1. Get the latest history entry's `date`. If it is within the last 7 days (< 7 days ago) continue to condition 2, otherwise → **EVALUATE** (stale)
  2. Compare the current file hash (from Step 1.2) with the hash of the same file at the commit SHA recorded in the latest history entry. To get the old hash: `git show <commit.sha>:<relative-path-to-file> | md5sum | cut -d" " -f1`. If the hashes match → **SKIP** (unchanged). If they differ → **EVALUATE** (content changed).

Store the evaluation plan in cache-memory under key `eval_plan` as a JSON object:
```json
{
  "toEvaluate": [
    { "id": "skill:name", "kind": "skill", "name": "name", "reason": "new|changed|forced" }
  ],
  "toSkip": [
    { "id": "skill:name", "kind": "skill", "name": "name", "reason": "unchanged" }
  ]
}
```

## Phase 2: Evaluation

### Step 2.1 — Install evaluator dependencies

```bash
cd tools/evaluator && npm ci
```

### Step 2.2 — Run evaluations

For each asset in `toEvaluate` from the eval plan:

1. Create an entries file:
```bash
echo '{"entries": [{"id": "ASSET_ID", "kind": "ASSET_KIND", "name": "ASSET_NAME"}]}' > /tmp/entries-ASSET_NAME.json
```

2. Run the evaluator (from the repository root):
```bash
COMMIT_SHA=$(git rev-parse HEAD)
mkdir -p /tmp/results
cd tools/evaluator && npx tsx src/index.ts evaluate \
  --entries /tmp/entries-ASSET_NAME.json \
  --model MODEL \
  --output /tmp/results \
  --repo-root ../.. \
  --source SOURCE \
  --commit-sha "$COMMIT_SHA"
```

3. If evaluation fails for an individual asset, log the error and continue with the next asset. Do not fail the entire workflow.

4. Read the evaluation result JSON files from `/tmp/results/` after each evaluation.

### Step 2.3 — Collect results

After all evaluations, collect all result JSON files:
```bash
find /tmp/results -name "*.json" | sort
```

Read each result file and store results in cache-memory under key `eval_results`.

## Phase 3: Update Benchmark Data

### Step 3.1 — Merge results into summary.json

Load the current `website/src/data/benchmarks/summary.json`.

For each evaluation result:
1. Find or create the entry in `entries` array with matching `id`
2. If entry doesn't exist, create it with `id`, `kind`, `name`, and empty `history`
3. Build a new history entry from the evaluation result:
   ```json
   {
     "date": "<ISO8601 timestamp of evaluation>",
     "commit": {
       "sha": "<git commit SHA>",
       "url": "https://github.com/SebastienDegodez/copilot-instructions/commit/<SHA>"
     },
     "model": "<model used>",
     "overallScore": <0-10>,
     "passRate": <0-1>,
     "scenarios": [
       {
         "scenarioName": "<name>",
         "description": "<description>",
         "averageScore": <0-10>,
         "passRate": <0-1>,
         "passed": <boolean>
       }
     ],
     "tokens": { "input": <number>, "output": <number> },
     "source": "<schedule|manual|pr>"
   }
   ```
4. Append this history entry to the entry's `history` array (append-only, keep full history)
5. Update `lastUpdated` to the current ISO8601 timestamp

Write the updated summary back to `website/src/data/benchmarks/summary.json`.

### Step 3.2 — Auto-commit if data changed

Check if data was changed and commit only if so:
```bash
if ! git diff --quiet website/src/data/benchmarks/summary.json; then
  git config user.name "github-actions[bot]"
  git config user.email "github-actions[bot]@users.noreply.github.com"
  git add website/src/data/benchmarks/summary.json
  git commit -m "chore: update benchmark data [skip ci]"
  git push
fi
```

## Phase 4: Dashboard

### Step 4.1 — Build the report

Build a summary report with the following information:

**Header:**
- Run date and time (ISO8601)
- Total assets: evaluated count, skipped count, failed count
- Trigger: schedule / manual / pr

**Results table** with columns: Asset | Kind | Status | Score | Pass Rate | Last Evaluated

For each evaluated asset:
- ✅ evaluated: show score and pass rate from results
- ⏭️ skipped: show last evaluation date and score from existing benchmark data
- 🔴 failed: show error message

**Format the issue body as Markdown.**

### Step 4.2 — Create or update GitHub issue

Search for an existing open issue with label `evaluation-report` in the repository.

If found: update the issue body with the new report.
If not found: create a new issue with:
- Title: `📊 Evaluation Report`
- Body: the report built in Step 4.1
- Labels: `evaluation-report`

## Error Handling

- If evaluation fails for an individual asset: log the error, mark the asset as 🔴 failed in the dashboard, continue to next asset
- If the evaluator tool is not available or the `LLM_API_KEY` environment secret is not configured (check with `[ -z "$LLM_API_KEY" ]`): mark all assets as ⏭️ skipped with note "No LLM API key configured"
- Never fail the entire workflow due to individual asset failures
- Always produce a dashboard issue even if all evaluations failed
