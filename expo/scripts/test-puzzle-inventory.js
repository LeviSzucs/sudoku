const assert = require("assert/strict");

const {
  findDuplicateGroups,
  validateBatch,
  validateInventoryRecord,
} = require("./puzzle-inventory-core");
const { countSolutions, validatePuzzle } = require("./puzzle-bank-utils");

const uniquePuzzle = {
  puzzle_id: "fixture_unique",
  difficulty: "Easy",
  givens: "000093084905800026400267309106000003080612007050430060297000618003100070800020430",
  solution: "672593184935841726418267359126975843384612597759438261297354618543186972861729435",
  source_name: "fixture",
  active: false,
};

function issueTypes(puzzle) {
  return new Set(validateInventoryRecord(puzzle, { requireCanonicalGivens: true }).map((issue) => issue.type));
}

function main() {
  assert(issueTypes({ ...uniquePuzzle, givens: "123" }).has("malformed board"));
  assert(issueTypes({ ...uniquePuzzle, givens: `9${uniquePuzzle.givens.slice(1)}` }).has("givens do not match solution"));
  assert(issueTypes({ ...uniquePuzzle, solution: `1${uniquePuzzle.solution.slice(1)}` }).has("invalid solution"));
  assert(issueTypes({ ...uniquePuzzle, difficulty: "Impossible" }).has("invalid difficulty"));

  assert.equal(countSolutions("110000000" + "0".repeat(72), 2), 0, "contradictory givens must have zero solutions");
  assert.equal(countSolutions(uniquePuzzle.givens, 2), 1, "fixture must have exactly one solution");

  const multiSolutionText = "129534867384267915756189432862413759573928146941675283295341678618752394437896521";
  const multiSolution = multiSolutionText.split("");
  for (const index of [0, 2, 45, 47]) multiSolution[index] = "0";
  assert.equal(countSolutions(multiSolution.join(""), 2), 2, "counter must stop after finding two solutions");
  assert(validatePuzzle({ ...uniquePuzzle, givens: multiSolution.join(""), solution: multiSolutionText }).some((issue) => issue.type === "multiple solutions"));

  const duplicateRows = [
    uniquePuzzle,
    { ...uniquePuzzle, puzzle_id: "fixture_unique" },
    { ...uniquePuzzle, puzzle_id: "fixture_same_givens" },
    {
      ...uniquePuzzle,
      puzzle_id: "fixture_same_solution",
      givens: uniquePuzzle.solution,
    },
  ];
  const duplicates = findDuplicateGroups(duplicateRows);
  assert.equal(duplicates.ids.length, 1);
  assert.equal(duplicates.givens.length, 1);
  assert.equal(duplicates.solutions.length, 1);

  const batchResult = validateBatch(duplicateRows, []);
  assert(batchResult.errors.some((finding) => finding.type === "duplicate puzzle_id"));
  assert(batchResult.errors.some((finding) => finding.type === "duplicate givens"));
  assert(batchResult.warnings.some((finding) => finding.type === "duplicate solution"));

  console.log("Puzzle inventory tooling tests passed.");
}

main();

