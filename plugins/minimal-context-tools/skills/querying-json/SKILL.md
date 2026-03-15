---
name: querying-json
description: Use when querying JSON files, filtering or transforming JSON data, or extracting specific fields from large JSON files without loading entire file contents (saves 80-95% context)
---

# jq: JSON Data Extraction Tool

**Always invoke querying-json skill to extract JSON fields - do not execute bash commands directly.**

Use jq to extract specific fields from JSON files without loading entire file contents into context.

## When to Use jq vs Read

**Use jq when:**
- Need specific field(s) from structured data file
- File is large (>50 lines) and only need subset
- Querying nested structures
- Filtering/transforming data
- **Saves 80-95% context** vs reading entire file

**Just use Read when:**
- File is small (<50 lines)
- Need to understand overall structure
- Making edits (need full context anyway)

## Common File Types

JSON files where jq excels:
- package.json, tsconfig.json
- Lock files (package-lock.json, yarn.lock in JSON format)
- API responses
- Configuration files

## Default Strategy

**Invoke querying-json skill** for extracting specific fields from JSON files efficiently. Use instead of reading entire files to save 80-95% context.

Common workflow: finding-files skill → querying-json skill → other skills (fuzzy-selecting, replacing-text, viewing-files) for extraction and transformation.

## Quick Examples

```bash
# Get version from package.json
jq -r .version package.json

# Get nested dependency version
jq -r '.dependencies.react' package.json

# List all dependencies
jq -r '.dependencies | keys[]' package.json
```

## Pipeline Combinations
- **querying-json | fuzzy-selecting**: Interactive selection from JSON data
- **querying-json | replacing-text**: Transform JSON to other formats
- **querying-json | viewing-files**: View extracted JSON with syntax highlighting

## Skill Combinations

### For Discovery Phase
- **finding-files → querying-json**: Find JSON config files and extract specific fields
- **searching-text → querying-json**: Find JSON usage patterns and extract values
- **extracting-code-structure → querying-json**: Understand API structures before extraction

### For Analysis Phase
- **querying-json → fuzzy-selecting**: Interactive selection from structured data
- **querying-json → viewing-files**: View extracted data with syntax highlighting
- **querying-json → analyzing-code**: Extract statistics from JSON output

### For Refactoring Phase
- **querying-json → replacing-text**: Transform JSON data to other formats
- **querying-json → querying-yaml**: Convert JSON to YAML for different tools
- **querying-json → xargs**: Use extracted values as command arguments

### Multi-Skill Workflows
- **querying-json → querying-yaml → replacing-text → viewing-files**: JSON to YAML transformation with preview
- **querying-json → fuzzy-selecting → xargs**: Interactive selection and execution based on JSON data
- **finding-files → querying-json → searching-text**: Find config files, extract values, search usage

### Common Integration Examples
```bash
# Extract and select dependencies
jq -r '.dependencies | keys[]' package.json | fzf --multi | xargs npm info

# Get and filter package versions
jq -r '.devDependencies | to_entries[] | "\(.key)@\(.value)"' package.json | fzf
```

### Note: Choosing Between jq and yq
- **JSON files** (package.json, tsconfig.json): Use `jq`
- **YAML files** (docker-compose.yml, GitHub Actions): Use `yq`

## Detailed Reference

For comprehensive jq patterns, syntax, and examples, load [jq guide](./reference/jq-guide.md) when needing:
- Array manipulation and filtering
- Complex nested data extraction
- Data transformation patterns
- Real-world workflow examples
- Error handling and edge cases
- Core patterns (80% of use cases)
- Real-world workflows
- Advanced patterns
- Pipe composition
- Error handling
- Integration with other tools
