# Autoresearch Changelog — clean-architecture-dotnet

> Skill: `clean-architecture-dotnet/SKILL.md`
> Test inputs: 5 scenarios (Shared Kernel placement, CQRS bus violation, Domain aggregate, Domain events, Controller validation)
> Evals: 5 binary (Layer ID, CQRS bus discipline, Shared Kernel placement, Code example, Iron Law compliance)
> Max score per experiment: 25 (5 evals × 5 runs)

---

## Experiment 1 — keep

**Score:** 22/25 (88%)
**Change:** Added a dedicated "Shared Kernel (Multi-Context Solutions)" section to the main skill body, including: a new SharedKernel row in the layer responsibility table, explicit dependency rule (SK depends on nothing), folder structure, and a C# `ICommandHandler` interface code example.
**Reasoning:** Scenarios A and D both failed E1+E3 because the main body had no SharedKernel guidance — agents might not follow reference links. Surfacing it directly in the main body removes that ambiguity.
**Result:** Scenario A went from 2/5 to 5/5 (+3). Scenario D gained E3 (2/5 → 3/5, +1). Total +4.
**Failing outputs:** Scenario D still fails E1 (layer for domain events not explicit) and E4 (no dispatch code). Scenario C still fails E4 (no aggregate/value object code).

---

## Experiment 2 — keep

**Score:** 25/25 (100%)
**Change:** Added "Domain Events" section: events declared in Domain (sealed class inheriting `DomainEvent`), raised inside aggregate factory method, dispatched in Application handler via `IDomainEventDispatcher`. Includes full C# code for `OrderPlacedEvent`, `Order.Create()`, and `PlaceOrderCommandHandler`.
**Reasoning:** Scenario D (domain events) and Scenario C (aggregate code) were the two remaining failures. Both needed an inline example — reference links are not reliably followed.
**Result:** Scenario D 3/5 → 5/5 (+2). Scenario C 4/5 → 5/5 (+1). Total +3. Ceiling hit.
**Failing outputs:** None.

---

## Experiment 3 — keep

**Score:** 25/25 (100%)
**Change:** Added "DDD vs POCO Quick Decision" table: `AggregateRoot` + factory when invariants/events exist; `ValueObject` for identity-by-value domain concepts; plain `sealed record` for DTOs/ViewModels only.
**Reasoning:** Scenario C showed slight ambiguity on "where does `PolicyNumber` go vs a simple DTO". A decision table removes that guesswork.
**Result:** Maintained 100%. Table adds real clarity for mixed DDD/POCO scenarios. KEEP.
**Failing outputs:** None.

---

## Experiment 4 — keep

**Score:** 25/25 (100%)
**Change:** Added Common Mistakes row: "SharedKernel references Domain → SharedKernel must depend on nothing — if it references Domain, invert: Domain references SharedKernel".
**Reasoning:** The most common SK architectural mistake is accidentally making SK reference Domain types. An explicit correction in Common Mistakes prevents that.
**Result:** Maintained 100%. 3 consecutive experiments at 95%+ → ceiling confirmed. Loop stopped.
**Failing outputs:** None.
