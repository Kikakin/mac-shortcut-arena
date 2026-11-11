CREATE TABLE IF NOT EXISTS challenges (
 id TEXT PRIMARY KEY,
 player_id TEXT NOT NULL,
 nickname TEXT NOT NULL,
 question_ids TEXT NOT NULL,
 started_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_challenges_expiry ON challenges(expires_at);
CREATE TABLE IF NOT EXISTS scores (
 challenge_id TEXT PRIMARY KEY,
 player_id TEXT NOT NULL,
 nickname TEXT NOT NULL,
 correct INTEGER NOT NULL CHECK(correct BETWEEN 0 AND 10),
 duration_ms INTEGER NOT NULL CHECK(duration_ms BETWEEN 0 AND 60000),
 completed_at INTEGER NOT NULL,
 FOREIGN KEY(challenge_id) REFERENCES challenges(id)
);
CREATE INDEX IF NOT EXISTS idx_scores_rank ON scores(correct DESC, duration_ms ASC, completed_at ASC);
CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id, correct DESC, duration_ms ASC);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
