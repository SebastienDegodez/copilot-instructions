#!/bin/bash
# Script to validate that all paths in collection YAML files exist
# Usage: ./validate-collection-links.sh [collection-file.yml]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0
checked=0

validate_collection() {
    local collection_file="$1"
    
    if [[ ! -f "$collection_file" ]]; then
        echo -e "${RED}✗ Collection file not found: $collection_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Validating: $collection_file${NC}"
    echo "----------------------------------------"
    
    # Extract paths from YAML using grep and sed
    local paths=$(grep -E '^\s*- path:' "$collection_file" | sed 's/.*path:\s*//' | tr -d ' ')
    
    for path in $paths; do
        local full_path="$ROOT_DIR/$path"
        ((checked++))
        
        if [[ -f "$full_path" ]]; then
            echo -e "${GREEN}✓ $path${NC}"
        else
            echo -e "${RED}✗ $path (NOT FOUND)${NC}"
            ((errors++))
        fi
    done
    
    echo ""
}

# Main execution
if [[ -n "$1" ]]; then
    # Validate specific collection file
    validate_collection "$1"
else
    # Validate all collection files
    for collection in "$ROOT_DIR/collections"/*.yml; do
        if [[ -f "$collection" ]]; then
            validate_collection "$collection"
        fi
    done
fi

# Summary
echo "========================================"
echo "Summary:"
echo "  Checked: $checked paths"
echo -e "  ${GREEN}Valid: $((checked - errors))${NC}"
if [[ $errors -gt 0 ]]; then
    echo -e "  ${RED}Missing: $errors${NC}"
fi
echo "========================================"

if [[ $errors -gt 0 ]]; then
    echo -e "${RED}Validation FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}Validation PASSED${NC}"
    exit 0
fi
