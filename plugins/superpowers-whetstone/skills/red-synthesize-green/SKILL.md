---
name: red-synthesize-green
description: Use when implementing any feature or fix using TDD, before writing any implementation code
---

# RED → SYNTHESIZE GREEN (AI TDD Cycle)

## Overview

2-step cycle replacing traditional 3-step TDD. Optimized for AI synthesis.

- **Traditional (3 steps):** RED → green (dirty) → Refactor
- **AI-Optimized (2 steps):** RED (behavior failure) → SYNTHESIZE GREEN (clean synthesis)

Architectural guidance is **mandatory** between steps.

**Hard rule:** No implementation code before RED is a clean behavior failure.

## Step 1: RED (Behavior Failure Only)

Write the failing test. Run it.

- Compilation errors = **wishful thinking phase** → implement stubs/empty returns to compile, rerun
- Assertion/behavior failure = **RED** ✓ → proceed to Step 2
- Never treat compilation errors as RED

**Programming by Wishful Thinking:** When your test won't compile, you're discovering the API you need. Stub just enough to compile, then confirm the test fails on behavior.

## Between Steps: Architectural Guidance (MANDATORY)

**Hard rule:** This step is not skippable. Do not proceed to SYNTHESIZE GREEN without completing it.

**Developer must review and explicitly validate the test before continuing.**
AI pauses here and waits for developer confirmation that the test correctly captures the intended behavior.

Orient design before synthesis:

- Which pattern? (specification, factory, builder)
- Which layer owns the logic?
- Immutability, return values vs mutations?

## Step 2: SYNTHESIZE GREEN (Clean Synthesis)

Implement complete, clean, production-ready solution in one shot.

- Follows all architectural rules and coding standards
- No dirty-then-refactor — synthesize properly from the start
- Idiomatic code, domain semantics, SOLID principles
- If test was misunderstood → revise test, restart from RED

**No iteration after SYNTHESIZE GREEN** unless RED was wrong or architectural guidance changed.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "Compilation error IS red" | No. Compilation = wishful thinking. RED = behavior failure. |
| "I'll write dirty code then refactor" | That's 3-step TDD. SYNTHESIZE GREEN produces clean code. |
| "I can skip RED, I know it'll fail" | Run it. RED proves your test catches real failures. |

## Red Flags — STOP and Restart

- Implementation code before RED is a behavior failure
- Compilation errors treated as RED
- Skipping RED entirely
- Skipping the Between Steps architectural guidance
- Proceeding to SYNTHESIZE GREEN without developer test validation
- Refining code after SYNTHESIZE GREEN instead of revising RED

**Any of these mean:** Delete code, start over with proper RED.

## Quick Reference

| Phase | What | Success Criteria |
|---|---|---|
| **RED** | Write test, stub until compiles, run | Test fails on **behavior** (assertion), not compilation |
| **Guidance** (**MANDATORY**) | Orient architectural approach + **developer validates test** | Design direction clear, developer has confirmed test |
| **SYNTHESIZE GREEN** | Synthesize complete clean solution | Tests green, architecture respected, production-ready |

## When Orchestrating Subagents (MANDATORY)

If you are an orchestrating agent using `subagent-driven-development`:

**NEVER put RED and SYNTHESIZE GREEN in the same subagent prompt.**

Split every TDD task into **two separate dispatches**:

1. **Dispatch 1 — RED only:** subagent writes test, stubs to compile, runs to confirm behavior failure, reports the failing test output
2. **YOU pause** — show the failing test to the developer, wait for explicit confirmation ("ok, proceed")
3. **Dispatch 2 — SYNTHESIZE GREEN:** only after developer approves the test

The mandatory human validation checkpoint is the **orchestrator's responsibility**. It cannot be delegated to the subagent.

**Red flags — you are violating this rule if:**
- Your subagent prompt contains both "write the failing test" AND "implement the solution"
- You wrote `PAUSE` in a plan comment but included all steps in one prompt
- You assumed the developer would confirm via the plan document

| Rationalization | Reality |
|---|---|
| "The pause is in the plan text" | Plans are documentation. Dispatch boundaries are enforcement. |
| "The subagent will stop and ask" | Subagents execute what they receive. Split the prompt. |
| "It's more efficient in one shot" | Efficiency that skips developer validation is not efficiency. |

## Integration

**REQUIRED BACKGROUND:** `superpowers-whetstone:outside-in-tdd` — defines the two test streams (Application + Domain) that this cycle drives.

## Quality Gate Ownership

This skill owns the strict TDD quality gate for business logic layers:

1. Application and Domain logic must reach **100% code coverage** before completion.
2. Mutation testing on Application and Domain logic must end with **0 non-equivalent surviving mutants**.
3. Any equivalent mutant must be explicitly documented with justification.

If one of these conditions is not met, work is not complete.

**Behavior-first workflow:** When used with `superpowers-whetstone:outside-in-tdd`:
1. `superpowers-whetstone:gherkin-gate` defines WHAT (observable behavior)
2. Acceptance tests map scenarios to executable tests (RED phase)
3. This skill enforces the RED → validation → SYNTHESIZE GREEN cycle
4. `superpowers-whetstone:mutation-testing` validates test quality after GREEN (before merge)

Pair with domain-specific testing skills for patterns and examples.
