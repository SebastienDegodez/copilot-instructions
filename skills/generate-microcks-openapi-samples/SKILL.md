---
name: generate-microcks-openapi-samples
description: Use when creating OpenAPI mock examples for Microcks, setting up request/response routing with dispatchers, or mapping request fields to mock responses
---

# Generate Microcks OpenAPI Examples

Generate realistic, schema-compliant OpenAPI examples (request/response pairs) for Microcks mocks. All examples must be concrete and directly usable—no placeholders or generic values.

DEMO

## When to Use

**Use when:**
- Building mock APIs with Microcks using realistic request/response examples
- Creating test data that matches real-world API behavior (not generic placeholders)
- Setting up multiple response scenarios for API testing (happy path, errors, edge cases)
- Configuring smart request routing (dispatching) based on request content
- Migrating from live APIs to mock endpoints while maintaining realistic behavior
- Creating reproducible test fixtures with concrete data

**Don't use when:**
- Modifying the OpenAPI contract file itself (examples go in separate metadata files)
- Creating mock data without an OpenAPI schema as source of truth
- Using generic/placeholder values (defeats purpose of realistic mocking)
- Static mock responses without routing logic

## Core Pattern

```
1. Start with OpenAPI contract (what API operations exist?)
2. Design realistic scenarios (happy path, errors, edge cases)
3. Create request/response example pairs (concrete data, no placeholders)
4. Define smart routing rules (which scenario matches which request?)
5. Deploy both example data + routing rules to Microcks
```

## Quick Reference

| Decision | Option |
|---|---|
| **Few scenarios?** | Use JSON_BODY dispatcher (fast, simple field matching) |
| **Complex routing logic?** | Use JS dispatcher (modern, recommended for Microcks 1.13+) |
| **Existing Groovy code?** | Use GROOVY dispatcher (only if explicitly needed or migrating legacy) |
| **Starting fresh?** | See [examples/README.md](examples/README.md) for complete copy-paste workflows |
| **All dispatcher details?** | See [references/dispatchers-reference.md](references/dispatchers-reference.md) for syntax & operators |

## Implementation Steps

### Step 1: Understand Your API from OpenAPI Contract

Before generating examples, gather:
1. All operations (GET /users, POST /users, etc.)
2. Request structure (required fields, data types, enums)
3. Response structure (status codes, body schema)
4. Which requests should match which responses (routing logic)

### Step 2: Design Realistic Scenarios

For each operation, create 3-5 meaningful examples:
- **Happy path**: Valid request → success response (200, 201, etc.)
- **Error case**: Invalid request → error response (400, 401, 404, etc.)
- **Edge cases**: Boundary values, large arrays, null fields, etc.

**Key:** Use CONCRETE data from real-world usage, not templates like `<email>`, `{placeholder}`.

### Step 3: Create APIExamples File

Create a file named `<contract-name>.apiexamples.yaml`:

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIExamples
metadata:
  name: <Same as OpenAPI contract name>
  version: <Same version as OpenAPI contract>
operations:
  <HTTP METHOD> <operation path>:
    <Example Name 1>:
      request:
        headers:
          Content-Type: application/json
        body: |-
          { "concrete": "value" }
      response:
        status: 200
        body: |-
          { "concrete": "response value" }
    <Example Name 2>:
      request:
        headers:
          Content-Type: application/json
        body: |-
          { "concrete": "different value" }
      response:
        status: 200
        body: |-
          { "concrete": "different response" }
```

**CRITICAL RULES:**
- **No placeholders**: All values must be concrete and realistic (not `{{ placeholder }}`, `...`, or `<TBD>`)
- **Match schema**: Every example field must comply with OpenAPI schema types, enums, required fields, and constraints
- **Example names are identifiers**: Names like `BEST_CITY`, `DEFAULT_CITY`, `INVALID_INPUT` are referenced by dispatcher rules
- **YAML format strict**: Use `|-` for multi-line strings; validate syntax with `yamllint`

### Step 4: Configure Smart Routing

Create a separate file named `<contract-name>.apimetadata.yaml` to define dispatcher rules that route requests to the correct example.

For **JSON_BODY dispatcher** (simple field matching):
```yaml
operations:
  <HTTP METHOD> <operation path>:
    dispatcher: JSON_BODY
    dispatcherRules: |
      {
        "exp": "/fieldName",
        "op": "equals",
        "cases": {
          "value1": "EXAMPLE_NAME_1",
          "value2": "EXAMPLE_NAME_2",
          "default": "DEFAULT_EXAMPLE"
        }
      }
```

For **JS SCRIPT dispatcher** (complex multi-field logic, recommended):
```yaml
operations:
  <HTTP METHOD> <operation path>:
    dispatcher: JS
    dispatcherRules: |
      const req = JSON.parse(mockRequest.getRequestContent());
      if (req.field1 === "value1" && req.field2 > 10) {
        return "EXAMPLE_NAME_1";
      }
      return "DEFAULT_EXAMPLE";
```

**To use GROOVY dispatcher** (legacy or if explicitly needed):
```yaml
operations:
  <HTTP METHOD> <operation path>:
    dispatcher: GROOVY
    dispatcherRules: |
      import java.util.regex.*;
      def jsonSlurper = new groovy.json.JsonSlurper();
      def req = jsonSlurper.parseText(mockRequest.getRequestContent());
      
      if (req.field1 == "value1" && req.field2 > 10) {
        return "EXAMPLE_NAME_1"
      }
      return "DEFAULT_EXAMPLE"
