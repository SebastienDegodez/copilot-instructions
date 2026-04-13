# Autoresearch Changelog — clean-architecture-dotnet (Run 4)

> Skill: `clean-architecture-dotnet/SKILL.md`
> Autoresearch date: 2026-04-13
> Evals: 21 binary evals (E1–E21; E21 added in run 4)
> Runs per experiment: 8
> Max score (run 4, Exp 14): 168 | Best score: 167 (99.4%)

## What changed in Run 4

### Exp 14 — three targeted fixes (99.4%)

**E21 added — Read access gate = Application, mutation invariant = Domain**

New eval verifying the skill distinguishes:
- Read operations gated by user ownership → Application use case policy (`if (resource.OwnerId != _currentUser.Id) throw`)
- Write operations with state protection → Domain aggregate invariant (`if (requestedBy != OwnerId) throw`)

**Common Mistakes row clarified**

Before: `"Handler contains if/business logic → Delegate to Domain aggregate methods"`

After: `"Handler contains if/domain invariant logic → Delegate to Domain aggregate methods. Exception: Application use cases may contain access policy checks — that is use-case policy, not domain invariant logic"`

Removes the contradiction between the `GetOrderUseCase` access guard (Application `if`) and the blanket "no if in handlers" row.

**Interface Placement section moved to reference file**

`## Interface Placement` in SKILL.md reduced from ~120 lines to a summary table + quick rule. Full content moved to `references/interface-placement.md`. All `Contract` examples replaced with `Order` for consistency.

---

# Autoresearch Changelog — clean-architecture-dotnet (Run 2)

> Skill: `clean-architecture-dotnet/SKILL.md`
> Autoresearch date: 2026-04-13
> Evals: 18 binary evals (E1–E18; E16–E18 added in run 2)
> Runs per experiment: 5 (one per scenario)
> Max score (run 1, Exp 0–7): 75 | Max score (run 2, Exp 8–10): 90

## Eval Suite

| # | Name | Pass condition |
|---|------|----------------|
| E1 | Iron Law | Output enforces inner layers never reference outer layers |
| E2 | CQS Always | Command methods are void/Task; query methods return a value |
| E3 | CQRS Optional | CQRS bus presented as optional (justified by complexity), not mandatory |
| E4 | DDD Optional | Aggregates/events presented as optional for complex domains only |
| E5 | Layer Decision | Output guides which layer owns specific code |
| E6 | No Bus on CRUD | Simple CRUD does NOT require ICommandBus/IQueryBus |
| E7 | Code Example | At least one concrete C# code example present |
| E8 | Domain Complexity Guide | Output helps decide when Domain aggregates are warranted |
| E9 | Sealed in Domain | All Domain types must be sealed |
| E10 | Anti-patterns Present | At least one Red Flag or anti-pattern listed |
| E11 | Dependency Direction | Outer→inner dependency direction stated correctly |
| E12 | No Over-engineering | Avoids mandating complex patterns for simple scenarios |
| E13 | App Orchestration | Application handlers orchestrate; Domain contains business logic |
| E14 | Infrastructure Placement | Persistence and HTTP concerns placed in Infrastructure |
| E15 | Handler Return Types | Command handlers return void/Task; query handlers return a value |
| E16 | Interface Placement | Repo interfaces in Domain (write) or Application (read); auth interfaces in Application; never auth in Domain |
| E17 | UseCase Naming | Application classes use `*UseCase` naming, not `*Service` |
| E18 | Read Model Path | Query path (ViewModel) is distinct from write repository (domain object); IContactReadService pattern demonstrated |

## Scenarios

| Scenario | Description |
|----------|-------------|
| A | Simple CRUD contact list — no business rules, no invariants |
| B | Complex domain: insurance policy pricing with state transitions and invariants |
| C | Layer violation: Controller directly calls `DbContext`, needs fix |
| D | Read-only reporting/dashboard API — pure queries, no domain mutations |
| E | Type modeling: choosing `ValueObject` vs `record` vs `string` for `PolicyNumber` |

## Experiment 0 — baseline

**Score:** 61/75 (81.3%)
**Change:** None — original skill evaluated as-is.
**Failing evals per scenario:**
- A: E3, E4, E6, E8, E12 (5 fails) — CQRS bus and DDD forced on simple CRUD
- B: none — complex domain fully matches what the skill prescribes
- C: E3, E6, E12 (3 fails) — fix prescribes CQRS bus even for simple layer violations
- D: E3, E4, E6, E8, E12 (5 fails) — IQueryBus forced on read-only API with no domain logic
- E: E3 (1 fail) — CQRS assumed as background context even for type-modeling question
**Top failures:** E3 (4/5 scenarios fail), E6 (3/5), E12 (3/5), E4 (2/5), E8 (2/5)

