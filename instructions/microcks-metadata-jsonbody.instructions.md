---
applyTo: '**/*.apimetadata.yaml'
---

# Microcks Metadata Construction – JSON_BODY Dispatcher

## Purpose
Guide for building Microcks APIMetadata files using the JSON_BODY dispatcher.

## Workflow
1. Identify the target operation (method + path) from the OpenAPI contract.
2. For each operation, define the dispatcher as `JSON_BODY`.
3. Set `dispatcherRules` to the field in the request body that will be used for dispatching (e.g., `/city`).


## Example

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIMetadata
metadata:
  name: <Same name as in OpenAPI ${input:file-name}>
  version: <Same contract version in OpenAPI>
operations:
  POST /city/evaluate:
    dispatcher: JSON_BODY
    dispatcherRules: |
      {
        "exp": "/city",           # JSON Pointer to the field in the request body
        "op": "equals",             # Operator to apply (equals, range, regexp, etc.)
        "cases": {
          "Dunkirk": "BEST_CITY",   # Value to match => Example name
          "Paris": "GOOD_CITY",     # Another value to match => Example name
          "default": "DEFAULT_CITY" # Default value if no match
        }
      }
```

### Explanation
- `exp` is a JSON Pointer expression to extract the value from the request body (e.g. `/city` for `{ "city": "..." }`).
- `op` is the operator to apply (most common: `equals`).
- `cases` maps possible values to the example names defined in your APIExamples file. The `default` key is used if no value matches.

#### Example request body:
```json
{
  "city": "Dunkirk"
}
```
This will select the example named `BEST_CITY`.

## Best Practices
- Use a field that is always present and unique for dispatching.
- Keep the metadata file strictly in Microcks format (no OpenAPI header).
- Validate YAML syntax.