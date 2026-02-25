# Examples: Generate Microcks OpenAPI Samples

3 real-world, copy-paste-ready examples demonstrating end-to-end workflows for generating Microcks mock examples.

## Quick Navigation

| Example | File | Dispatcher | Use Case |
|---|---|---|---|
| **#1: Cities API** | [01-cities-json-body.md](01-cities-json-body.md) | JSON_BODY | Simple field-based dispatching (recommended starting point) |
| **#2: Auth API** | [02-auth-js.md](02-auth-js.md) | JavaScript | Header-based dispatching, modern syntax (recommended for complex logic) |
| **#3: Orders API** | [03-orders-groovy-optional.md](03-orders-groovy-optional.md) | Groovy | Multi-field + array operations *(use only if explicitly needed or migrating legacy)* |

## Choosing Your Example

### Start Here: JSON_BODY (Example #1)
**Use when:**
- One or two fields determine the response
- Simple enum/value matching
- Need fastest, most maintainable solution

**File:** [01-cities-json-body.md](01-cities-json-body.md)

---

### Recommended for Complex Logic: JavaScript (Example #2)
**Use when:**
- Header-based dispatching
- Multiple fields with validation
- Modern team / Microcks 1.13+
- Prefer JavaScript over Groovy

**File:** [02-auth-js.md](02-auth-js.md)

---

### Optional/Legacy: Groovy (Example #3)
**Use only when:**
- Explicitly requested by team or customer
- Migrating existing Groovy-based dispatchers
- Need legacy compatibility

**Why optional?** JavaScript provides cleaner syntax and modern runtimes. Groovy is maintained for backward compatibility.

**File:** [03-orders-groovy-optional.md](03-orders-groovy-optional.md)

---

## Reading Order

1. **First time?** Read Example #1 (JSON_BODY) for foundational concepts
2. **Complex logic needed?** Jump to Example #2 (JavaScript)
3. **Working with legacy?** See Example #3 (Groovy) only if required

For complete reference on all dispatcher syntax and operators, see [../references/dispatchers-reference.md](../references/dispatchers-reference.md).
