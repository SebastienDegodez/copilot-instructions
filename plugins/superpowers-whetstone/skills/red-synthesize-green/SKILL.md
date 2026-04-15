---
name: red-synthesize-green
description: Use when writing any test-first feature or bug fix, to enforce the AI-assisted 2-step TDD cycle where a human validates the failing test before AI synthesizes the implementation
---

# Red–Synthesize–Green

## Overview

The 2-step AI TDD cycle that preserves the red phase when an AI is writing both tests and implementation.

**Core rule:** AI writes the test and stubs only. Human validates the failure reason. AI synthesizes implementation after approval.

## The Problem This Solves

In traditional TDD, the developer writes a failing test and then makes it pass. With AI assistance, the AI can accidentally write a passing test from the start — because it already "knows" the implementation while writing the test. This bypasses the red phase entirely, removing TDD's core safety signal.

`red-synthesize-green` enforces a hard separation between test authoring (with stubs) and implementation synthesis, with a mandatory human validation gate in between.

## The 2-Step Cycle

### Step 1: RED — Write the Test and Stubs Only

1. **Write the test** — express the expected behavior with no implementation details
2. **Stub to compile** — create minimal stubs for missing types and methods: empty classes, `throw new NotImplementedException()`, `return default`
3. **Run the test** — it must fail with a **behavior failure**, not a compilation error
4. **WAIT** — present the failure output to the human and ask for approval before proceeding

**Hard rules for Step 1:**
- Stubs must contain NO real logic. `throw new NotImplementedException()` only.
- Do NOT implement any business rule, condition, or computation during stubbing.
- Do NOT proceed to Step 2 until the human explicitly approves the red state.

**Failure output to present:**
```
Test: WhenCondition_ShouldOutcome
Status: FAILED ✗
Reason: <paste actual failure message>

→ Awaiting approval to synthesize implementation.
```

### Step 2: SYNTHESIZE GREEN — Implement After Approval

1. **After human approval** — replace stubs with real implementation
2. **Run the test** — it must pass (GREEN)
3. **Do not modify the test** — only the implementation changes between Step 1 and Step 2

**Hard rules for Step 2:**
- The test written in Step 1 must not be changed to make it pass.
- Only the implementation (stubs) changes.
- If the test needs to change, go back to Step 1 with the revised test.

## Example

### Step 1: RED

Test written:
```csharp
[Fact]
public void WhenDriverIsUnderMinimumAge_ShouldBeRejected()
{
    var policy = new EligibilityPolicy();
    var driver = new DriverInfo(Age: 17, LicenseYears: 0);
    var vehicle = new VehicleInfo(Type: "sedan", Age: 1);

    var result = policy.Evaluate(driver, vehicle);

    Assert.False(result.IsEligible);
    Assert.Equal("minimum_age_not_met", result.RejectionReason);
}
```

Stubs created:
```csharp
public sealed class EligibilityPolicy
{
    public EligibilityResult Evaluate(DriverInfo driver, VehicleInfo vehicle)
        => throw new NotImplementedException();
}

public record DriverInfo(int Age, int LicenseYears);
public record VehicleInfo(string Type, int Age);
public record EligibilityResult(bool IsEligible, string RejectionReason);
```

Test output presented to human:
```
Test: WhenDriverIsUnderMinimumAge_ShouldBeRejected
Status: FAILED ✗
Reason: System.NotImplementedException: The method or operation is not implemented.

→ Awaiting approval to synthesize implementation.
```

### Step 2: SYNTHESIZE GREEN (after approval)

```csharp
public sealed class EligibilityPolicy
{
    private const int MinimumAge = 18;

    public EligibilityResult Evaluate(DriverInfo driver, VehicleInfo vehicle)
    {
        if (driver.Age < MinimumAge)
            return new EligibilityResult(IsEligible: false, RejectionReason: "minimum_age_not_met");

        return new EligibilityResult(IsEligible: true, RejectionReason: string.Empty);
    }
}
```

Test result: PASSED ✓

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Implementing logic in stubs | Stubs are `throw new NotImplementedException()` only |
| Proceeding to Step 2 without approval | Present the red output and wait for explicit "ok" |
| Modifying the test in Step 2 to make it pass | The test is fixed after Step 1 — only implementation changes |
| Treating compilation errors as behavioral failures | Stub to compile first, then confirm the test fails for a behavioral reason |
| Skipping the cycle for "trivial" features | Every test-first feature uses this cycle, regardless of size |

## Integration

**REQUIRED BACKGROUND:** `superpowers-whetstone:gherkin-gate` — scenarios approved before this cycle applies
**REQUIRED SUB-SKILL:** `superpowers-whetstone:outside-in-tdd` — uses this cycle to drive implementation from outside in
**REQUIRED SUB-SKILL:** `superpowers-whetstone:mutation-testing` — validates the tests produced by this cycle
