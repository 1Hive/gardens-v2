#!/bin/bash

##############################################################################
# Storage Layout Verification Script for Diamond Pattern Contracts
#
# This script automatically discovers diamond contracts and their facets,
# then verifies storage layouts match. Critical for diamond pattern safety.
#
# Auto-Discovery Features:
#   - Finds main contracts by detecting fallback() functions
#   - Discovers all facets in facets/ subdirectories
#   - Skips standard diamond library facets
#
# Usage:
#   ./scripts/verify-storage-layout.sh [options]
#
# Options:
#   --path <path>   Specific directory to verify (e.g., src/CVStrategy)
#   --skip-build    Skip forge build step (assumes contracts already built)
#   --verbose       Show detailed diff output
#   --help          Show this help message
##############################################################################

# Note: Not using 'set -e' because forge inspect can return non-zero on warnings
# Instead, we handle errors explicitly

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
SPECIFIC_PATH=""
VERBOSE=false
SKIP_BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --path)
            SPECIFIC_PATH="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            head -n 23 "$0" | grep "^#" | sed 's/^# //'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Run with --help for usage information"
            exit 1
            ;;
    esac
done

# Function to check if a file contains fallback() function
has_fallback() {
    local file="$1"
    grep -q "fallback()" "$file" 2>/dev/null
}

# Function to compare storage layouts
# Args: $1 = main contract name, $2 = facet contract name, $3 = facet display name
verify_facet_storage() {
    local main_contract="$1"
    local facet_contract="$2"
    local facet_name="$3"

    printf "  Checking ${facet_name}... "

    # Generate storage layouts (suppress nightly build warning)
    local main_tmp="/tmp/main_${facet_name}_$$.txt"
    local facet_tmp="/tmp/facet_${facet_name}_$$.txt"

    FOUNDRY_DISABLE_NIGHTLY_WARNING=1 forge inspect "$main_contract" storageLayout 2>&1 | \
        grep -E "^\| [a-z_]+ " | grep -v "__gap" | awk '{print $2, $4, $6, $8}' > "$main_tmp" || true

    FOUNDRY_DISABLE_NIGHTLY_WARNING=1 forge inspect "$facet_contract" storageLayout 2>&1 | \
        grep -E "^\| [a-z_]+ " | grep -v "__gap" | awk '{print $2, $4, $6, $8}' > "$facet_tmp" || true

    # Compare
    if diff "$main_tmp" "$facet_tmp" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ MATCH${NC}"
        rm -f "$main_tmp" "$facet_tmp"
        return 0
    else
        echo -e "${RED}✗ MISMATCH${NC}"

        if [ "$VERBOSE" = true ]; then
            echo -e "${YELLOW}Storage layout differences:${NC}"
            diff "$main_tmp" "$facet_tmp" || true
        fi

        rm -f "$main_tmp" "$facet_tmp"
        return 1
    fi
}

# Function to process a directory with facets
process_directory() {
    local dir_path="$1"
    local dir_name=$(basename "$dir_path")

    echo -e "${BLUE}=== Processing $dir_name ===${NC}"

    # Find main contract with fallback() function
    local main_contract_file=""
    local main_contract_name=""

    for sol_file in "$dir_path"/*.sol; do
        if [ -f "$sol_file" ] && has_fallback "$sol_file"; then
            main_contract_file="$sol_file"
            main_contract_name=$(basename "$sol_file" .sol)
            break
        fi
    done

    if [ -z "$main_contract_file" ]; then
        echo -e "${YELLOW}  No main contract with fallback() found, skipping${NC}"
        return 0
    fi

    echo -e "  Main contract: ${BLUE}${main_contract_name}${NC}"

    # Check if facets directory exists
    local facets_dir="$dir_path/facets"
    if [ ! -d "$facets_dir" ]; then
        echo -e "${YELLOW}  No facets directory found, skipping${NC}"
        return 0
    fi

    # Discover all facets
    local facet_count=0
    local failed_facets=0

    # Standard diamond library facets to skip (don't share storage with main contract)
    local skip_facets=("DiamondCutFacet" "DiamondLoupeFacet" "OwnershipFacet")

    for facet_file in "$facets_dir"/*Facet.sol; do
        if [ ! -f "$facet_file" ]; then
            continue
        fi

        facet_name=$(basename "$facet_file" .sol)

        # Skip standard diamond facets
        skip=false
        for skip_facet in "${skip_facets[@]}"; do
            if [ "$facet_name" == "$skip_facet" ]; then
                skip=true
                break
            fi
        done

        if [ "$skip" = true ]; then
            echo -e "  ${YELLOW}Skipping standard diamond facet: ${facet_name}${NC}"
            continue
        fi

        ((facet_count++))

        if ! verify_facet_storage "$main_contract_name" "$facet_name" "$facet_name"; then
            ((failed_facets++))
        fi
    done

    if [ $facet_count -eq 0 ]; then
        echo -e "${YELLOW}  No facets found to verify${NC}"
    fi

    echo ""

    return $failed_facets
}

# Build contracts if not skipped
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}Building contracts...${NC}"
    FOUNDRY_DISABLE_NIGHTLY_WARNING=1 forge build > /dev/null 2>&1
fi

echo -e "${BLUE}Starting storage layout verification...${NC}\n"

TOTAL_FAILED=0

# If specific path provided, only check that directory
if [ -n "$SPECIFIC_PATH" ]; then
    if [ ! -d "$SPECIFIC_PATH" ]; then
        echo -e "${RED}Error: Directory $SPECIFIC_PATH not found${NC}"
        exit 1
    fi

    process_directory "$SPECIFIC_PATH"
    TOTAL_FAILED=$?
else
    # Auto-discover all directories with facets (exclude src/diamonds - generic utilities)
    for facets_dir in src/*/facets; do
        if [ -d "$facets_dir" ]; then
            parent_dir=$(dirname "$facets_dir")
            dir_name=$(basename "$parent_dir")

            # Skip diamonds directory (contains generic diamond utilities, not storage-sharing contracts)
            if [ "$dir_name" == "diamonds" ]; then
                echo -e "${YELLOW}Skipping src/diamonds (generic diamond utilities)${NC}\n"
                continue
            fi

            process_directory "$parent_dir"
            failed=$?
            ((TOTAL_FAILED += failed))
        fi
    done
fi

# Cleanup any remaining temp files
rm -f /tmp/main_*_$$.txt /tmp/facet_*_$$.txt

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All storage layouts match!${NC}"
    echo -e "${GREEN}  Diamond pattern storage alignment verified.${NC}"
    exit 0
else
    echo -e "${RED}✗ $TOTAL_FAILED facet(s) have storage layout mismatches${NC}"
    echo -e "${RED}  CRITICAL: Fix storage alignment before deployment!${NC}"
    echo -e "${YELLOW}  Run with --verbose to see detailed differences${NC}"
    exit 1
fi
