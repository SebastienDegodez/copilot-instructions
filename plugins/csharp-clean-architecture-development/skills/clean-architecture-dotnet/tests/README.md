# Testing Guide for clean-architecture-dotnet Skill

## Quick Start

This skill follows **Test-Driven Development for documentation** as described in the writing-skills skill.

### Files in This Directory

- **validation.md**: Complete test scenarios and execution log (RED-GREEN-REFACTOR)
- **baseline-prompts.txt**: Copy-paste prompts for baseline testing
- **README.md**: This file

---

## How to Run Tests

### Phase 1: RED (Baseline Without Skill)

**Goal:** Document how agents behave WITHOUT the skill

1. **Start fresh conversation** with subagent (no skill loaded)
2. **Copy prompts from Scenario 1-5** in validation.md
3. **Paste each prompt** one at a time
4. **Document exact behavior:**
   - What did agent create?
   - What mistakes were made?
   - What rationalizations were used? (capture verbatim)
5. **Record in validation.md** under "RED Phase"

**Example:**
```bash
# In a new agent conversation (skill NOT loaded)
> Create a new .NET project "Catalog" following Clean Architecture with CQRS pattern...

# Agent response: [Document what they actually do]
# Did they use MediatR? Generic repositories? Wrong naming?
```

### Phase 2: GREEN (With Skill Loaded)

**Goal:** Verify agents comply when skill is loaded

1. **Start fresh conversation** with skill loaded in context
2. **Use EXACT SAME PROMPTS** from Phase 1
3. **Verify expected behaviors** from validation.md
4. **Record compliance** in "GREEN Phase" section
5. **Note any remaining issues**

**Example:**
```bash
# In new conversation WITH skill loaded
@clean-architecture-dotnet
> Create a new .NET project "Catalog" following Clean Architecture with CQRS pattern...

# Agent should now follow skill patterns exactly
```

### Phase 3: REFACTOR (Close Loopholes)

**Goal:** Find edge cases and plug holes

1. **Run pressure scenarios** (time + sunk cost + authority)
2. **Document NEW rationalizations** agents use
3. **Add explicit counters** to SKILL.md
4. **Re-test** to verify loopholes closed
5. **Iterate** until bulletproof

---

## Pressure Testing

**Combined pressures reveal rationalizations:**

- **Time pressure:** "Boss wants demo in 2 hours"
- **Sunk cost:** "I already built 10 controllers with MediatR"
- **Authority:** "Senior architect says we MUST use X"
- **Exhaustion:** "Been working 12 hours, just tell me"

These combinations test if agents will bypass skill rules.

---

## Recording Results

Use the Test Execution Log table in validation.md:

```markdown
| Date | Scenario | Phase | Result | Notes |
|------|----------|-------|--------|-------|
| 2026-02-25 | Scenario 1 | RED | ❌ Used MediatR | Agent defaulted to industry standard |
| 2026-02-25 | Scenario 1 | GREEN | ✅ Passed | Used init script, perfect structure |
```

---

## Success Criteria Checklist

Before marking skill as "validated":

- [ ] All 5 base scenarios documented in RED phase
- [ ] Common rationalizations captured verbatim
- [ ] All 5 scenarios pass in GREEN phase
- [ ] Pressure tests executed (at least 2)
- [ ] No rationalizations bypass skill rules
- [ ] Loopholes identified and closed
- [ ] SKILL.md updated with explicit counters
- [ ] Re-tested after updates

---

## Quick Pressure Test Template

```markdown
**Scenario:** [Name]
**Pressures Applied:** [Time/Sunk Cost/Authority/Exhaustion]
**Prompt:**
[Exact prompt text]

**Expected Behavior:**
[What skill should enforce]

**Actual Behavior:**
[What agent actually did]

**Rationalizations Used:**
[Verbatim agent explanations]

**Fix Applied:**
[What was added to SKILL.md]
```

---

## Notes

- Tests must be run in FRESH conversations (no prior context)
- Capture agent responses VERBATIM for rationalizations
- Don't guide agent during baseline - let them fail naturally
- Document EVERYTHING - small deviations become patterns
- Re-test after every SKILL.md change

**Remember:** If you didn't watch it fail first, you don't know if the skill fixes the right thing.
