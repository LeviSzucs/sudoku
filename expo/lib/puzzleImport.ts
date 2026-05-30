/**
 * Puzzle import readiness.
 *
 * Expected CSV/JSON format for bulk puzzle imports:
 *
 * JSON format (array of objects):
 * [
 *   {
 *     "puzzle_id": "custom_001",
 *     "difficulty": "Medium",
 *     "givens": "000260701...",       // 81-char string, '0' = empty
 *     "solution": "435269781...",     // 81-char string, digits 1-9 only
 *     "rating_score": 3050,
 *     "source": "custom_collection"
 *   }
 * ]
 *
 * CSV format (header row required):
 * puzzle_id,difficulty,givens,solution,rating_score,source
 * custom_001,Medium,000260701...,435269781...,3050,custom_collection
 *
 * Rules:
 * - puzzle_id must be unique (upsert will update existing rows)
 * - difficulty must be one of: Easy, Medium, Hard, Expert, Master
 * - givens must be exactly 81 characters (digits 0-9)
 * - solution must be exactly 81 characters (digits 1-9 only)
 * - rating_score is optional (defaults to 1000)
 * - source is optional (defaults to 'import')
 *
 * Import workflow:
 * 1. Validate each puzzle with validatePuzzle()
 * 2. Filter out invalid puzzles (log to diagnostics)
 * 3. Upsert valid puzzles into public.puzzles table
 * 4. Inactive invalid puzzles rather than deleting
 */

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { validatePuzzle } from "@/lib/puzzleValidator";

export interface PuzzleImportRow {
  puzzle_id: string;
  difficulty: string;
  givens: string;
  solution: string;
  rating_score?: number;
  source?: string;
}

export interface PuzzleImportResult {
  total: number;
  valid: number;
  invalid: number;
  upserted: number;
  errors: { puzzle_id: string; errors: string[] }[];
}

/**
 * Validate an array of puzzle import rows, returning only valid ones.
 * Invalid rows are collected with their error messages.
 */
export function filterValidPuzzles(rows: PuzzleImportRow[]): {
  valid: PuzzleImportRow[];
  invalid: { puzzle_id: string; errors: string[] }[];
} {
  const valid: PuzzleImportRow[] = [];
  const invalid: { puzzle_id: string; errors: string[] }[] = [];

  for (const row of rows) {
    const result = validatePuzzle(row.givens, row.solution);
    if (result.valid) {
      valid.push({
        puzzle_id: row.puzzle_id,
        difficulty: row.difficulty,
        givens: row.givens,
        solution: row.solution,
        rating_score: row.rating_score ?? 1000,
        source: row.source ?? "import",
      });
    } else {
      invalid.push({ puzzle_id: row.puzzle_id, errors: result.errors });
    }
  }

  return { valid, invalid };
}

/**
 * Upsert validated puzzles into Supabase.
 * Returns the number successfully upserted and any errors.
 */
export async function bulkUpsertPuzzles(
  rows: PuzzleImportRow[]
): Promise<PuzzleImportResult> {
  const { valid, invalid } = filterValidPuzzles(rows);

  const result: PuzzleImportResult = {
    total: rows.length,
    valid: valid.length,
    invalid: invalid.length,
    upserted: 0,
    errors: invalid,
  };

  if (valid.length === 0 || !isSupabaseConfigured) return result;

  // Upsert in batches of 50 to avoid request size limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE).map((row) => ({
      puzzle_id: row.puzzle_id,
      difficulty: row.difficulty,
      givens: row.givens,
      solution: row.solution,
      rating_score: row.rating_score ?? 1000,
      source: row.source ?? "import",
      is_active: true,
    }));

    const { error } = await supabase
      .from("puzzles")
      .upsert(batch, { onConflict: "puzzle_id" });

    if (error) {
      result.errors.push({
        puzzle_id: `batch_${i}`,
        errors: [error.message],
      });
    } else {
      result.upserted += batch.length;
    }
  }

  return result;
}

/**
 * Parse a CSV string of puzzles into import rows.
 * Expected header: puzzle_id,difficulty,givens,solution,rating_score,source
 */
export function parsePuzzleCsv(csv: string): PuzzleImportRow[] {
  const lines = csv.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return []; // Need header + at least one row

  const header = lines[0].split(",");
  const dataLines = lines.slice(1);

  return dataLines.map((line, idx) => {
    const cols = line.split(",");
    return {
      puzzle_id: cols[header.indexOf("puzzle_id")] ?? `import_${idx}`,
      difficulty: cols[header.indexOf("difficulty")] ?? "Medium",
      givens: cols[header.indexOf("givens")] ?? "",
      solution: cols[header.indexOf("solution")] ?? "",
      rating_score: parseInt(cols[header.indexOf("rating_score")] ?? "1000", 10) || 1000,
      source: cols[header.indexOf("source")] ?? "csv_import",
    };
  });
}
