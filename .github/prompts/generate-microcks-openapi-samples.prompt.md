---
description: "Generate concrete OpenAPI examples for Microcks mocks (OpenAPI only)"
mode: agent
---

# Prompt: Generate concrete OpenAPI examples for Microcks

This prompt guides the agent to generate realistic, schema-compliant OpenAPI examples (request and response) for a specific operation, to be used with Microcks mocks. All examples must be concrete and directly usable, with no placeholders or generic values. Only metadata files are edited or created; the OpenAPI file itself is never modified.

## Workflow

1. Ask the user for the OpenAPI source file path (e.g.: `${input:open-api-contrat}`) and scan the schema to identify the target operation `${input:operationId}`.
2. Generate ${input:number-exemple} concrete examples (request/response) for the target operation, in the `<name>.apiexamples.yaml` file.
3. For metadata (dispatching rules), use the dedicated instructions files:
    - For JSON_BODY dispatcher: see `microcks-metadata-jsonbody.instructions.md`
    - For SCRIPT dispatcher: see `microcks-metadata-groovyscript.instructions.md`
4. Validate that the YAML format is strict and that examples are compliant with the OpenAPI schema.

## Main rules
- Never modify the OpenAPI source file.
- Concrete examples must only go in the file with "APIExamples" in its name.
- Dispatching rules and constraints must go in the file with "metadata" in its name, following the dedicated instructions.
- Examples must be realistic, usable, and schema-compliant (no generic values or placeholders).
- Always request and scan the OpenAPI file before generating.

## Example format for APIExamples

```yaml
apiVersion: mocks.microcks.io/v1alpha1
kind: APIExamples
metadata:
  name: ${input:file-name}
  version: <contract version>
operations:
  <HTTP method> <operation path>:
    <Example Name 1>:
      request:
        headers:
          Content-Type: application/json
        body: |-
          { "key": "concrete value" }
      response:
        status: 200
        body: |-
          { "key": "concrete value" }
    <Example Name 2>:
      request:
        headers:
          Content-Type: application/json
        body: |-
          { "key": "concrete or error value" }
      response:
        status: 500
        body: |-
          { "Status": "KO", "Code": "ERROR", "Message": "Concrete error description" }
```

## For metadata construction

- Refer to the dedicated instructions files for dispatcher configuration:
  - `microcks-metadata-jsonbody.instructions.md` for JSON_BODY
  - `microcks-metadata-groovyscript.instructions.md` for SCRIPT

For advanced dispatching, you can enrich with parameter constraints or custom logic (see official documentation).

Useful link: https://microcks.io/documentation/explanations/dispatching/