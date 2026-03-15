# tokei Quick Reference Guide

**Goal: Fast, accurate code statistics analysis across multiple languages.**

## Basic Usage
```bash
tokei                          # Current directory
tokei ./src                    # Specific directory
tokei ./src ./tests            # Multiple directories
tokei file.py                   # Single file
```

## Output Control
```bash
tokei --files                  # Individual file statistics
tokei --sort code               # Sort by code lines
tokei --sort lines              # Sort by total lines
tokei --languages                # List all supported languages
tokei -c 80                    # Set column width
```

## Language Filtering
```bash
tokei -t Rust,Python            # Specific languages
tokei -t Rust -s code          # Filter and sort
tokei --type JavaScript,TypeScript # Multiple language types
tokei -t "C++","C Header"     # Quoted language names
```

## Exclusion Options
```bash
tokei --exclude "*.rs"           # Exclude by pattern
tokei -e target -e build        # Multiple exclusions
tokei --exclude "*.d"           # Exclude D object files
tokei --no-ignore                # Ignore all .gitignore/.ignore files
tokei --hidden                   # Include hidden files
```

## Output Formats
```bash
tokei --output json              # JSON format
tokei --output yaml              # YAML format
tokei --output cbor              # CBOR format
tokei -o json > stats.json      # Save to file
```

## Advanced Usage

### Combining Results
```bash
# Save current stats, then add more
tokei ./src -o json > current.json
tokei ./tests --input current.json -o json combined.json

# Read from stdin
find . -name "*.py" | tokei --input -

# Complex workflow
tokei ./src -o json | jq '.total.code'  # Extract specific data
```

### Configuration Files
```bash
# tokei.toml configuration
[exclude]
paths = ["target/", "*.d"]
[type]
include = ["Rust", "Python"]

# .tokeignore file (same syntax as .gitignore)
*.d
target/
```

### Performance Tips
```bash
# For very large codebases
tokei --verbose 1               # Show processing info
tokei --sort files               # Fastest sorting option
tokei --output json              # Faster than terminal output

# Recursive analysis with depth control
tokei --exclude node_modules --hidden
```

### Integration Examples
```bash
# CI/CD pipeline integration
tokei . -o json | jq '.Rust.code' > rust_loc.txt

# Compare project sizes
tokei projectA/ -o json > a.json
tokei projectB/ -o json > b.json
# Compare using jq or other tools

# Generate reports
tokei . -o yaml > code-stats.yaml
tokei . | grep Rust              # Quick language extraction
```

### Docker Usage
```bash
# Run from Docker image
docker run --rm -v $(pwd):/src tokei .

# Prebuilt Docker usage
docker run --rm -v /path/to/project:/src tokei /src
```

## Installation & Compilation
```bash
# Install with serialization support
cargo install tokei --features all

# Install specific format support
cargo install tokei --features json,yaml
cargo install tokei --features cbor
```

## Troubleshooting

### Common Issues
```bash
# Exclude D object files (gcc generates .d)
tokei . --exclude "*.d"

# Include hidden files
tokei . --hidden

# Handle unknown file extensions
tokei . --verbose 1              # Show unknown extensions
```

## Environment Variables
```bash
export TOKEI_CONFIG_DIR="/path/to/config"
export NO_COLOR=1                   # Disable colors
```

## Language Examples
```bash
# Analyze specific language types
tokei -t Rust,Cargo.toml      # Rust files + TOML config
tokei -t "Markdown","JSON"    # Docs and data files
tokei -t JavaScript,TypeScript,CSS # Web project languages
```
