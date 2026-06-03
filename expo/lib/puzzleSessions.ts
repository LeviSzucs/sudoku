import { logDevDiagnostic } from "@/lib/performanceDiagnostics";
import { supabase, type PuzzleSessionRow } from "@/lib/supabase";
import type { Board, NotesBoard } from "@/lib/sudoku";
import type { Difficulty } from "@/constants/mockData";

type PuzzleSessionMode = "daily" | "classic" | "daily_duel" | "duel" | "friend_challenge" | "ranked";

export interface StartPuzzleSessionInput {
  userId: string;
  puzzleId: string;
  mode: PuzzleSessionMode;
  difficulty: Difficulty;
  initialBoardState: Board;
  initialNotesState: NotesBoard;
}

export async function startPuzzleSession(input: StartPuzzleSessionInput): Promise<PuzzleSessionRow> {
  logDevDiagnostic("puzzle session create attempt", {
    authUserId: input.userId,
    selectedPuzzleId: input.puzzleId,
    mode: input.mode,
    difficulty: input.difficulty,
    sessionCreateAttempted: true,
  });

  const { data, error } = await supabase
    .from("puzzle_sessions")
    .insert({
      user_id: input.userId,
      puzzle_id: input.puzzleId,
      mode: input.mode,
      difficulty: input.difficulty,
      board_state: input.initialBoardState as unknown as Record<string, unknown>,
      notes_state: input.initialNotesState as unknown as Record<string, unknown>,
      elapsed_seconds: 0,
      mistakes: 0,
      hints_used: 0,
      undo_count: 0,
      move_history: [],
      status: "in_progress",
    })
    .select("*")
    .single();

  if (error) {
    logDevDiagnostic("puzzle session create result", {
      authUserId: input.userId,
      selectedPuzzleId: input.puzzleId,
      mode: input.mode,
      difficulty: input.difficulty,
      sessionCreateSuccess: false,
      supabaseError: error.message,
    });
    throw new Error(error.message);
  }

  if (!data?.session_id) {
    const message = "Puzzle session create failed: Supabase did not return a session_id.";
    logDevDiagnostic("puzzle session create result", {
      authUserId: input.userId,
      selectedPuzzleId: input.puzzleId,
      mode: input.mode,
      difficulty: input.difficulty,
      sessionCreateSuccess: false,
      supabaseError: message,
    });
    throw new Error(message);
  }

  const row = data as PuzzleSessionRow;
  logDevDiagnostic("puzzle session create result", {
    authUserId: input.userId,
    selectedPuzzleId: input.puzzleId,
    mode: input.mode,
    difficulty: input.difficulty,
    sessionCreateSuccess: true,
    returnedSessionId: row.session_id,
    returnedStatus: row.status,
  });

  return row;
}
