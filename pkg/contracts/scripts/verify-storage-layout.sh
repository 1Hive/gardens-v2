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
CACHE_DIR="cache/storage-layout"

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
    local main_contract_path="$2"
    local facet_contract="$3"
    local facet_contract_path="$4"
    local facet_name="$5"

    printf "  Checking ${facet_name}... "

    # Generate storage layouts (suppress nightly build warning)
    local main_tmp="/tmp/main_${facet_name}_$$.txt"
    local facet_tmp="/tmp/facet_${facet_name}_$$.txt"

    build_storage_layout "$main_contract" "$main_contract_path" "$main_tmp"
    build_storage_layout "$facet_contract" "$facet_contract_path" "$facet_tmp"

    # Compare
    if diff "$main_tmp" "$facet_tmp" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ MATCH${NC}"
        rm -f "$main_tmp" "$facet_tmp"
        return 0
    else
        echo -e "${RED}✗ MISMATCH${NC}"

        if [ "$VERBOSE" = true ]; then
            echo -e "${YELLOW}Storage layout differences between ${main_contract} and ${facet_contract}:${NC}"
            echo -e "${BLUE}Format: Variable Type Slot Offset${NC}"
            echo ""

            # Create detailed diff with context
            local diff_output=$(diff -u "$main_tmp" "$facet_tmp" 2>&1 || true)

            # Parse and display in a more readable format
            echo "$diff_output" | while IFS= read -r line; do
                if [[ "$line" == "---"* ]] || [[ "$line" == "+++"* ]] || [[ "$line" == "@@"* ]]; then
                    # Skip diff headers
                    continue
                elif [[ "$line" == "-"* ]]; then
                    # Lines in main but not in facet (should not happen - facet should have all main's storage)
                    echo -e "${RED}  MAIN HAS (facet missing):  ${line:1}${NC}"
                elif [[ "$line" == "+"* ]]; then
                    # Lines in facet but not in main (this is the error - facet has extra storage)
                    echo -e "${YELLOW}  FACET HAS (main missing): ${line:1}${NC}"
                else
                    # Common lines
                    if [ -n "$line" ]; then
                        echo -e "${GREEN}  ✓ ${line}${NC}"
                    fi
                fi
            done
            echo ""
        else
            echo -e "${YELLOW}  Run with --verbose to see detailed differences${NC}"
        fi

        rm -f "$main_tmp" "$facet_tmp"
        return 1
    fi
}

build_storage_layout() {
    local contract_name="$1"
    local contract_path="$2"
    local output_file="$3"

    mkdir -p "$CACHE_DIR"
    local cache_file
    cache_file=$(cache_file_for_contract "$contract_name" "$contract_path")

    if [ -f "$cache_file" ]; then
        echo -e "${BLUE}  Cache hit:${NC} ${cache_file}"
        cp "$cache_file" "$output_file"
        return 0
    fi

    FOUNDRY_DISABLE_NIGHTLY_WARNING=1 forge inspect "$contract_name" storageLayout 2>&1 | \
        grep -E "^\| [a-zA-Z_][a-zA-Z0-9_]* " | grep -v "__gap" | awk '{print $2, $4, $6, $8}' > "$output_file" || true

    if [ -s "$output_file" ]; then
        cp "$output_file" "$cache_file"
        echo -e "${BLUE}  Cached layout:${NC} ${cache_file}"
    fi
}

cache_file_for_contract() {
    local contract_name="$1"
    local contract_path="$2"
    local hash
    hash=$(sha256sum "$contract_path" | awk '{print $1}')
    echo "$CACHE_DIR/${contract_name}-${hash}.txt"
}

