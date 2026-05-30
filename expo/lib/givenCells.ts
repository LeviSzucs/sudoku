export type GivenCellValue = string | number | null | undefined;

export function isGivenCell(value: GivenCellValue): boolean {
  return (
    value === "1" ||
    value === "2" ||
    value === "3" ||
    value === "4" ||
    value === "5" ||
    value === "6" ||
    value === "7" ||
    value === "8" ||
    value === "9" ||
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6 ||
    value === 7 ||
    value === 8 ||
    value === 9
  );
}

export function isEmptyGiven(value: GivenCellValue): boolean {
  return value === "0" || value === "." || value === "" || value === 0 || value == null;
}

export function givenCellToBoardValue(value: GivenCellValue): number {
  if (isGivenCell(value)) return typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return 0;
}

export function isEditableGivenCell(value: GivenCellValue): boolean {
  return isEmptyGiven(value);
}
