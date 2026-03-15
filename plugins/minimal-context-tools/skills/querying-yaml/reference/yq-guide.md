# yq: YAML Query and Extraction

**Goal: Extract specific data from YAML without reading entire file.**

**Note:** This guide assumes `mikefarah/yq` (the most common version). Syntax is similar to jq.

## The Essential Pattern

```bash
yq '.field' file.yml
```

yq defaults to YAML output. Use `-r` for raw output or `-o json` for JSON:
```bash
yq -r '.field' file.yml          # Raw string output
yq -o json file.yml              # Convert to JSON
```

---

# Core Patterns (80% of Use Cases)

## 1. Extract Top-Level Field
```bash
yq '.version' config.yml
yq '.name' config.yml
```

## 2. Extract Nested Field
```bash
yq '.services.web.image' docker-compose.yml
yq '.jobs.build.steps' .github/workflows/ci.yml
```

## 3. Extract from Array by Index
```bash
yq '.items[0]' file.yml              # First element
yq '.jobs.build.steps[2]' ci.yml     # Third step
```

## 4. Extract All Array Elements
```bash
yq '.items[]' file.yml               # All elements
yq '.services.*.ports' docker-compose.yml    # All ports from all services
```

## 5. Extract Field from Each Array Element
```bash
yq '.services.*.image' docker-compose.yml          # All service images
yq '.jobs.*.runs-on' .github/workflows/ci.yml      # All job runners
```

## 6. Get Object Keys
```bash
yq 'keys' object.yml
yq '.services | keys' docker-compose.yml
```

## 7. Filter Array by Condition
```bash
yq '.items[] | select(.active == true)' file.yml
yq '.services.* | select(.ports)' docker-compose.yml
```

## 8. Extract Specific Array Elements
```bash
yq '.services.web' docker-compose.yml
yq '.jobs.build' .github/workflows/ci.yml
```

## 9. Handle Missing Fields
```bash
yq '.field // "default"' file.yml
```

## 10. Convert YAML to JSON
```bash
yq -o json file.yml
```

---

# Common Real-World Workflows

## Docker Compose

### "List all services"
```bash
yq '.services | keys' docker-compose.yml
```

### "Get image for service"
```bash
yq '.services.web.image' docker-compose.yml
```

### "Get all ports"
```bash
yq '.services.*.ports' docker-compose.yml
```

### "Get environment variables for service"
```bash
yq '.services.api.environment' docker-compose.yml
```

### "Get depends_on for service"
```bash
yq '.services.web.depends_on' docker-compose.yml
```

## GitHub Actions

### "List all jobs"
```bash
yq '.jobs | keys' .github/workflows/ci.yml
```

### "Get build steps"
```bash
yq '.jobs.build.steps' .github/workflows/ci.yml
```

### "Get trigger events"
```bash
yq '.on' .github/workflows/ci.yml
```

### "Get runner for job"
```bash
yq '.jobs.build.runs-on' .github/workflows/ci.yml
```

## Kubernetes

### "Get container image"
```bash
yq '.spec.template.spec.containers[0].image' deployment.yml
```

### "Get replicas"
```bash
yq '.spec.replicas' deployment.yml
```

### "List all container names"
```bash
yq '.spec.template.spec.containers[].name' deployment.yml
```

## Configuration Files

### "Get database host"
```bash
yq '.database.host' config.yml
```

### "Get API key"
```bash
yq '.api.key' config.yml
```

---

# Advanced Patterns (20% Use Cases)

## Combine Multiple Queries
```bash
yq '{version: .version, services: (.services | keys)}' docker-compose.yml
```

## Count Array Length
```bash
yq '.items | length' file.yml
yq '.services | length' docker-compose.yml
```

## Filter and Extract
```bash
yq '.services.* | select(.ports) | .image' docker-compose.yml
```

## Map Array
```bash
yq '[.items[].name]' file.yml
```

## Multi-Document YAML (Multiple --- separated docs)
```bash
yq 'select(document_index == 0)' multi.yml     # First document
yq 'select(document_index == 1)' multi.yml     # Second document
```

---

# Output Formats

```bash
yq file.yml                # YAML output (default)
yq -o json file.yml        # JSON output
yq -o yaml file.yml        # Explicit YAML output
yq -r '.field' file.yml    # Raw output (strings without quotes)
```

**For string fields, use `-r` for raw output (like jq).**

---

# Pipe Composition

yq uses `|` for piping within queries (like jq):
```bash
yq '.services | keys | .[]' docker-compose.yml
```