all_cached_for_directory() {
    local dir_path="$1"

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
        return 0
    fi

    local cache_file
    cache_file=$(cache_file_for_contract "$main_contract_name" "$main_contract_file")
    if [ ! -f "$cache_file" ]; then
        return 1
    fi

    local facets_dir="$dir_path/facets"
    if [ ! -d "$facets_dir" ]; then
        return 0
    fi

    local skip_facets=("DiamondCutFacet" "DiamondLoupeFacet" "OwnershipFacet")
    for facet_file in "$facets_dir"/*Facet.sol; do
        if [ ! -f "$facet_file" ]; then
            continue
        fi

        local facet_name
        facet_name=$(basename "$facet_file" .sol)
        local skip=false
        for skip_facet in "${skip_facets[@]}"; do
            if [ "$facet_name" == "$skip_facet" ]; then
                skip=true
                break
            fi
        done

        if [ "$skip" = true ]; then
            continue
        fi

        cache_file=$(cache_file_for_contract "$facet_name" "$facet_file")
        if [ ! -f "$cache_file" ]; then
            return 1
        fi
    done

    return 0
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

        if ! verify_facet_storage "$main_contract_name" "$main_contract_file" "$facet_name" "$facet_file" "$facet_name"; then
            ((failed_facets++))
        fi
    done

    if [ $facet_count -eq 0 ]; then
        echo -e "${YELLOW}  No facets found to verify${NC}"
    fi

    echo ""

    return $failed_facets
}

# Function to verify RegistryFactory storage layout invariants.
# This catches accidental slot shifts in non-diamond upgradeable contracts.
verify_registry_factory_storage() {
    local contract_name="RegistryFactory"
    local contract_path="src/RegistryFactory/RegistryFactory.sol"

    if [ ! -f "$contract_path" ]; then
        echo -e "${YELLOW}Skipping RegistryFactory check (file not found: $contract_path)${NC}"
        return 0
    fi

    echo -e "${BLUE}=== Processing RegistryFactory ===${NC}"
    printf "  Checking storage layout invariants... "

    local layout_tmp="/tmp/registry_factory_layout_$$.txt"
    FOUNDRY_DISABLE_NIGHTLY_WARNING=1 forge inspect "$contract_name" storageLayout > "$layout_tmp" 2>/dev/null

    if [ ! -s "$layout_tmp" ]; then
        echo -e "${RED}✗ FAILED${NC}"
        echo -e "${RED}  Could not inspect RegistryFactory storage layout${NC}"
        rm -f "$layout_tmp"
        return 1
    fi

    local ok=true

    if ! grep -q "| streamingEscrowFactory    | address" "$layout_tmp"; then
        ok=false
        [ "$VERBOSE" = true ] && echo -e "${RED}  Missing streamingEscrowFactory storage field${NC}"
    fi
    if ! grep -q "| globalPauseController     | address" "$layout_tmp"; then
        ok=false
        [ "$VERBOSE" = true ] && echo -e "${RED}  Missing globalPauseController storage field${NC}"
    fi
    if ! grep -q "| __gap                     | uint256\\[42\\]                              | 118" "$layout_tmp"; then
        ok=false
        [ "$VERBOSE" = true ] && echo -e "${RED}  Expected __gap (uint256[42]) at slot 118${NC}"
    fi

    rm -f "$layout_tmp"

    if [ "$ok" = true ]; then
        echo -e "${GREEN}✓ MATCH${NC}"
        echo ""
        return 0
    fi

    echo -e "${RED}✗ MISMATCH${NC}"
    if [ "$VERBOSE" = false ]; then
        echo -e "${YELLOW}  Run with --verbose to see detailed differences${NC}"
    fi
    echo ""
    return 1
}

# Build contracts if not skipped
if [ "$SKIP_BUILD" = false ]; then
    mkdir -p "$CACHE_DIR"
    all_cached=true

    if [ -n "$SPECIFIC_PATH" ]; then
        if ! all_cached_for_directory "$SPECIFIC_PATH"; then
            all_cached=false
        fi
    else
        for facets_dir in src/*/facets; do
            if [ -d "$facets_dir" ]; then
                parent_dir=$(dirname "$facets_dir")
                dir_name=$(basename "$parent_dir")

                if [ "$dir_name" == "diamonds" ]; then
                    continue
                fi

                if ! all_cached_for_directory "$parent_dir"; then
                    all_cached=false
                    break
                fi
            fi
        done
    fi

    if [ "$all_cached" = true ]; then
        echo -e "${BLUE}All storage layouts cached in ${CACHE_DIR}; skipping build.${NC}"
    else
        echo -e "${BLUE}Building contracts...${NC}"
        FOUNDRY_DISABLE_NIGHTLY_WARNING=1 forge build > /dev/null 2>&1
    fi
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

    # Verify non-diamond upgradeable contracts that still require storage safety checks
    if ! verify_registry_factory_storage; then
        ((TOTAL_FAILED += 1))
    fi
fi

# Cleanup any remaining temp files
rm -f /tmp/main_*_$$.txt /tmp/facet_*_$$.txt

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All storage layouts match!${NC}"
    echo -e "${GREEN}  Storage alignment verified (diamond facets + RegistryFactory).${NC}"
    exit 0
else
    echo -e "${RED}✗ $TOTAL_FAILED storage check(s) failed${NC}"
    echo -e "${RED}  CRITICAL: Fix storage alignment before deployment!${NC}"
    echo -e "${YELLOW}  Run with --verbose to see detailed differences${NC}"
    exit 1
fi