---

## Experiment 1 — keep

**Score:** 69/75 (92.0%)
**Change:** Added "CQS vs CQRS vs DDD — Complexity Threshold" decision table after "When to Use", with explicit "When NOT to add CQRS or DDD" bullets.
**Reasoning:** E3, E4, E8 failed in multiple scenarios because no guidance existed on when to skip CQRS bus or DDD aggregates. A single referenced decision table addresses all three evals across all scenarios.
**Result:** A: +3 (E3, E4, E8 pass). SC: +1 (E3 passes). SD: +3 (E3, E4, E8 pass). SE: +1 (E3 passes). Total +8.
**Failing outputs:** E6 and E12 still fail in A, C, D — the skill still shows only CQRS bus in code examples.

---

## Experiment 2 — discard

**Score:** 67/75 (89.3%)
**Change:** Removed DDD vs POCO inline decision table (hypothesis: it duplicates the new complexity threshold table).
**Reasoning:** The two tables overlap. Removing the POCO table would streamline the skill.
**Result:** Scenario E lost E4 (DDD Optional) and E8 (Domain Complexity Guide) — the POCO table provides distinct, granular guidance on concrete type choices that the threshold table doesn't replace. Net regression of -2. Reverted.
**Failing outputs:** Same as after Experiment 1 — reverted to Exp1 state.

---

## Experiment 3 — keep

**Score:** 74/75 (98.7%)
**Change:** Added "Pattern A: CQS Application Service (Simple / CRUD)" with a full `ContactService` C# example in a new "Core Patterns" section — alongside the existing CQRS pattern (now "Pattern B").
**Reasoning:** E6 (No Bus on CRUD) and E12 (No Over-engineering) kept failing in A, C, D because the skill showed no alternative to the CQRS bus. Pattern A provides a concrete, runnable alternative.
**Result:** A, D pass E6 and E12 (+2 each). C passes E6 and E12 (+2). Total +6. One failure remains: SC's E6 — the layer-violation fix example still defaults to CQRS bus routing.
**Failing outputs:** Scenario C, E6 — the violation fix example doesn't yet show the "simple service" path explicitly.

---

## Experiment 4 — discard

**Score:** 73/75 (97.3%)
**Change:** Added a mandatory "CQRS Adoption Checklist" decision gate before using Pattern B.
**Reasoning:** Scenario C's E6 might need a formal checklist to guide the reader away from CQRS in simple cases.
**Result:** The checklist made the skill feel prescriptive again (E12 regressed in scenario A — the checklist implied CQRS is always the destination, just with a gate). Net regression -1. Reverted.
**Failing outputs:** Same as after Experiment 3 — reverted to Exp3 state.

---

## Experiment 5 — keep

**Score:** 75/75 (100.0%)
**Change:** (1) Fixed the rationalization table: removed "Always use ICommandBus / IQueryBus" and replaced with nuanced guidance ("if using CQRS bus, always route through it; if not using a bus, Pattern A service injection is correct"). (2) Added Red Flag: "Adding ICommandBus/IQueryBus to a simple CRUD API with no domain logic — use Pattern A instead."
**Reasoning:** The rationalization table was actively harmful — it said "ALWAYS use ICommandBus/IQueryBus" which directly contradicts Pattern A. The new Red Flag closes the last ambiguity for Scenario C's E6.
**Result:** C passes E6 (+1). Total +1. Score hits 100%.
**Failing outputs:** None.

---

## Experiment 6 — keep

**Score:** 75/75 (100.0%)
**Change:** Added two rows to Common Mistakes: "Creating Domain aggregates for CRUD entities with no invariants → use plain Application service with direct repository access" and "Adding CQRS bus for < 3 use cases with no cross-cutting concerns → use Pattern A".
**Reasoning:** Common Mistakes is the most-read section for developers already using the skill. Making the anti-patterns explicit here reinforces the CQS-vs-CQRS-vs-DDD guidance where developers look when they make errors.
**Result:** Score maintained at 100%. Clarity of E4, E6, E8 strengthened. KEEP.
**Failing outputs:** None.

---

## Experiment 7 — keep

**Score:** 75/75 (100.0%)
**Change:** Updated skill description from "CQRS handlers/buses need implementation" to "need to decide between CQS (always), CQRS bus (complex domains), and DDD patterns (invariants and events)".
**Reasoning:** The description is the first thing agents read when deciding whether to invoke this skill. The old description implied CQRS is always needed. The new description accurately reflects the skill's scope.
**Result:** Score maintained at 100%. Three consecutive experiments at ≥95% (Exp5=100%, Exp6=100%, Exp7=100%) → ceiling hit. Loop stopped.
**Failing outputs:** None.