Can also pipe to shell commands:
```bash
yq '.services | keys' docker-compose.yml | wc -l        # Count services
yq '.services.*.image' docker-compose.yml | sort | uniq  # Unique images
```

---

# Common Flags

- `-r` - Raw output (strings without quotes)
- `-o FORMAT` - Output format (yaml, json, props, xml, etc.)
- `-i` - In-place edit (DANGEROUS - use carefully)
- `-P` - Pretty print
- `-I INDENT` - Indentation level

**Default to `-r` for string extraction, `-o json` for JSON output.**

---

# YAML-Specific Features

## Anchors and Aliases
YAML supports anchors (&) and aliases (*):
```yaml
default: &default
  timeout: 30

production:
  <<: *default
  host: prod.example.com
```

yq resolves these automatically:
```bash
yq '.production.timeout' file.yml    # Returns 30 (from anchor)
```

## Multi-Document YAML
Many YAML files contain multiple documents separated by `---`:
```bash
yq 'select(document_index == 0)' file.yml    # First document
yq 'select(document_index == 1)' file.yml    # Second document
```

---

# Handling Edge Cases

## If Field Might Not Exist
```bash
yq '.field // "not found"' file.yml
```

## If Array Might Be Empty
```bash
yq '.items[]? // empty' file.yml
```

## Multiple Possible Paths
```bash
yq '.field1 // .field2 // "default"' file.yml
```

---

# Comparison with jq

**Similarities:**
- Similar query syntax (`.field`, `.nested.field`, `.array[]`)
- Pipe operator `|`
- Filter with `select()`
- Default values with `//`

**Differences:**
- yq handles YAML (jq handles JSON)
- yq can output multiple formats (`-o json`, `-o yaml`)
- yq handles YAML features (anchors, multi-doc)
- Slightly different handling of wildcards (`.*` in yq, similar in jq)

**Converting between formats:**
```bash
yq -o json file.yml | jq '.field'    # YAML → JSON → query with jq
jq '.' file.json | yq -P             # JSON → pretty YAML
```

---

# Integration with Other Tools

## With ast-grep
```bash
# Get dependencies from YAML, search code for usage
yq '.dependencies | keys' config.yml | while read dep; do
  rg -l "$dep"
done
```

## With jq (via JSON conversion)
```bash
yq -o json file.yml | jq '.complex.query'
```
If yq syntax doesn't work, convert to JSON and use jq.

## With Docker Compose
```bash
# Get all service images, then pull them
yq '.services.*.image' docker-compose.yml | xargs -n1 docker pull
```

---

# Best Practices

## 1. Use -r for String Fields
```bash
# BAD:  yq '.version' file.yml  → may include YAML formatting
# GOOD: yq -r '.version' file.yml  → raw string
```

## 2. Use -o json for Complex Queries
If yq query is complex, convert to JSON and use jq:
```bash
yq -o json file.yml | jq '.complex.query'
```

## 3. Test Queries on Small Examples
```bash
echo 'key: value' | yq '.key'
```

## 4. Use // for Defaults
```bash
yq -r '.field // "default"' file.yml
```

## 5. Be Aware of Multi-Document Files
Check if file has multiple documents (look for `---`).

---

# Quick Reference

## Most Common Commands

```bash
# Single field
yq '.field' file.yml

# Nested field
yq '.parent.child' file.yml

# Array element
yq '.array[0]' file.yml

# All array elements
yq '.array[]' file.yml

# Object keys
yq 'keys' file.yml

# Filter array
yq '.array[] | select(.field == "value")' file.yml

# All services (docker-compose)
yq '.services | keys' docker-compose.yml

# Convert to JSON
yq -o json file.yml

# Raw string output
yq -r '.field' file.yml
```

---

# When to Use Read Instead

Use Read tool when:
- File is < 50 lines
- Need to see overall structure
- Making edits (need full context)
- Exploring unknown YAML structure

Use yq when:
- File is large (docker-compose, k8s configs often are)
- You know exactly what field(s) you need
- Want to save context tokens

---

# Summary

**Your default pattern:**
```bash
yq '.field' file.yml
```

**For strings:**
```bash
yq -r '.field' file.yml
```

**For JSON output:**
```bash
yq -o json file.yml
```

**Key principles:**
1. Use `-r` for raw string output
2. Use `.` notation for nested fields
3. Use `[]` for arrays, `[n]` for specific index
4. Use `| keys` for object keys
5. Use `//` for defaults
6. Use `-o json` to convert to JSON if needed

**Massive context savings: Extract only what you need instead of reading entire YAML files.**
