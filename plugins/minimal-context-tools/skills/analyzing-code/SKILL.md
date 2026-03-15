---
name: analyzing-code
description: Use when understanding project composition by language, measuring code change impact, or generating code statistics for CI/CD metrics
---

# tokei: Code Statistics Analysis

**Always invoke analyzing-code skill for code statistics - do not execute bash commands directly.**

Use tokei for fast, accurate code statistics across multiple languages and projects.

## Default Strategy

**Invoke analyzing-code skill** for analyzing code statistics by language. Use when understanding project composition, measuring change impact before refactoring, or generating CI/CD metrics.

Common workflow: analyzing-code skill → other skills (finding-files, querying-json, querying-yaml) for filtering or analyzing-code skill after refactoring to measure impact.

## Key Options

### Basic Output Control
- `-f/--files` show individual file statistics
- `-l/--languages` list supported languages and extensions
- `-v/--verbose` show unknown file extensions (1-3)
- `-V/--version` show version information
- `--hidden` include hidden files
- `-c/--columns N` set strict column width

### Filtering & Exclusion
- `-t/--type TYPES` filter by language types (comma-separated)
- `-e/--exclude PATTERNS` exclude files/dirs (gitignore syntax)
- `--no-ignore` don't respect ignore files
  - `--no-ignore-dot` don't respect .ignore/.tokeignore
  - `--no-ignore-vcs` don't respect VCS ignore files
  - `--no-ignore-parent` don't respect parent ignore files

### Output Formats
- `-o/--output FORMAT` output format (json|yaml|cbor)
  - Requires compilation with features: `cargo install tokei --features all`
- `-i/--input FILE` read from previous tokei run or stdin

### Sorting Options
- `-s/--sort COLUMN` sort by column
  - Possible values: `files|lines|blanks|code|comments`

## Detailed Reference

For comprehensive usage patterns, output formats, language filtering, and integration examples, load [tokei guide](./reference/tokei-guide.md) when needing:
- Advanced language filtering and exclusion
- JSON/YAML output processing
- CI/CD integration patterns
- Docker usage examples
- Performance tuning for large codebases

The guide includes:
- Basic usage and output control options
- Language filtering and exclusion patterns
- Output format configuration (JSON, YAML, CBOR)
- Performance tips for large codebases
- Docker usage and CI/CD integration
- Configuration files and environment variables

## Skill Combinations

### For Discovery Phase
- **finding-files → analyzing-code**: Analyze specific file types or directories
- **extracting-code-structure → analyzing-code**: Get statistics for specific code components
- **git diff → analyzing-code**: Analyze changed files statistics

### For Analysis Phase
- **analyzing-code → querying-json/querying-yaml**: Parse statistics output for reports
- **analyzing-code → fuzzy-selecting**: Interactive selection from language breakdown
- **analyzing-code → viewing-files**: View statistics with formatted output

### For Refactoring Phase
- **analyzing-code → replacing-text**: Update configuration based on code statistics
- **analyzing-code-structure → analyzing-code**: Measure impact of structural changes
- **analyzing-code → searching-text**: Find files contributing to specific language statistics

### Multi-Skill Workflows
- **analyzing-code → finding-files → searching-text → analyzing-code-structure**: Statistics-driven refactoring pipeline
- **analyzing-code → querying-json → fuzzy-selecting**: Interactive language-based file selection
- **git workflow**: git diff → analyzing-code → finding-files → viewing-files (analyze changes, select files, preview)

### Integration Examples
```bash
# Get language breakdown and filter for top languages
tokei -o json | jq '.data | to_entries | sort_by(.value.stats.code) | reverse | .[0:5] | .[].key'

# Analyze changes after refactoring
git diff --name-only | xargs tokei --files

# Find and analyze specific components
fd -e py src/components | xargs tokei -t Python
```
