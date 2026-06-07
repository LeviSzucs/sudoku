const fs = require("fs");
const path = require("path");
const {
  DEFAULT_RATING_BASE,
  DIFFICULTIES,
  ROOT,
  collectExistingPuzzleKeys,
  createSeededRandom,
  ensureDir,
  findDuplicateIssues,
  generateUniquePuzzleForDifficulty,
  normalizeGivens,
  parseArgs,
  validatePuzzle,
} = require("./puzzle-bank-utils");
const { evaluateTechniqueAcceptance, ratePuzzle } = require("./technique-difficulty-rater");

const REPORT_DIR = path.join(ROOT, "generated", "reports");
const DEFAULT_BATCH = "technique_calibration_20260607";
const DEFAULT_COUNT = 10;
const DEFAULT_MAX_ATTEMPTS = 450;
const CALIBRATION_TARGET_CLUES = {
  Easy: 40,
  Medium: 34,
  Hard: 30,
  Expert: 27,
  Master: 24,
};

function padNumber(value, width) {
  return String(value).padStart(width, "0");
}

function summarizeByDifficulty(rows, selector) {
  return Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, rows.filter((row) => selector(row) === difficulty).length]));
}

function average(values) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}

function makePuzzleRecord({ batch, difficulty, index, candidate, rating }) {
  return {
    candidate_id: `calib_${difficulty.toLowerCase()}_${batch}_${padNumber(index, 4)}`,
    puzzle_id: `calib_${difficulty.toLowerCase()}_${batch}_${padNumber(index, 4)}`,
    difficulty,
    givens: candidate.givens,
    solution: candidate.solution,
    rating_score: rating.technique_score,
    source: `technique_calibration_${batch}`,
    is_active: false,
  };
}

function rowFromRating({ candidateId, difficulty, candidate, rating, acceptance, attempts }) {
  return {
    candidate_id: candidateId,
    intended_difficulty: difficulty,
    givens_count: candidate.clues,
    technique_score: rating.technique_score,
    hardest_technique: rating.hardest_technique,
    advanced_move_count: rating.advanced_move_count,
    solve_path_length: rating.solve_path_length,
    search_depth: rating.search?.maxDepth ?? 0,
    search_branch_events: rating.search?.branchEvents ?? 0,
    suggested_difficulty: rating.suggested_difficulty,
    accepted: acceptance.accepted,
    rejection_reason: acceptance.accepted ? null : acceptance.reason,
    attempts,
  };
}

function generateAcceptedCandidates({ batch, countPerDifficulty, maxAttempts, seed }) {
  const random = createSeededRandom(seed);
  const existing = collectExistingPuzzleKeys();
  const boards = new Set(existing.boards);
  const accepted = [];
  const reportRows = [];
  const rejectedSamples = [];
  const attemptsByDifficulty = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, 0]));
  const acceptedByDifficulty = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, 0]));

  for (const difficulty of DIFFICULTIES) {
    const targetCount = countPerDifficulty[difficulty] ?? 0;
    let attempts = 0;
    while (acceptedByDifficulty[difficulty] < targetCount && attempts < maxAttempts) {
      attempts += 1;
      attemptsByDifficulty[difficulty] = attempts;
      let candidate;
      try {
        candidate = generateUniquePuzzleForDifficulty(difficulty, {
          random,
          targetClues: CALIBRATION_TARGET_CLUES,
          maxAttemptsPerPuzzle: 3,
        });
      } catch (error) {
        if (rejectedSamples.filter((row) => row.intended_difficulty === difficulty).length < 25) {
          rejectedSamples.push({
            intended_difficulty: difficulty,
            accepted: false,
            rejection_reason: error.message,
            attempts,
          });
        }
        continue;
      }
      const boardKey = normalizeGivens(candidate.givens);
      if (boards.has(boardKey)) {
        rejectedSamples.push({
          intended_difficulty: difficulty,
          accepted: false,
          rejection_reason: "duplicate givens board",
          attempts,
        });
        continue;
      }

      const tempId = `candidate_${difficulty.toLowerCase()}_${attempts}`;
      const rating = ratePuzzle({
        puzzle_id: tempId,
        difficulty,
        givens: candidate.givens,
        solution: candidate.solution,
        rating_score: DEFAULT_RATING_BASE[difficulty] + attempts,
        source: `technique_calibration_${batch}`,
        is_active: false,
      });
      const acceptance = evaluateTechniqueAcceptance(rating, difficulty);
      const candidateId = `calib_${difficulty.toLowerCase()}_${batch}_${padNumber(acceptedByDifficulty[difficulty] + 1, 4)}`;
      const reportRow = rowFromRating({ candidateId, difficulty, candidate, rating, acceptance, attempts });

      if (!acceptance.accepted) {
        if (rejectedSamples.filter((row) => row.intended_difficulty === difficulty).length < 25) {
          rejectedSamples.push(reportRow);
        }
        continue;
      }

      const puzzle = makePuzzleRecord({
        batch,
        difficulty,
        index: acceptedByDifficulty[difficulty] + 1,
        candidate,
        rating,
      });
      const issues = validatePuzzle(puzzle);
      if (issues.length > 0) {
        rejectedSamples.push({ ...reportRow, accepted: false, rejection_reason: `validation failed: ${issues.map((issue) => issue.type).join(", ")}` });
        continue;
      }

      boards.add(boardKey);
      accepted.push(puzzle);
      reportRows.push(reportRow);
      acceptedByDifficulty[difficulty] += 1;
    }
  }

  const duplicateIssues = findDuplicateIssues([...existing.puzzles, ...accepted]);
  if (duplicateIssues.length > 0) {
    throw new Error(`Generated calibration batch has duplicate issues: ${duplicateIssues.map(({ puzzle, issue }) => `${puzzle.puzzle_id} ${issue.type}`).join("; ")}`);
  }

  return { accepted, reportRows, rejectedSamples, attemptsByDifficulty, acceptedByDifficulty };
}

