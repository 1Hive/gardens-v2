#!/usr/bin/env node

/**
 * Diamond ABI Aggregator Script
 *
 * Auto-discovers diamond contracts and their facets, then aggregates all
 * ABIs into single files for frontend consumption.
 *
 * Auto-Discovery Features:
 *   - Finds main contracts by detecting fallback() functions
 *   - Discovers all facets in facets/ subdirectories
 *   - Skips standard diamond library facets
 *   - Combines ABIs removing duplicates
 *
 * Usage:
 *   node scripts/aggregate-diamond-abi.js [options]
 *
 * Options:
 *   --path <path>   Specific directory to process (e.g., src/CVStrategy)
 *   --verbose       Show detailed output
 *   --help          Show this help message
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  specificPath: null,
  verbose: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--path':
      options.specificPath = args[++i];
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--help':
      console.log(__doc__);
      process.exit(0);
    default:
      log(colors.red, `Unknown option: ${args[i]}`);
      process.exit(1);
  }
}

// Check if file contains fallback() function
function hasFallback(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes('fallback()');
  } catch (error) {
    return false;
  }
}

// Rename overloaded "Distributed" from Allo strategy base to avoid The Graph
// generating Distributed/Distributed1 and breaking mapping type imports.
function normalizeAbiItem(item) {
  if (item.type !== 'event' || item.name !== 'Distributed') {
    return item;
  }

  const isAlloDistributed =
    Array.isArray(item.inputs) &&
    item.inputs.length === 4 &&
    item.inputs[0]?.type === 'address' &&
    item.inputs[0]?.indexed === true &&
    item.inputs[1]?.type === 'address' &&
    item.inputs[2]?.type === 'uint256' &&
    item.inputs[3]?.type === 'address';

  if (!isAlloDistributed) {
    return item;
  }

  return {
    ...item,
    name: 'AlloDistributed',
  };
}

// Aggregate ABIs for a diamond contract
function aggregateDiamondABI(mainContract, facets) {
  log(colors.blue, `\nProcessing ${mainContract}...`);

  // Create output directory
  const outputDir = 'abis/DiamondAggregated';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load main contract ABI
  const mainABIPath = `out/${mainContract}.sol/${mainContract}.json`;
  if (!fs.existsSync(mainABIPath)) {
    log(colors.red, `  ✗ Main contract ABI not found: ${mainABIPath}`);
    return false;
  }

  const mainJSON = JSON.parse(fs.readFileSync(mainABIPath, 'utf8'));

  // Start with main contract functions and events
  const functionNames = new Set();
  const eventNames = new Set();
  const errorNames = new Set();
  const aggregatedABI = [];

  for (const rawItem of mainJSON.abi) {
    const item = normalizeAbiItem(rawItem);
    if (item.type === 'function') {
      functionNames.add(item.name);
      aggregatedABI.push(item);
      continue;
    }
    if (item.type === 'event') {
      eventNames.add(item.name);
      aggregatedABI.push(item);
      continue;
    }
    if (item.type === 'error') {
      errorNames.add(item.name);
      aggregatedABI.push(item);
      continue;
    }
    if (item.type === 'fallback' || item.type === 'receive') {
      aggregatedABI.push(item);
    }
  }

  let facetsProcessed = 0;

  // Add each facet's unique functions
  for (const facetName of facets) {
    const facetABIPath = `out/${facetName}.sol/${facetName}.json`;

    if (!fs.existsSync(facetABIPath)) {
      log(colors.yellow, `  ⚠ Facet ABI not found: ${facetABIPath}`);
      continue;
    }

    const facetJSON = JSON.parse(fs.readFileSync(facetABIPath, 'utf8'));

    // Add functions and events that don't already exist
    let functionsAdded = 0;
    let eventsAdded = 0;
    let errorsAdded = 0;
    for (const rawItem of facetJSON.abi) {
      const item = normalizeAbiItem(rawItem);
      if (item.type === 'function' && !functionNames.has(item.name)) {
        aggregatedABI.push(item);
        functionNames.add(item.name);
        functionsAdded++;
      } else if (item.type === 'event' && !eventNames.has(item.name)) {
        aggregatedABI.push(item);
        eventNames.add(item.name);
        eventsAdded++;
      } else if (item.type === 'error' && !errorNames.has(item.name)) {
        aggregatedABI.push(item);
        errorNames.add(item.name);
        errorsAdded++;
      }
    }

    facetsProcessed++;

    if (options.verbose) {
      log(
        colors.green,
        `  ✓ Merged ${facetName} (${functionsAdded} new functions, ${eventsAdded} new events, ${errorsAdded} new errors)`
      );
    }
  }

  // Write aggregated ABI
  const outputPath = `${outputDir}/${mainContract}.json`;
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ abi: aggregatedABI }, null, 2)
  );

  const functionCount = aggregatedABI.filter(item => item.type === 'function').length;

  log(colors.green, `✓ ${mainContract}: Aggregated ${facetsProcessed} facets, ${functionCount} total functions`);
  log(colors.blue, `  Output: ${outputPath}`);

  return true;
}

// Process a directory with facets
function processDirectory(dirPath) {
  const dirName = path.basename(dirPath);

  log(colors.blue, `\n=== Discovering facets in ${dirName} ===`);

  // Find main contract with fallback() function
  let mainContract = null;

  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (file.endsWith('.sol')) {
        const filePath = path.join(dirPath, file);
        if (hasFallback(filePath)) {
          mainContract = file.replace('.sol', '');
          break;
        }
      }
    }
  } catch (error) {
    log(colors.yellow, `  Error reading directory: ${error.message}`);
    return;
  }

  if (!mainContract) {
    log(colors.yellow, '  No main contract with fallback() found, skipping');
    return;
  }

  log(colors.blue, `  Main contract: ${mainContract}`);

  // Check if facets directory exists
  const facetsDir = path.join(dirPath, 'facets');
  if (!fs.existsSync(facetsDir)) {
    log(colors.yellow, '  No facets directory found, skipping');
    return;
  }

  // Discover all facets
  const facetNames = [];
  const skipFacets = ['DiamondCutFacet', 'DiamondLoupeFacet', 'OwnershipFacet'];

  try {
    const files = fs.readdirSync(facetsDir);
    for (const file of files) {
      if (file.endsWith('Facet.sol')) {
        const facetName = file.replace('.sol', '');

        if (skipFacets.includes(facetName)) {
          log(colors.yellow, `  Skipping standard diamond facet: ${facetName}`);
          continue;
        }

        facetNames.push(facetName);
        log(colors.green, `  Found facet: ${facetName}`);
      }
    }
  } catch (error) {
    log(colors.yellow, `  Error reading facets directory: ${error.message}`);
    return;
  }

  if (facetNames.length === 0) {
    log(colors.yellow, '  No custom facets found to aggregate');
    return;
  }

  // Aggregate ABIs
  aggregateDiamondABI(mainContract, facetNames);
}

// Main execution
function main() {
  log(colors.blue, 'Starting diamond ABI aggregation...');

  if (options.specificPath) {
    if (!fs.existsSync(options.specificPath)) {
      log(colors.red, `Error: Directory ${options.specificPath} not found`);
      process.exit(1);
    }
    processDirectory(options.specificPath);
  } else {
    // Auto-discover all directories with facets
    const srcDir = 'src';

    try {
      const dirs = fs.readdirSync(srcDir);
      for (const dir of dirs) {
        const dirPath = path.join(srcDir, dir);
        const facetsPath = path.join(dirPath, 'facets');

        // Skip diamonds directory and non-directories
        if (dir === 'diamonds' || !fs.statSync(dirPath).isDirectory()) {
          continue;
        }

        if (fs.existsSync(facetsPath) && fs.statSync(facetsPath).isDirectory()) {
          processDirectory(dirPath);
        }
      }
    } catch (error) {
      log(colors.red, `Error scanning src directory: ${error.message}`);
      process.exit(1);
    }
  }

  log(colors.blue, '\n=== Summary ===');
  log(colors.green, '✓ Diamond ABI aggregation complete!');
  log(colors.green, '  Aggregated ABIs available in: abis/DiamondAggregated/');
}

// Run
main();
