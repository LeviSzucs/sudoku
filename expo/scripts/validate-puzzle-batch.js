const path = require("path");

const {
  loadBatch,
  loadCanonicalInventory,
  validateBatch,
} = require("./puzzle-inventory-core");

function main() {
  const batchPath = process.argv[2];
  if (!batchPath) {
    console.error("Usage: npm run puzzles:validate-batch -- path/to/batch.json");
    process.exitCode = 1;
    return;
  }

  try {
    const batch = loadBatch(batchPath);
    const canonical = loadCanonicalInventory();
    const result = validateBatch(batch, canonical.puzzles);

    console.log(`Validating ${batch.length} puzzle row(s) from ${path.resolve(batchPath)}.`);
    console.log(`Compared against ${canonical.puzzles.length} effective migration-derived puzzle rows.`);
    for (const finding of result.findings) {
      const id = finding.puzzle?.puzzle_id || "(missing id)";
      const output = finding.severity === "error" ? console.error : console.warn;
      output(`  [${finding.severity.toUpperCase()}] row ${finding.index + 1} ${id}: ${finding.type} - ${finding.detail}`);
    }
    console.log(`Summary: ${result.errors.length} error(s), ${result.warnings.length} warning(s).`);
    if (result.errors.length > 0) {
      process.exitCode = 1;
      return;
    }
    console.log("Puzzle batch validation passed.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();