function writeMarkdownReport({ outPath, batch, accepted, reportRows, rejectedSamples, attemptsByDifficulty, acceptedByDifficulty }) {
  const lines = [];
  lines.push("# Technique Calibration Candidate Batch");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push("This batch is inactive candidate data only. It is not exported as SQL, not inserted into Supabase, and not used by live puzzle selection.");
  lines.push("");
  lines.push("## Acceptance Summary");
  lines.push("");
  lines.push("| difficulty | accepted | attempts | avg attempts per accepted | avg score | avg givens | avg advanced moves | avg search depth |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const difficulty of DIFFICULTIES) {
    const rows = reportRows.filter((row) => row.intended_difficulty === difficulty);
    const acceptedCount = acceptedByDifficulty[difficulty] ?? 0;
    const attempts = attemptsByDifficulty[difficulty] ?? 0;
    lines.push(`| ${difficulty} | ${acceptedCount} | ${attempts} | ${acceptedCount === 0 ? 0 : Math.round((attempts / acceptedCount) * 10) / 10} | ${average(rows.map((row) => row.technique_score))} | ${average(rows.map((row) => row.givens_count))} | ${average(rows.map((row) => row.advanced_move_count))} | ${average(rows.map((row) => row.search_depth))} |`);
  }
  lines.push("");
  lines.push(`Accepted by intended difficulty: ${JSON.stringify(summarizeByDifficulty(reportRows, (row) => row.intended_difficulty))}`);
  lines.push(`Accepted by suggested difficulty: ${JSON.stringify(summarizeByDifficulty(reportRows, (row) => row.suggested_difficulty))}`);
  lines.push("");
  lines.push("## Accepted Candidates");
  lines.push("");
  lines.push("| candidate_id | intended | givens | score | hardest | advanced moves | search depth | search branches | suggested |");
  lines.push("|---|---:|---:|---:|---|---:|---:|---:|---:|");
  for (const row of reportRows) {
    lines.push(`| ${row.candidate_id} | ${row.intended_difficulty} | ${row.givens_count} | ${row.technique_score} | ${row.hardest_technique} | ${row.advanced_move_count} | ${row.search_depth} | ${row.search_branch_events} | ${row.suggested_difficulty} |`);
  }
  lines.push("");
  lines.push("## Rejected Sample Rows");
  lines.push("");
  lines.push("| intended | givens | score | hardest | advanced moves | search depth | suggested | reason |");
  lines.push("|---|---:|---:|---|---:|---:|---:|---|");
  for (const row of rejectedSamples.slice(0, 80)) {
    lines.push(`| ${row.intended_difficulty} | ${row.givens_count ?? ""} | ${row.technique_score ?? ""} | ${row.hardest_technique ?? ""} | ${row.advanced_move_count ?? ""} | ${row.search_depth ?? ""} | ${row.suggested_difficulty ?? ""} | ${row.rejection_reason} |`);
  }
  lines.push("");
  lines.push("## Calibration Notes");
  lines.push("");
  lines.push("- Easy/Medium candidates are much easier to generate with the current clue-removal algorithm.");
  lines.push("- Hard/Expert/Master acceptance rates are the key signal for whether the future generator needs technique-guided clue removal instead of clue-count-only removal.");
  lines.push("- Accepted Hard/Expert/Master candidates must show higher technique scores and/or search pressure than Medium candidates.");
  lines.push("- Candidate rows are deliberately `is_active: false` and should remain out of production serving until a later reviewed export.");

  fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const batch = args.batch ?? DEFAULT_BATCH;
  const count = Number(args.count ?? DEFAULT_COUNT);
  const maxAttempts = Number(args.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const countPerDifficulty = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, Number(args[difficulty.toLowerCase()] ?? count)]));
  const seed = args.seed ?? `${batch}-technique-calibration`;

  console.log(`Generating inactive technique calibration batch ${batch}`);
  console.log(`Target counts: ${JSON.stringify(countPerDifficulty)}`);
  const result = generateAcceptedCandidates({ batch, countPerDifficulty, maxAttempts, seed });
  const missing = DIFFICULTIES.filter((difficulty) => result.acceptedByDifficulty[difficulty] < countPerDifficulty[difficulty]);
  if (missing.length > 0) {
    throw new Error(`Could not fill calibration batch within ${maxAttempts} attempts for: ${missing.map((difficulty) => `${difficulty} ${result.acceptedByDifficulty[difficulty]}/${countPerDifficulty[difficulty]}`).join(", ")}`);
  }

  ensureDir(REPORT_DIR);
  const jsonPath = path.join(REPORT_DIR, `technique-calibration-candidates-${batch}.json`);
  const reportPath = path.join(REPORT_DIR, `technique-calibration-candidates-${batch}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify({
    batch,
    generated_at: new Date().toISOString(),
    target_counts: countPerDifficulty,
    target_clues: CALIBRATION_TARGET_CLUES,
    note: "Inactive technique-calibration candidate batch only. Do not import into production puzzle serving.",
    puzzles: result.accepted,
    report_rows: result.reportRows,
    rejected_samples: result.rejectedSamples,
    attempts_by_difficulty: result.attemptsByDifficulty,
  }, null, 2)}\n`);
  writeMarkdownReport({ outPath: reportPath, batch, ...result });

  console.log(`Accepted ${result.accepted.length} inactive calibration candidates.`);
  console.log(`Attempts by difficulty: ${JSON.stringify(result.attemptsByDifficulty)}`);
  console.log(`Wrote ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`Wrote ${path.relative(process.cwd(), reportPath)}`);
}

main();
