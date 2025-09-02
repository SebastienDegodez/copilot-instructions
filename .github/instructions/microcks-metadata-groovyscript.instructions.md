---
applyTo: '**/*.apimetadata.yaml'
---

# Microcks Metadata Construction – SCRIPT Dispatcher

## Purpose
Guide for building Microcks APIMetadata files using the SCRIPT dispatcher for advanced dispatching logic.

## Workflow
1. Identify the target operation (method + path) from the OpenAPI contract.
2. For each operation, define the dispatcher as `SCRIPT`.
3. Write a Groovy script in `dispatcherRules` to select the response based on request content.

## Example

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIMetadata
metadata:
  name: <Same name as in OpenAPI ${input:file-name}>
  version: <Same contract version in OpenAPI>
operations:
  <HTTP method> <operation path>:
    dispatcher: SCRIPT
    dispatcherRules: |
      import java.util.regex.*;
      def jsonSlurper = new groovy.json.JsonSlurper();
      def requestContent = mockRequest.getRequestContent();
      def req = jsonSlurper.parseText(requestContent);
      
      // Custom logic here
      if (req.city == "Dunkirk") {
        return "BEST_CITY"
      }
      else if (req.city == "Paris") {
        return "GOOD_CITY"
      }
      return "DEFAULT_CITY"
```

## Best Practices
- Keep scripts simple and readable.
- Always validate Groovy syntax and Microcks compatibility.
- Use meaningful return values matching example names in APIExamples.