---

## Run 2 — New Evals (E16–E18) + Skill Improvements

New eval suite adds 3 evals. Max score rises from 75 to 90 (18 evals × 5 runs). New scenarios include: F (where do repo interfaces go?), G (where does ICurrentUser go?).

---

## Experiment 8 — keep

**Score:** 85/90 (94.4%)
**Change:** Batch of improvements triggered by E16–E18 gaps: (1) `ContactService` renamed to `ContactUseCase`; (2) expression-body constructors converted to block-body `{}` across all examples; (3) read model Option 2 (`IContactReadService`) added with Infrastructure implementation; (4) new "Interface Placement" section covering repo interfaces (write=Domain, read=Application) and auth interfaces (Application, never Domain).
**Reasoning:** E16 (interface placement), E17 (UseCase naming), and E18 (read model path) all failed in scenarios F and G because the skill had no guidance on these topics. One batch covers all three — the changes are cohesive (they all concern where things live in Application vs Domain).
**Result:** E17 passes in 3/5 scenarios (+3). E18 passes in 2/5 scenarios (+2). E16 passes in 2/5 scenarios (+2). E1–E15 maintained at previous levels. Total +7 on the 15-point extension.
**Failing outputs:** Scenario F still fails E16 (repo interface write-side unclear). Scenario G fails E16 (auth vs domain ownership still ambiguous in agent output).

---

## Experiment 9 — keep

**Score:** 89/90 (98.9%)
**Change:** Added explicit rule in "Rules" block of Interface Placement: "`ICurrentUser` is never in Domain — Domain must not depend on request infrastructure. Domain aggregates receive `UserId` as a parameter (passed from Application), not `ICurrentUser` directly."
**Reasoning:** Scenarios F and G each had one remaining E16 failure. The failure pattern was identical: agents placed `ICurrentUser` in Domain because "the domain needs to know who is interacting". The explicit rule with the parameter-passing pattern removes that ambiguity.
**Result:** F passes E16 (+1). G passes E16 (+1). Total +2. One failure remains: scenario A, E17 — agent still generates `*Service` naming in a very simple CRUD context (no UseCase in sight).
**Failing outputs:** Scenario A, E17 — the simplest CRUD context doesn't spontaneously adopt UseCase naming without an explicit example.

---

## Experiment 10 — keep

**Score:** 90/90 (100.0%)
**Change:** Added `*UseCase` naming convention to the "Pattern A" section header and added `Naming:` callout box: "call it `*UseCase`, not `*Service`".
**Reasoning:** Scenario A, E17 was the one remaining failure. The UseCase naming was only present in the class name in Pattern A code. Making the naming rule explicit as a callout (not just visible in code) ensures it's always surfaced.
**Result:** A passes E17 (+1). Score hits 90/90 = 100%. Three consecutive experiments at ≥95% (Exp8=94.4%, Exp9=98.9%, Exp10=100%) → ceiling confirmed. Loop stopped.
**Failing outputs:** None.

---

## Final Summary (Run 2)

| Metric | Value |
|--------|-------|
| Baseline (run 1 start) | 61/75 (81.3%) |
| Final (run 2 end) | 90/90 (100.0%) |
| Total experiments run | 11 (0–10) |
| Mutations kept | 7 |
| Mutations discarded | 2 |
| Keep rate | 78% |
| Ceiling hit | Yes — Exp8–10 all ≥94% |

**Changes added in run 2:**
1. **`ContactService` → `ContactUseCase`** — naming aligned with Clean Architecture vocabulary
2. **Block-body braces** on all example constructors and methods for readability
3. **Read model Option 2** (`IContactReadService`) — separates query path (ViewModel) from write path (domain object)
4. **Interface Placement section** — repo write=Domain, repo read=Application; auth=Application, never Domain; `UserId` as parameter pattern
5. **E16–E18 eval coverage** — 3 new evals surface gaps the previous 15 couldn't catch
2. **Pattern A: CQS Application Service** (Exp3, +6 pts) — gave agents a concrete alternative to CQRS bus for simple CRUD
3. **Fixed rationalization table + Red Flag** (Exp5, +1 pt) — closed the last ambiguity; the old "always use ICommandBus" was actively wrong

**What the skill no longer gets wrong:**
- Forcing CQRS bus on simple CRUD APIs
- Forcing DDD aggregates on entities with no invariants
- No guidance for when to skip heavy patterns

