---
name: mutation-testing
description: Use when running mutation testing, killing mutants, verifying test quality, checking mutation score, or analyzing survivors after the test baseline is green
---

# Mutation Testing

Add a third validation layer to Outside-In TDD workflow.
Acceptance tests verify WHAT (observable behavior), Domain tests verify HOW (business rules), mutation testing verifies tests **actually catch bugs**.

## Core Concept

Mutation testing introduces deliberate bugs (mutants) into source code, then runs the test suite. If tests fail, the mutant is **killed** ✓. If tests pass despite the bug, the mutant **survives** ✗ (test gap found).

```
Source code → introduce mutation → run tests
                                     ├── tests FAIL → mutant killed ✓
                                     └── tests PASS → mutant survived ✗
```

A project with 100% code coverage can still have a 60% mutation score — meaning 40% of introduced bugs go undetected.

## When to Use

Run mutation testing **after the relevant test baseline is green**:

1. ✅ Core behavior tests pass
2. ✅ Rule-focused tests pass
3. 🧬 **Mutation testing** — verify tests detect regressions

**Never run on red baseline** — mutation assumes tests work correctly first.

## Approach for .NET/C#

### Primary: Stryker.NET (Recommended)

For .NET projects, [Stryker.NET](https://stryker-mutator.io/docs/stryker-net/introduction/) is the established mutation framework with excellent C# support. **No config file needed** — all options are passed via CLI.

**Install (only if not already available):**
```bash
# Check first — if this succeeds, skip installation entirely. Do NOT manipulate PATH.
dotnet stryker --version

# Only run if the above command fails (tool not found)
dotnet tool install -g dotnet-stryker
```

**Run on changed code only (default workflow — use after every story):**
```bash
# Mutate only files changed since main — fast, targeted
dotnet stryker \
  --project src/YourProject.Domain/YourProject.Domain.csproj \
  -tp tests/YourProject.UnitTests/YourProject.UnitTests.csproj \
  --mutate "**/*.cs" --mutate "!**/*Marker.cs" --mutate "!**/DependencyInjection.cs" \
  --since:main \
  --break-at 100 \
  -r json
```

> `--since:main` — only mutants within git-diff vs `main` are tested. Unchanged code produces no result. Fast.

**Run full business logic (use before merge):**
```bash
dotnet stryker \
  --project src/YourProject.Core/YourProject.Core.csproj \
  -tp tests/YourProject.UnitTests/YourProject.UnitTests.csproj \
  --mutate "src/YourProject.Core/**/*.cs" \
  --mutate "src/YourProject.Application/**/*.cs" \
  --mutate "!**/*Marker.cs" --mutate "!**/DependencyInjection.cs" \
  --break-at 100 \
  --threshold-high 90 --threshold-low 80 \
  -r json -r cleartext
```

**Cumulative baseline — full picture after incremental runs:**
```bash
# --with-baseline combines --since with a persistent baseline report
# Use this in CI to keep a full history while only re-testing changed code
dotnet stryker \
  --project src/YourProject.Core/YourProject.Core.csproj \
  -tp tests/YourProject.UnitTests/YourProject.UnitTests.csproj \
  --with-baseline:main \
  --break-at 100 \
  -r json
```

> `--with-baseline` = `--since` + saves/loads a baseline report. Gives a complete score even when only changed files were re-tested.

### Alternative: Custom Mutation Tool (For Specific Needs)

Build a custom tool only when:
- Stryker doesn't cover domain-specific mutation patterns
- You need tight integration with custom test infrastructure
- Performance optimization requires targeted mutation scope

**Architecture (3 modules):**
1. **Mutations** — rules table (`+` → `-`, `true` → `false`, `>=` → `>`)
2. **Runner** — source-to-test mapping, targeted test execution
3. **Core** — orchestration: apply mutation → run tests → restore → report

For full custom tool reference, see Uncle Bob's [empire-2025 mutation testing](https://github.com/unclebob/empire-2025/blob/master/docs/plans/2026-02-21-mutation-testing.md).

## Core Mutation Categories

| Category | Examples |
|----------|----------|
| Arithmetic | `+` ↔ `-`, `*` ↔ `/`, `++` ↔ `--` |
| Comparison | `>` ↔ `>=`, `<` ↔ `<=`, `==` ↔ `!=` |
| Boolean | `true` ↔ `false`, `&&` ↔ `\|\|`, `!x` ↔ `x` |
| Conditional | negate conditions, swap if/else branches |
| Constant | `0` ↔ `1`, `""` ↔ `"mutant"`, `null` ↔ `new()` |
| Return value | `return true` → `return false` |
| Void method | remove method call entirely |
| LINQ | `.Any()` ↔ `.All()`, `.First()` ↔ `.Last()` |

## Workflow

### Step 1: Verify Prerequisites

Before running mutation testing, confirm:
- ✅ Baseline tests are green for the mutated scope
- ✅ Meaningful unit tests exist (mutation runs against unit tests)
- ✅ No uncommitted changes (mutations modify source temporarily)
- ✅ Tests are fast (< 100ms each) — slow tests = slow mutation runs

### Step 2: Set Mutation Scope

**Target critical business logic first:**
- Domain policies, decision engines, pricing/risk calculators
- Application orchestration with complex conditionals
- Validation rules and boundary behavior

**Exclude from mutation:**
- DTOs, data structures without logic
- Infrastructure (repositories, adapters)
- Configuration, DependencyInjection files
- Generated code, marker interfaces

**Progressive scoping:**
| Phase | Scope | Goal |
|-------|-------|------|
| Week 1-2 | One critical rule module | Baseline + learning |
| Week 3-4 | All core rule modules | Establish quality gate |
| Ongoing | Core + critical orchestration handlers | Full confidence |

### Step 3: Run Mutations

**During development (fast, on changed code only):**
```bash
dotnet stryker \
  --project src/YourProject.Core/YourProject.Core.csproj \
  -tp tests/YourProject.UnitTests/YourProject.UnitTests.csproj \
  --since:main \
  --break-at 100 \
  -r json
```

**Before merge (full business logic scope):**
```bash
dotnet stryker \
  --project src/YourProject.Core/YourProject.Core.csproj \
  -tp tests/YourProject.UnitTests/YourProject.UnitTests.csproj \
  --mutate "src/YourProject.Core/**/*.cs" \
  --mutate "src/YourProject.Application/**/*.cs" \
  --mutate "!**/*Marker.cs" --mutate "!**/DependencyInjection.cs" \
  --break-at 100 \
  -r json -r cleartext
```

**Metrics:**
- Total mutants generated
- Mutants killed (tests caught the bug ✓)
- Mutants survived (test gap ✗)
- Mutation score: (killed / total) × 100

> **`--since` note:** unchanged files produce no result — this is expected. Survivors and kills only apply to the diff scope.

**Expected duration:** `--since` run: ~1-3 min. Full run: ~5-15 min (depends on test suite speed).

### Step 4: Analyze Survivors

Query survivors directly from the JSON report — do **not** read the full file:

```bash
jq '[.files | to_entries[] | {file: .key, survivors: [.value.mutants[] | select(.status == "Survived") | {mutator: .mutatorName, line: .location.start.line, replacement: .replacement}]}] | map(select(.survivors | length > 0))' \
  StrykerOutput/$(ls -t StrykerOutput | head -1)/reports/mutation-report.json
```

For each surviving mutant:
1. **Read the mutation** — what was changed? (e.g., `>=` → `>`, removed `if` branch)
2. **Identify unguarded behavior** — which business rule isn't tested?
3. **Categorize:**
   - **Real gap** — behavior change not caught by tests
   - **Equivalent mutant** — mutation doesn't change observable behavior

**Equivalent mutant examples:**
- `x = x + 0` changed to `x = x + 1` (dead code)
- Logging statements removed (no observable effect)
- Defensive null checks when value is guaranteed non-null by type

### Step 5: Kill Surviving Mutants

For each **real survivor** (not equivalent):

1. Write a new test targeting the unguarded behavior
2. Run test against **mutated code** (using Stryker's mutation operator):
   - Expected: test FAILS (catches the bug)
3. Run test against **original code**:
   - Expected: test PASSES
4. Re-run Stryker to confirm kill

**Example:**

Survivor: `if (age >= 18)` mutated to `if (age > 18)` → survived

```csharp
// New test to kill the boundary mutant
[Fact]
public void WhenDriverIsExactly18_ShouldBeEligible()
{
    var policy = new EligibilityPolicy();
    var driver = new DriverInfo(Age: 18, LicenseYears: 1);
    var vehicle = new VehicleInfo(Type: "sedan", Age: 1);

    var result = policy.Evaluate(driver, vehicle);

    Assert.True(result.IsEligible); // Fails if mutant uses `age > 18`
}
```

### Step 6: Report & Document

Present summary with before/after metrics:

```
Mutation Testing Report — Core Business Layer
═══════════════════════════════════════
Scope: YourProject.Core.Policies

Score:  68% → 82% (after killing survivors)
Killed:   82 / 100
Survived:  18 → 10

New tests added: 8
- Boundary tests for age/experience thresholds: 4
- Edge cases for vehicle type combinations: 3
- Null/empty validation: 1

Remaining survivors (equivalent mutants — documented):
- EligibilityPolicy.cs:L42 — removed log statement (no observable effect)
- DriverAge.cs:L15 — defensive null check (guaranteed non-null by type)
```

**Document legitimate survivors** in code comments or architecture decision records.

## Mutation Score Targets

Set thresholds based on team policy and risk profile. Common practice is to start with a progressive threshold and tighten it over time.

| Score | Assessment | Action |
|-------|-----------|--------|
| High threshold met | Healthy signal | Keep survivor review discipline |
| Near threshold | Potential gaps | Add targeted tests for risky survivors |
| Below threshold | Quality risk | Block merge or require mitigation plan |

Equivalent mutants are the only legitimate exception — document them explicitly.

## Progressive Threshold Strategy

| Phase | Threshold | Enforcement |
|-------|-----------|-------------|
| Week 1-2 | Baseline only | Measure, learn mutation categories |
| Week 3-4 | Team-defined threshold (e.g., 80%) | Block PR if below |
| Month 2 | Tightened threshold (e.g., 90%) | Ramp up |
| Steady state | Risk-based target per module | Block merge when policy is not met |

**CI/CD integration:**
```bash
# In CI pipeline - fail build if below 100%
dotnet stryker --break-at [team-threshold]
```

## Integration with Outside-In TDD

Mutation testing is the **third validation layer**:

```
1. Gherkin scenarios (WHAT)       → Acceptance tests
2. Business rules (HOW)            → Domain tests  
3. Test effectiveness (REAL?)     → Mutation testing
```

**Workflow integration:**
1. Write Gherkin scenario (outside-in-tdd)
2. RED → validate → SYNTHESIZE GREEN (red-synthesize-green)
3. **After story complete:** Run mutation testing on affected business logic modules
4. Kill critical survivors before merge

## Anti-Patterns

### "Let me mutate before tests are green"
No. Fix failing tests first. Mutation assumes a green baseline.

### "100% is unrealistic"
Aggressive targets can be appropriate for critical logic, but thresholds are a policy decision. Equivalent mutants remain the only valid exception to survivor cleanup.

### "Mutate everything including Infrastructure"
Never mutate repositories, adapters, and pure plumbing. Focus on business logic first.

### "Run mutations on every commit"
Too slow. Run on feature completion or weekly. CI runs only on PR.

### "Ignore all survivors as equivalent"
Rationalization. Most survivors are real gaps. Investigate each one.

### "Chase the score, not the quality"
Mutation score is a signal, not the goal. Focus on killing mutants that represent real behavioral gaps.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Running mutation on failing tests | Green baseline required — fix tests first |
| Mutating test files | Configure Stryker to mutate source only |
| Treating all survivors as equivalent | Only equivalent mutants are exempt — document them, kill the rest |
| Mutation testing without fast tests | Optimize test speed — slow tests = slow mutations |
| Not scoping mutations progressively | Start small (one policy), expand gradually |
| Accepting < 100% on business logic | 100% is the target — find the gap and test it |

## Tools & Commands

**Install / update Stryker.NET:**
```bash
dotnet tool install -g dotnet-stryker
dotnet tool update -g dotnet-stryker
```

**On changed code only (fast — during development):**
```bash
dotnet stryker \
  --project MonAssurance.Domain.csproj \
  -tp ../tests/MonAssurance.UnitTests/MonAssurance.UnitTests.csproj \
  --since:main \
  --break-at 100 \
  -r json
```

**Full business logic scope (before merge):**
```bash
dotnet stryker \
  --project MonAssurance.Domain.csproj \
  -tp ../tests/MonAssurance.UnitTests/MonAssurance.UnitTests.csproj \
  --mutate "src/MonAssurance.Domain/**/*.cs" \
  --mutate "src/MonAssurance.Application/**/*.cs" \
  --mutate "!**/*Marker.cs" --mutate "!**/DependencyInjection.cs" \
  --break-at 100 \
  --threshold-high 100 --threshold-low 100 \
  -r json -r cleartext
```

**Cumulative baseline in CI (full picture + incremental speed):**
```bash
dotnet stryker \
  --project MonAssurance.Domain.csproj \
  -tp ../tests/MonAssurance.UnitTests/MonAssurance.UnitTests.csproj \
  --with-baseline:main \
  --break-at 100 \
  -r json
```

**Scope to a specific file or feature (debug a survivor):**
```bash
dotnet stryker \
  --project MonAssurance.Domain.csproj \
  -tp ../tests/MonAssurance.UnitTests/MonAssurance.UnitTests.csproj \
  --mutate "**/EligibilityPolicy.cs" \
  --break-at 100 \
  -r cleartext
```

**Inspect JSON report:**
```bash
jq '.' StrykerOutput/**/reports/mutation-report.json | head -n 120
```

**Key CLI flags reference:**

| Flag | Short | Purpose |
|------|-------|---------|
| `--project <name.csproj>` | `-p` | Source project to mutate (filename only) |
| `--test-project <path>` | `-tp` | Test project(s) — repeatable |
| `--mutate <glob>` | `-m` | Include/exclude files (prefix `!` to exclude) — repeatable |
| `--since:<committish>` | | Only test mutants in git-diff vs committish |
| `--with-baseline:<committish>` | | Like `--since` + persist baseline for full cumulative report |
| `--break-at <0-100>` | `-b` | Exit code 1 if score < value |
| `--threshold-high <0-100>` | | Score ≥ this → green |
| `--threshold-low <0-100>` | | Score < high but ≥ this → warning |
| `--reporter <name>` | `-r` | `json`, `cleartext`, `dots`, `markdown`, `html` — repeatable |
| `--concurrency <n>` | `-c` | Parallel worker count |
| `--verbosity <level>` | `-V` | `error`, `warning`, `info`, `debug`, `trace` |

## References

- [Stryker.NET Documentation](https://stryker-mutator.io/docs/stryker-net/introduction/)
- [Stryker.NET Configuration](https://stryker-mutator.io/docs/stryker-net/configuration/)
- [Uncle Bob's Mutation Testing Plan](https://github.com/unclebob/empire-2025/blob/master/docs/plans/2026-02-21-mutation-testing.md)
- [Mutation Testing Patterns](https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/)

## Integration

**REQUIRED BACKGROUND:** `superpowers-whetstone:outside-in-tdd` — defines the two test streams (Application + Domain)
**REQUIRED BACKGROUND:** `superpowers-whetstone:red-synthesize-green` — TDD cycle that produces tests to mutate

**WORKFLOW:**  
Run mutation testing after story completion, before PR/merge. Use as quality gate, not coverage metric.