```

**For complete dispatcher reference, syntax details, and operators, see [references/dispatchers-reference.md](references/dispatchers-reference.md).**

### Step 5: Validate and Deploy

1. **Syntax check**: Validate all YAML files with `yamllint` or online validator
2. **Schema compliance**: Ensure every field matches OpenAPI schema (type, enum, required, etc.)
3. **Dispatcher mapping**: Verify every example name in APIExamples appears in dispatcher cases
4. **Consistency**: Example names must be identical across APIExamples and APIMetadata
5. **Deploy**: Upload both `.apiexamples.yaml` and `.apimetadata.yaml` files to Microcks

## Common Mistakes

### Mistake 1: Placeholder Values in Examples
```yaml
# ❌ BAD: Placeholder value
response:
  body: |-
    { "city": "<city-name>", "rating": 5 }

# ✅ GOOD: Concrete value
response:
  body: |-
    { "city": "Paris", "rating": 8 }
```
Why? Microcks returns examples as-is. Users expect real data, not templates.

### Mistake 2: Dispatcher Cases Don't Match Example Names
```yaml
# ❌ BAD: Dispatcher references "BEST", but example is named "BEST_CITY"
cases:
  "Dunkirk": "BEST"

# ✅ GOOD:
cases:
  "Dunkirk": "BEST_CITY"
```
Microcks fails silently or returns wrong example.

### Mistake 3: JSON Pointer Path Incorrect
```yaml
# ❌ BAD: Path doesn't match request structure
"exp": "/user_city"  # But request is { "city": "Paris" }

# ✅ GOOD:
"exp": "/city"
```

### Mistake 4: Missing Default Case
```yaml
# ❌ BAD: No default, Microcks returns 404 for unknown requests
"cases": {
  "Paris": "GOOD_CITY",
  "Dunkirk": "BEST_CITY"
}

# ✅ GOOD: Always include default
"cases": {
  "Paris": "GOOD_CITY",
  "Dunkirk": "BEST_CITY",
  "default": "DEFAULT_CITY"
}
```

### Mistake 5: Mixing YAML and JSON Syntax
```yaml
# ❌ BAD: Invalid YAML (unquoted colons, inconsistent quotes)
body: |-
  { "key": value }  # Missing quotes around value

# ✅ GOOD: Valid JSON within YAML
body: |-
  { "key": "value" }
```

## Red Flags: Avoid These Rationalization Traps

### ❌ "Templates are faster than concrete data"

**Wrong.** Microcks returns examples AS-IS. If you use `<email>` instead of `alice@example.com`, users receive the literal placeholder in their tests.

**Reality:** Concrete data takes same time to write and is immediately usable.

### ❌ "Keep Groovy for consistency with our other dispatchers"

**Wrong.** Dispatcher choice should be based on requirement complexity, not on sunk cost.

**Decision matrix:**
- **Simple field routing?** Use JSON_BODY (even if you have 10 Groovy dispatchers elsewhere)
- **Complex multi-field logic?** Use JS (modern, recommended for Microcks 1.13+)
- **Existing Groovy codebase?** Only if explicitly required or migrating legacy

**Reality:** "Consistency" that keeps you on a worse technology is technical debt, not architecture.

### ❌ "One example is good enough"

**Wrong.** One example ≠ realistic mocking. Microcks routes requests based on dispatcher rules. One example = one scenario.

**Need minimum 3:**
- Happy path (200, 201)
- Error case (400, 401, 404, etc.)
- Edge case (boundary values, empty arrays, etc.)

### ❌ "I'll add dispatching rules later"

**Wrong.** Without dispatcher rules, all requests hit the first example. Your mock isn't mocking—it's static.

**Reality:** APIExamples + APIMetadata (dispatcher rules) are equally critical. Both must exist before testing.

---

## Examples

**For real-world, copy-paste-ready examples covering:**
- Cities API with JSON_BODY dispatcher (recommended starting point)
- Authorization API with JavaScript SCRIPT dispatcher (recommended for complex logic)
- Orders API with Groovy SCRIPT dispatcher (legacy, optional)

**See [examples/README.md](examples/README.md) for index and quick navigation.**

## Key Constraints

- **Never edit OpenAPI contract**: Examples go in separate `.apiexamples.yaml` only
- **Concrete values only**: No `{{ }}`, `<>`, placeholders, or generic values
- **Schema compliance**: All examples must validate against OpenAPI schema
- **Names must match**: Example names in APIExamples must appear in dispatcher cases
- **YAML validation**: Strict YAML syntax; indent consistently (2 spaces)
- **JSON format**: Request/response bodies must be valid JSON; use `|-` for multi-line

## Resources

- [Microcks Dispatching Documentation](https://microcks.io/documentation/explanations/dispatching/)
- [references/dispatchers-reference.md](references/dispatchers-reference.md) — Complete reference for JSON_BODY, Groovy SCRIPT, JavaScript SCRIPT
- [examples/README.md](examples/README.md) — Real-world usage examples with index
- YAML Validator: yamllint, Online YAML Validator
- JSON Validator: jsonlint
