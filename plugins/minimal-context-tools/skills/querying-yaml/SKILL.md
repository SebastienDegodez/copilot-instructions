---
name: querying-yaml
description: Use when querying YAML files, filtering or transforming configuration data, or extracting specific fields from large YAML files like docker-compose.yml or GitHub Actions workflows without loading entire files (saves 80-95% context)
---

# yq: YAML Query and Extraction Tool

**Always invoke querying-yaml skill to extract YAML fields - do not execute bash commands directly.**

Use yq to extract specific fields from YAML files without reading entire file contents, saving 80-95% context usage.

## When to Use yq

**Use yq when:**
- Need specific field(s) from structured YAML file
- File is large (>50 lines) and only need subset of data
- Querying nested structures in YAML
- Filtering/transforming YAML data
- Working with docker-compose.yml, GitHub Actions workflows, K8s configs

**Just use Read when:**
- File is small (<50 lines)
- Need to understand overall structure
- Making edits (need full context anyway)

## Tool Selection

**JSON files** → Use `jq`
- Common: package.json, tsconfig.json, lock files, API responses

**YAML files** → Use `yq`
- Common: docker-compose.yml, GitHub Actions, CI/CD configs

Both tools extract exactly what you need in one command - massive context savings.

## Default Strategy

**Invoke querying-yaml skill** for extracting specific fields from YAML files efficiently. Use instead of reading entire files to save 80-95% context.

Common workflow: finding-files skill → querying-yaml skill → other skills (fuzzy-selecting, replacing-text, viewing-files) for extraction and transformation.

## Pipeline Combinations
- **querying-yaml | fuzzy-selecting**: Interactive selection from YAML data
- **querying-yaml | replacing-text**: Transform YAML to other formats
- **querying-yaml | viewing-files**: View extracted YAML with syntax highlighting

## Skill Combinations

### For Discovery Phase
- **finding-files → querying-yaml**: Find YAML config files and extract specific fields
- **searching-text → querying-yaml**: Find YAML usage patterns and extract values
- **extracting-code-structure → querying-yaml**: Understand API structures before extraction

### For Analysis Phase
- **querying-yaml → fuzzy-selecting**: Interactive selection from structured data
- **querying-yaml → viewing-files**: View extracted data with syntax highlighting
- **querying-yaml → analyzing-code**: Extract statistics from YAML output

### For Refactoring Phase
- **querying-yaml → replacing-text**: Transform YAML data to other formats
- **querying-yaml → querying-json**: Convert YAML to JSON for different tools
- **querying-yaml → xargs**: Use extracted values as command arguments

### Multi-Skill Workflows
- **querying-yaml → querying-json → replacing-text → viewing-files**: YAML to JSON transformation with preview
- **querying-yaml → fuzzy-selecting → xargs**: Interactive selection and execution based on YAML data
- **finding-files → querying-yaml → searching-text**: Find config files, extract values, search usage
- **docker-compose workflow**: querying-yaml → fuzzy-selecting → nc (extract ports, test connectivity)

### Common Integration Examples
```bash
# Get service ports and test connectivity
yq '.services.*.ports' docker-compose.yml | sd - '[^0-9]' '' | fzf | xargs -I {} nc -zv localhost {}

# Extract and filter environment variables
yq '.services.*.environment' docker-compose.yml | sd '\s*-\s*' '' | fzf
```

### Note: Choosing Between jq and yq
- **JSON files** (package.json, tsconfig.json): Use `jq`
- **YAML files** (docker-compose.yml, GitHub Actions): Use `yq`

## Quick Examples

```bash
# Get service ports from docker-compose
yq '.services.*.ports' docker-compose.yml

# Get specific service configuration
yq '.services.web.image' docker-compose.yml

# List all service names
yq '.services | keys[]' docker-compose.yml
```

## Detailed Reference

For comprehensive yq patterns, syntax, and examples, load [yq guide](./reference/yq-guide.md) when needing:
- Complex YAML structure navigation
- Array manipulation and filtering
- Data transformation patterns
- Docker Compose and Kubernetes examples
- Integration with other tools
- Core patterns (80% of use cases)
- Real-world workflows (Docker Compose, GitHub Actions, Kubernetes)
- Advanced patterns and edge case handling
- Output formats and pipe composition
- Best practices and integration with other tools
