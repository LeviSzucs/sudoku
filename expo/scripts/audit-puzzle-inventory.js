const {
  INVENTORY_TARGETS,
  PREFERRED_SOURCE,
  auditInventory,
  loadCanonicalInventory,
} = require("./puzzle-inventory-core");
const { DIFFICULTIES } = require("./puzzle-bank-utils");

function tableRow(values, widths) {
  return values.map((value, index) => String(value).padEnd(widths[index])).join("  ").trimEnd();
}

function printInventoryTable(audit) {
  const widths = [12, 8, 8, 12, 15, 11];
  console.log(tableRow(["Difficulty", "Active", "Inactive", "Preferred", "Target", "Clues"], widths));
  console.log(tableRow(widths.map((width) => "-".repeat(width)), widths));
  for (const difficulty of DIFFICULTIES) {
    const active = audit.activeByDifficulty[difficulty] ?? 0;
    const total = audit.byDifficulty[difficulty] ?? 0;
    const preferred = audit.preferredByDifficulty[difficulty] ?? 0;
    const range = audit.clueRanges[difficulty];
    console.log(
      tableRow(
        [
          difficulty,
          active,
          total - active,
          preferred,
          INVENTORY_TARGETS[difficulty],
          range ? `${range.min}-${range.max}` : "n/a",
        ],
        widths
      )
    );
  }
}

function printSourceTable(audit) {
  console.log("\nSource/status inventory:");
  for (const [key, count] of Object.entries(audit.bySourceAndStatus).sort()) {
    const [source, status] = key.split("|");
    console.log(`  ${source} [${status}]: ${count}`);
  }
}

function printFindings(audit) {
  const issueCounts = {};
  for (const { issue } of audit.issues) issueCounts[issue.type] = (issueCounts[issue.type] ?? 0) + 1;
  console.log("\nIntegrity findings:");
  console.log(`  Structurally invalid rows: ${issueCounts["malformed board"] ?? 0}`);
  console.log(`  Invalid givens rows: ${issueCounts["invalid givens"] ?? 0}`);
  console.log(`  Invalid stored solutions: ${issueCounts["invalid solution"] ?? 0}`);
  console.log(`  Givens conflicting with stored solution: ${issueCounts["givens do not match solution"] ?? 0}`);
  console.log(`  Zero-solution rows: ${issueCounts["zero solutions"] ?? 0}`);
  console.log(`  Multiple-solution rows: ${issueCounts["multiple solutions"] ?? 0}`);
  console.log(`  Malformed difficulty rows: ${issueCounts["invalid difficulty"] ?? 0}`);
  console.log(`  Missing source rows: ${issueCounts["missing source"] ?? 0}`);
  console.log(`  Total row validation errors: ${audit.issues.length}`);
  console.log(`  Duplicate effective puzzle IDs: ${audit.allDuplicates.ids.length}`);
  console.log(`  Duplicate givens groups (all/effective): ${audit.allDuplicates.givens.length}`);
  console.log(`  Duplicate givens groups (active): ${audit.activeDuplicates.givens.length}`);
  console.log(`  Duplicate full-solution groups (all/effective): ${audit.allDuplicates.solutions.length}`);
  console.log(`  Duplicate full-solution groups (active): ${audit.activeDuplicates.solutions.length}`);
}

function main() {
  const inventory = loadCanonicalInventory();
  const audit = auditInventory(inventory.puzzles);

  console.log("SudoDuel puzzle inventory audit");
  console.log(`Dataset: ${inventory.source}`);
  console.log(`Migration tuples scanned: ${inventory.rawCount}`);
  console.log(`Effective puzzle rows: ${audit.total} (${audit.active} active, ${audit.inactive} inactive)`);
  console.log(`Preferred source: ${PREFERRED_SOURCE}`);
  console.log("");
  printInventoryTable(audit);
  printSourceTable(audit);
  printFindings(audit);

  console.log("\nPlanning target warnings:");
  for (const difficulty of DIFFICULTIES) {
    const count = audit.activeByDifficulty[difficulty] ?? 0;
    const target = INVENTORY_TARGETS[difficulty];
    const gap = Math.max(0, target - count);
    console.log(`  ${difficulty}: ${count}/${target}${gap ? ` (short by ${gap})` : " (target met)"}`);
  }

  if (audit.activeDuplicates.solutions.length > 0) {
    console.warn("\nWarning: active rows share complete solutions. This is reported for curation, not treated as invalid when givens differ.");
  }

  const fatalDuplicateGroups = audit.activeDuplicates.ids.length + audit.activeDuplicates.givens.length;
  if (audit.issues.length > 0 || fatalDuplicateGroups > 0) {
    console.error("\nPuzzle inventory audit failed integrity checks.");
    process.exitCode = 1;
    return;
  }
  console.log("\nPuzzle inventory integrity checks passed.");
}

main();

