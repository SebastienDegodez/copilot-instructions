# Dispatcher Configuration Reference

Complete reference for all Microcks dispatcher strategies.

## Choosing Your Dispatcher

| Dispatcher | Best For | Complexity | Performance |
|---|---|---|---|
| **JSON_BODY** | Single field matching | Low | Fast (native) |
| **SCRIPT (Groovy)** | Multi-field logic, type handling | Medium | Medium |
| **SCRIPT (JavaScript)** | Modern syntax, multi-logic, validation | Medium | Medium |

---

## JSON_BODY Dispatcher

**Use when:** Dispatching is based on a single field value in the request body.

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIMetadata
metadata:
  name: <contract-name>
  version: <version>
operations:
  <HTTP METHOD> <operation path>:
    dispatcher: JSON_BODY
    dispatcherRules: |
      {
        "exp": "/city",
        "op": "equals",
        "cases": {
          "Dunkirk": "BEST_CITY",
          "Paris": "GOOD_CITY",
          "Lyon": "AVERAGE_CITY",
          "default": "DEFAULT_CITY"
        }
      }
```

### Fields

- **`exp`** (JSON Pointer): Path to extract field from request body
  - `/city` → `{ "city": "Paris" }`
  - `/user/role` → `{ "user": { "role": "admin" } }`
  - `/items/0/status` → `{ "items": [{ "status": "pending" }] }`

- **`op`** (Operator): Comparison operation
  - `equals` (exact match) — most common
  - `regexp` (regex pattern)
  - `range` (numeric range)
  - `contains` (substring)

- **`cases`** (Map): Request value → Example name
  - Must include `default` for unmatched values
  - **Example**: `{ "city": "Dunkirk" }` → selects `BEST_CITY`

### Example: Range Operator

```yaml
dispatcher: JSON_BODY
dispatcherRules: |
  {
    "exp": "/price",
    "op": "range",
    "cases": {
      "[1..10]": "CHEAP",
      "[11..50]": "MEDIUM",
      "[51..*]": "EXPENSIVE",
      "default": "UNKNOWN"
    }
  }
```

### Example: Regex Operator

```yaml
dispatcher: JSON_BODY
dispatcherRules: |
  {
    "exp": "/email",
    "op": "regexp",
    "cases": {
      ".*@company\\.com": "INTERNAL",
      ".*@.*": "EXTERNAL",
      "default": "INVALID"
    }
  }
```

---

## SCRIPT Dispatcher (Groovy)

**Use when:** Dispatching requires multi-field logic, type conversions, conditional checks, or custom validation.

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIMetadata
metadata:
  name: <contract-name>
  version: <version>
operations:
  <HTTP METHOD> <operation path>:
    dispatcher: GROOVY
    dispatcherRules: |
      import java.util.regex.*;
      def jsonSlurper = new groovy.json.JsonSlurper();
      def requestContent = mockRequest.getRequestContent();
      def req = jsonSlurper.parseText(requestContent);
      
      // Multi-field logic
      if (req.city == "Dunkirk" && req.season == "summer") {
        return "BEST_CITY_SUMMER"
      }
      else if (req.city == "Paris" && req.season == "spring") {
        return "GOOD_CITY_SPRING"
      }
      else if (req.rating as Integer > 8) {
        return "HIGH_RATING"
      }
      return "DEFAULT_CITY"
```

### Available Objects

- **`mockRequest`**: The incoming HTTP request
  - `mockRequest.getRequestContent()` — raw request body
  - `mockRequest.getMethod()` — HTTP method (POST, GET, etc.)
  - `mockRequest.getPath()` — Request path
  - `mockRequest.getHeaderValue("header-name")` — Get header

- **`JsonSlurper`**: Groovy JSON parser
  - Parse with `jsonSlurper.parseText(content)`
  - Navigate with dot notation: `req.user.role`

### Example: Logic with Headers

```groovy
import java.util.regex.*;
def jsonSlurper = new groovy.json.JsonSlurper();
def requestContent = mockRequest.getRequestContent();
def req = jsonSlurper.parseText(requestContent);
def authHeader = mockRequest.getHeaderValue("Authorization");

if (authHeader && authHeader.startsWith("Bearer")) {
  if (req.action == "delete") {
    return "AUTHORIZED_DELETE"
  }
  return "AUTHORIZED_UPDATE"
}
return "UNAUTHORIZED"
```

### Example: Type Conversions

```groovy
def jsonSlurper = new groovy.json.JsonSlurper();
def req = jsonSlurper.parseText(mockRequest.getRequestContent());

// Type conversion
def age = req.age as Integer;
def isStudent = req.isStudent as Boolean;

if (age < 18 && isStudent) {
  return "STUDENT_MINOR"
}
else if (age >= 18) {
  return "ADULT"
}
return "DEFAULT"
```

### Example: Lists and Collections

```groovy
def jsonSlurper = new groovy.json.JsonSlurper();
def req = jsonSlurper.parseText(mockRequest.getRequestContent());

// Check list size
if (req.items.size() > 5) {
  return "BULK_ORDER"
}

// Check first item
if (req.items[0].type == "priority") {
  return "PRIORITY_FIRST"
}

return "STANDARD_ORDER"
```

### Groovy Script Rules

- ✅ Import required libraries (`java.util.regex.*`, `groovy.json.*`)
- ✅ Parse JSON with `JsonSlurper`
- ✅ Use Groovy syntax (closures, safe navigation `?.`)
- ✅ Always `return` an example name (never null)
- ✅ Test scripts in IDE or validator before deploying
- ❌ Don't forget `import` statements
- ❌ Don't use undefined variables
- ❌ Don't return null (always provide default)

---

## SCRIPT Dispatcher (JavaScript)

