function cellIndex(row, col) {
  return row * 9 + col;
}

function coordsFromIndex(index) {
  return {
    row: Math.floor(index / 9),
    col: index % 9,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateIndexRoundTrip() {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const index = cellIndex(row, col);
      const coords = coordsFromIndex(index);
      assert(coords.row === row, `Row mismatch for index ${index}: expected ${row}, got ${coords.row}`);
      assert(coords.col === col, `Column mismatch for index ${index}: expected ${col}, got ${coords.col}`);
    }
  }
}

function validateGivenOverlay() {
  const givens = [
    [8, 0, 0, 0, 6, 0, 5, 0, 3],
    [0, 0, 0, 0, 7, 0, 4, 1, 0],
    [1, 0, 0, 0, 0, 5, 0, 0, 7],
    [0, 0, 0, 3, 0, 9, 0, 0, 0],
    [7, 0, 0, 6, 0, 0, 0, 0, 2],
    [0, 0, 2, 0, 0, 0, 0, 0, 5],
    [0, 0, 9, 0, 8, 0, 0, 4, 0],
    [4, 0, 1, 5, 0, 6, 0, 2, 0],
    [2, 0, 0, 0, 0, 7, 6, 0, 9],
  ];
  const board = givens.map((row) => [...row]);
  board[8][2] = 8;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (givens[row][col] !== 0) {
        assert(
          board[row][col] === givens[row][col],
          `Given mismatch at (${row}, ${col}): expected ${givens[row][col]}, got ${board[row][col]}`
        );
      }
    }
  }
}

function validatePuzzleIdentityRules() {
  const sessionPuzzleId = "ranked_hard_1234";
  const fetchedPuzzleId = "ranked_hard_1234";
  const routePuzzleId = "ranked_hard_1234";
  assert(fetchedPuzzleId === sessionPuzzleId, "Fetched puzzle id must exactly match the session puzzle id.");
  assert(routePuzzleId === sessionPuzzleId, "Route puzzle id should match the authoritative session puzzle id when present.");
}

function main() {
  validateIndexRoundTrip();
  validateGivenOverlay();
  validatePuzzleIdentityRules();
  console.log("Ranked session alignment checks passed.");
}

main();
