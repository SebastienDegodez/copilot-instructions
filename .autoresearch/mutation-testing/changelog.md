## Experiment 0 — baseline

**Score:** 22/30 (73.3%)
**Change:** Original skill — no changes
**Reasoning:** Establishing baseline before any mutations
**Result:** Strong on full-workflow inputs (1 and 5: 6/6 each). Weak on sub-task inputs.
**Failing outputs:**
- E1 (Green baseline check): fails on inputs 2, 3, 4 — skill only states green baseline in "When to Use" and Step 1 Verify Prerequisites, not in targeted sub-task responses
- E3 (Excludes infrastructure): fails on inputs 2 and 4 — file-scoped debug commands omit exclusion flags
- E2 (Correct scope): fails on input 4 — pure JSON analysis task produces no dotnet stryker scoping
- E5 (CLI command): fails on input 4 — JSON analysis task only shows jq command, no dotnet stryker command
- E4 (Survivor classification): fails on input 3 — CI setup context doesn't naturally trigger survivor analysis content

---

## Experiment 5 — keep

**Score:** 30/30 (100.0%) — 3rd consecutive ≥95%, loop stopped
**Change:** Replaced remaining `MonAssurance`-specific `.csproj` and path references in the "On changed code only" and "Full business logic scope" and "Cumulative baseline in CI" commands with generic `<YourProject>` placeholders.
**Reasoning:** Consistency — the debug command was already generic (from Exp 2). Remaining project-specific names in other commands created inconsistency and risked over-fitting agent outputs to the MonAssurance project.
**Result:** Score unchanged at 30/30. Full genericity achieved across all CLI examples.
**Failing outputs:** None.

---

## Experiment 4 — keep

**Score:** 30/30 (100.0%)
**Change:** Added a callout after the CI/CD integration command: "When the CI gate fails, investigate each survivor. Do not raise the threshold to pass — classify each as real gap or equivalent mutant."
**Reasoning:** E4 (Survivor classification) still failed on input 3 (CI setup). Adding the survivor investigation requirement directly in the CI section gives agents a natural reason to mention classification in CI context.
**Result:** Input 3 E4 went from ❌ to ✅. All 5 inputs now 6/6. Score 30/30.
**Failing outputs:** None.

---

## Experiment 3 — keep

**Score:** 29/30 (96.7%) 🎯
**Change:** Added "after classifying survivors, always include a targeted re-run command" block with a generic scoped command (exclusions included) at the end of Step 4 Analyze Survivors.
**Reasoning:** Input 4 (analyze JSON) failed E2+E3+E5 because the analysis context produced only a jq command. Adding an explicit bridge "after analysis → include a stryker re-run command" gives agents a concrete instruction to produce all three.
**Result:** Input 4 went from 3/6 to 6/6. E2 5/5, E3 5/5, E5 5/5 all reached. Net +3 pts. Hit 96.7% ≥ 95% threshold.
**Remaining failures:**
- Input 3 (CI setup) E4: survivor classification not triggered by CI setup context — 1 remaining point

---

## Experiment 2 — keep

**Score:** 26/30 (86.7%)
**Change:** Replaced project-specific file-scoped debug command with a generic one including exclusion flags (`!**/*Marker.cs`, `!**/DependencyInjection.cs`).
**Reasoning:** E3 (Excludes infrastructure) still failed on input 2 (kill survivor) because the debug command lacked exclusion flags. Making it generic also removes the MonAssurance coupling.
**Result:** E3 went from 4/5 to 4/5... wait, input 2 E3 now ✅. Corrected: E3 went from 3/5 to 4/5. Net +1 pt.
**Failing outputs:**
- Input 4 (analyze JSON) still fails E2+E3+E5 — analysis-only context doesn't naturally produce a dotnet stryker command
- Input 3 (CI setup) still fails E4 — survivor classification not triggered in CI setup context

---

## Experiment 1 — keep

**Score:** 25/30 (83.3%)
**Change:** Added a universal prerequisite callout blockquote at the top of the Workflow section, before Step 1.
**Reasoning:** E1 failed on 3/5 inputs (sub-task requests skip "When to Use"). Moving the green baseline requirement to the top of Workflow makes it visible regardless of which section an agent enters from.
**Result:** E1 went from 2/5 to 5/5. Other evals unchanged. Net +3 pts.
**Failing outputs:**
- E2+E3+E5 still fail on input 4 (JSON analysis has no reason to produce a dotnet stryker command)
- E3 still fails on input 2 (file-scoped debug command doesn't include exclusion flags)
- E4 still fails on input 3 (CI setup doesn't trigger survivor classification content)