**Use when:** You prefer modern JavaScript syntax or team standardizes on JS across disparate systems.

**STATUS:** Supported in Microcks 1.13+; recommended going forward. [See docs](https://microcks.io/documentation/explanations/dispatching/)

Use `dispatcher: JS` to specify JavaScript as the scripting language. Write JavaScript code directly (no function wrapper). The script must `return` an example name.

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIMetadata
metadata:
  name: <contract-name>
  version: <version>
operations:
  <HTTP METHOD> <operation path>:
    dispatcher: JS
    dispatcherRules: |-
      const req = JSON.parse(mockRequest.getRequestContent());
      
      // Multi-field logic, modern syntax
      if (req.city === "Dunkirk" && req.season === "summer") {
        return "BEST_CITY_SUMMER";
      }
      else if (req.rating > 8) {
        return "HIGH_RATING";
      }
      return "DEFAULT_CITY";
```

### Available Runtime Objects

- **`mockRequest`**: Wrapper around incoming HTTP request
  - `mockRequest.getRequestContent()` — raw request body (JSON string)
  - `mockRequest.getRequestHeader("header-name")` — returns array of header values
  - `mockRequest.getRequest()` — underlying Java HttpServletRequest object
  
- **`requestContext`**: Request-scoped context for storing objects
  - `requestContext.propertyName = value` — set custom properties

- **`log`**: Logger with `debug()`, `info()`, `warn()`, `error()` methods

- **`store`**: Service-scoped persistent store for strings
  - `store.get(key)`, `store.put(key, value)`, `store.delete(key)`

### Example: Multi-Field Logic with Array Handling

```javascript
const req = JSON.parse(mockRequest.getRequestContent());

// Array size check
if (req.items && req.items.length > 5) {
  return "BULK_ORDER";
}

// Multi-field condition
if (req.priority === "high" && req.items.length > 0) {
  return "PRIORITY_SHIPMENT";
}

// Check nested fields
if (req.user && req.user.role === "admin") {
  return "ADMIN_REQUEST";
}

return "STANDARD";
```

### Example: Header-Based Dispatching

```javascript
const authHeader = mockRequest.getRequestHeader("authorization");

// Check authorization
if (authHeader && authHeader[0].startsWith("Bearer")) {
  return "AUTHENTICATED";
}
else if (authHeader && authHeader[0].startsWith("Basic")) {
  return "BASIC_AUTH";
}

return "UNAUTHORIZED";
```

### Example: Regex and Pattern Matching

```javascript
const req = JSON.parse(mockRequest.getRequestContent());

// Regex matching
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (emailRegex.test(req.email)) {
  return "VALID_EMAIL";
}

// String contains
if (req.message && req.message.includes("urgent")) {
  return "URGENT";
}

return "STANDARD";
```

### Example: Type Checking and Validation

```javascript
const req = JSON.parse(mockRequest.getRequestContent());

// Type validation
if (typeof req.age === "number" && req.age >= 18) {
  return "ADULT";
}

if (Array.isArray(req.items) && req.items.length === 0) {
  return "EMPTY_CART";
}

if (req.discount && typeof req.discount === "number" && req.discount > 0.5) {
  return "HIGH_DISCOUNT";
}

return "DEFAULT";
```

### JavaScript Rules

- ✅ Write code **directly** (no function wrapper)
- ✅ Access request with `mockRequest.getRequestContent()` and `mockRequest.getRequestHeader(name)`
- ✅ Parse JSON with `JSON.parse(mockRequest.getRequestContent())`
- ✅ Use modern JS syntax (arrow functions, template literals, optional chaining `?.`)
- ✅ Always `return` an example name (string)
- ✅ Use `Array.isArray()` for array checks
- ✅ Always provide a default return
- ❌ Don't wrap in a function
- ❌ Don't use undefined variables
- ❌ Don't return null (always provide default)

---

## Groovy vs JavaScript

| Feature | Groovy | JavaScript |
|---|---|---|
| Type conversion | `as Integer`, `as Boolean` | `Number()`, `Boolean()` |
| Collections | Lists with `[]`, safe nav `?.` | Arrays, optional chaining `?.` |
| Imports | `import java.util.*` required | None (global scope) |
| JSON parsing | `JsonSlurper` | `JSON.parse()` |
| Readability | More verbose | Modern syntax |
| **Recommendation** | Legacy systems | **New projects** |

---

## Dispatcher Selection Guide

**Choose JSON_BODY if:**
- ✅ Single field determines response
- ✅ Fast execution critical
- ✅ Simple operators sufficient (equals, range, regexp)

**Choose GROOVY if:**
- ✅ Legacy Microcks (< 1.13)
- ✅ Complex multi-field logic required
- ✅ Team knows Groovy
- ⚠️ Use only if explicitly needed

**Choose JS if:**
- ✅ Microcks 1.13+ (modern, recommended)
- ✅ Team prefers modern JavaScript syntax
- ✅ Validation logic complex
- ✅ Cross-system consistency (JS everywhere)

---

## Testing Dispatcher Logic

### Validate YAML Syntax

```bash
yamllint metadata.apimetadata.yaml
```

### Test Groovy Scripts Locally

Use an online Groovy playground or IDE plugin to test script logic before deploying.

### Test JavaScript Functions

```javascript
const req = JSON.parse('{"city": "Dunkirk"}');
// Simulate dispatcher
if (req.city === "Dunkirk") {
  console.log("BEST_CITY");
}
// Should output: "BEST_CITY"
```

### Verify Dispatcher in Microcks

1. Deploy APIExamples and APIMetadata
2. Use Microcks mock endpoint
3. Send request matching test case
4. Verify correct example returned

---

For real-world examples and implementation details, see [../examples/README.md](../examples/README.md).
