# Example 1: Cities API with JSON_BODY Dispatcher

**Use case**: Simple field-based dispatching. Single request field determines the response.

**Why start here?** JSON_BODY is the simplest, fastest dispatcher. Perfect for learning.

---

## OpenAPI Contract Excerpt

```yaml
openapi: 3.0.0
info:
  title: Cities API
  version: 1.0.0
paths:
  /cities/evaluate:
    post:
      operationId: evaluateCity
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [city]
              properties:
                city:
                  type: string
                  enum: [Paris, Dunkirk, Lyon]
      responses:
        '200':
          description: City evaluation
          content:
            application/json:
              schema:
                type: object
                required: [city, rating]
                properties:
                  city:
                    type: string
                  rating:
                    type: integer
                    minimum: 1
                    maximum: 10
```

---

## Generated APIExamples (`cities-api.apiexamples.yaml`)

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIExamples
metadata:
  name: cities-api
  version: 1.0.0
operations:
  POST /cities/evaluate:
    BEST_CITY:
      request:
        headers:
          Content-Type: application/json
        body: |-
          { "city": "Dunkirk" }
      response:
        status: 200
        body: |-
          { "city": "Dunkirk", "rating": 9 }
    GOOD_CITY:
      request:
        headers:
          Content-Type: application/json
        body: |-
          { "city": "Paris" }
      response:
        status: 200
        body: |-
          { "city": "Paris", "rating": 7 }
    DEFAULT_CITY:
      request:
        headers:
          Content-Type: application/json
        body: |-
          { "city": "Lyon" }
      response:
        status: 200
        body: |-
          { "city": "Lyon", "rating": 5 }
```

---

## Generated APIMetadata (`cities-api.apimetadata.yaml`)

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIMetadata
metadata:
  name: cities-api
  version: 1.0.0
operations:
  POST /cities/evaluate:
    dispatcher: JSON_BODY
    dispatcherRules: |
      {
        "exp": "/city",
        "op": "equals",
        "cases": {
          "Dunkirk": "BEST_CITY",
          "Paris": "GOOD_CITY",
          "Lyon": "DEFAULT_CITY",
          "default": "DEFAULT_CITY"
        }
      }
```

---

## How It Works

1. **Request**: `{ "city": "Dunkirk" }`
2. **Dispatcher**: Extracts `/city` field → "Dunkirk"
3. **Match**: Maps "Dunkirk" → `BEST_CITY` example
4. **Response**: Returns example with `{ "city": "Dunkirk", "rating": 9 }`

---

## Why JSON_BODY?

- ✅ Only one field (`city`) determines the response
- ✅ Fast, native matching (no script parsing)
- ✅ Simple to debug: direct field → example mapping
- ✅ Recommended for simple dispatching rules

---

## Key Points

- **Example names** (`BEST_CITY`, `GOOD_CITY`, `DEFAULT_CITY`) match the `cases` in dispatcher
- **`exp`** is the JSON Pointer path: `/city` extracts the `city` field from request
- **`op": "equals"`** does simple string matching
- **`default`** case handles unknown values

---

## Next: More Complex Cases

- **Header-based or multi-field logic?** See [02-auth-js.md](02-auth-js.md)
- **All JSON_BODY operators?** See [../references/dispatchers-reference.md](../references/dispatchers-reference.md)
