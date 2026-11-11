export type ScoreRow = { challenge_id: string; player_id: string; nickname: string; correct: number; duration_ms: number; completed_at: number };
export function compareScores(a: ScoreRow, b: ScoreRow): number {
  return b.correct - a.correct || a.duration_ms - b.duration_ms || a.completed_at - b.completed_at || a.challenge_id.localeCompare(b.challenge_id);
}
export function bestPerPlayer(rows: ScoreRow[]): ScoreRow[] {
  const seen = new Set<string>();
  return [...rows].sort(compareScores).filter(row => !seen.has(row.player_id) && !!seen.add(row.player_id));
}
