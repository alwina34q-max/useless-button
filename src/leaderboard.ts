import type { Env } from "./env";

async function ensureTable(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS leaderboard (
    player_id TEXT PRIMARY KEY,
    username TEXT NOT NULL DEFAULT 'Anonymous',
    clicks INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`).run();
  try { await env.DB.prepare(`ALTER TABLE leaderboard ADD COLUMN username TEXT NOT NULL DEFAULT 'Anonymous'`).run(); } catch {}
}

export async function getLeaderboard(env: Env): Promise<Array<{ playerId: string; username: string; clicks: number }>> {
  await ensureTable(env);
  const result = await env.DB.prepare(
    "SELECT player_id AS playerId, username, clicks FROM leaderboard ORDER BY clicks DESC, updated_at ASC LIMIT 10",
  ).all<{ playerId: string; username: string; clicks: number }>();
  return result.results ?? [];
}

export async function updateLeaderboard(env: Env, playerId: string, username: string, clicks: number): Promise<void> {
  await ensureTable(env);
  await env.DB.prepare(
    `INSERT INTO leaderboard (player_id, username, clicks, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(player_id) DO UPDATE SET
       username = excluded.username,
       clicks = CASE WHEN excluded.clicks > leaderboard.clicks THEN excluded.clicks ELSE leaderboard.clicks END,
       updated_at = CASE WHEN excluded.clicks > leaderboard.clicks THEN excluded.updated_at ELSE leaderboard.updated_at END`,
  ).bind(playerId, username, clicks, Date.now()).run();
}
