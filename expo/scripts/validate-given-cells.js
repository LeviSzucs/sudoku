const fixed = ["1", "2", "3", "4", "5", "6", "7", "8", "9", 1, 2, 3, 4, 5, 6, 7, 8, 9];
const editable = ["0", ".", "", null, undefined, 0];

function isGivenCell(value) {
  return fixed.includes(value);
}

function isEmptyGiven(value) {
  return value === "0" || value === "." || value === "" || value === 0 || value == null;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const value of fixed) {
  assert(isGivenCell(value), `${String(value)} should be fixed/given`);
  assert(!isEmptyGiven(value), `${String(value)} should not be editable`);
}

for (const value of editable) {
  assert(!isGivenCell(value), `${String(value)} should not be fixed/given`);
  assert(isEmptyGiven(value), `${String(value)} should be editable`);
}

console.log("Given-cell helper checks passed.");
