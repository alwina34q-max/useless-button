export const meta = { game: "Useless Button", minPlayers: 1, maxPlayers: 1 };

export function setup(players) {
  return { clicks: 0, player: players[0] ?? null };
}

export function validateAction(state, playerId, action) {
  if (state.player !== playerId) return { ok: false, error: "not your game" };
  if (action?.type !== "click") return { ok: false, error: "unknown action" };
  const count = action.count === undefined ? 1 : action.count;
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return { ok: false, error: "invalid click count" };
  }
  return { ok: true };
}

export function applyAction(state, _playerId, action) {
  const count = action.count === undefined ? 1 : action.count;
  return { ...state, clicks: state.clicks + count };
}

export function isGameOver() {
  return { over: false };
}

export function viewFor(state, playerId) {
  return {
    clicks: state.clicks,
    yourGame: state.player === playerId,
  };
}
