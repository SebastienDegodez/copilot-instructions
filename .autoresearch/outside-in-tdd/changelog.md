# Autoresearch Changelog — outside-in-tdd

## Experiment 0 — baseline

**Score:** 24/30 (80.0%)
**Change:** None — original skill, no modifications
**Reasoning:** Baseline measurement before any mutations. Identified weak points before touching anything.
**Result:** EVAL 5 (Emergent design) scores 0/5 across all 5 test inputs — the skill mentions "let design emerge" only as passive bullets in Step 2 and a row in the Common Mistakes table, with no hard STOP/BLOCK instruction. EVAL 6 (Mutation testing closure) scores 4/5 — the REQUIRED instruction exists in two places but sits after the main workflow steps, causing one in five runs to miss it. All other evals (Gherkin gate, boundary mocking, pure domain tests, business naming) pass perfectly at 5/5.
**Failing outputs:** All 5 test inputs fail EVAL 5 — AIs design domain classes upfront before writing tests. 1/5 test inputs miss the mutation testing step (EVAL 6).

---

## Experiment 1 — keep

**Score:** 28/30 (93.3%)
**Change:** Added an explicit STOP block at the top of Step 2 ("Let Domain Emerge") forbidding creation of any domain class, value object, entity, policy, or enum before the first test compilation failure
**Reasoning:** The skill previously mentioned "no design upfront" as passive advice. Adding a hard STOP instruction — same pattern used by gherkin-gate which scores 5/5 — was expected to activate the constraint reliably. One targeted change, targeting the single biggest failure (EVAL 5: 0/5).
**Result:** EVAL 5 improved from 0/5 to 4/5 (+4 points). The blocking language triggered compliance in 4 of 5 scenarios. One run still failed — the AI recognised the existing codebase domain (EligibilityPolicy etc.) and created it upfront rather than waiting. All other evals unchanged.
**Failing outputs:** 1/5 test inputs still produce domain classes before compilation failure (EVAL 5) when the domain is already familiar from codebase context. 1/5 test inputs still miss mutation testing (EVAL 6).

---

## Experiment 2 — keep

**Score:** 29/30 (96.7%)
**Change:** Added explicit "Step 3: Verify with Mutation Testing" as a numbered workflow step immediately after Step 2 in the Outside-In Approach section, placing the mutation-testing REQUIRED instruction in-flow rather than in a trailing reference section
**Reasoning:** The mutation testing instruction appeared only in a "Mutation Testing" section and the Integration footer — both placed after the main workflow. AI models follow numbered sequential steps more reliably than trailing references. Promoting it to Step 3 ensures it fires in order alongside Steps 1 and 2.
**Result:** EVAL 6 improved from 4/5 to 5/5 (+1 point). The step is now in-flow and consistently followed. EVAL 5 remained at 4/5 — the one edge case (familiar domain context) persists.
**Failing outputs:** 1/5 test inputs still produce domain classes before test failures (EVAL 5) when the AI recognises the domain from the existing codebase.

---

## Experiment 3 — keep

**Score:** 30/30 (100.0%)
**Change:** Extended the Step 2 STOP block with an explicit "even if you already know the domain from context, create nothing until the test's compilation failure confirms what's needed" clause
**Reasoning:** The last failing EVAL 5 case occurred specifically when the domain (EligibilityPolicy, VehicleInfo, etc.) already exists in the codebase. The AI recognised it and created objects upfront. Explicitly calling out the familiar-domain scenario by name removes the implicit loophole.
**Result:** EVAL 5 reached 5/5. All 6 evals pass for all 5 test inputs. Perfect score: 30/30 (100%).
**Failing outputs:** None — all evals pass for all 5 test inputs.

---

## Experiment 4 — discard

**Score:** 30/30 (100.0%)
**Change:** Attempted to add a wrong-way anti-example showing an acceptance test with a mocked domain object (EligibilityPolicy mocked via A.Fake<>) to reinforce boundary-only mocking (EVAL 2/3)
**Reasoning:** At 100%, the only possible gain would be robustness. A concrete negative example often helps models avoid the shown mistake — even if current evals don't catch it, it provides future resilience.
**Result:** Score unchanged at 30/30. The skill already demonstrates correct mocking in both code examples. The anti-example added length without altering any eval outcome. Per autoresearch rules, same-score = DISCARD (simpler is better). Reverted to Experiment 3 state.
**Failing outputs:** None, but no improvement either. Loop terminates: 3 consecutive experiments at ≥95% (Exp 2: 96.7%, Exp 3: 100%, Exp 4: 100%).
