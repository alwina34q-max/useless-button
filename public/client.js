function playerId() {
  const key = "hf:game:playerId";
  let id = localStorage.getItem(key);
  if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem(key, id); }
  return id;
}
const myPlayerId = playerId();
const nameKey = "hf:game:username";
let username = localStorage.getItem(nameKey) || "";
const requestedRoom = new URLSearchParams(location.search).get("room");
// Each browser gets its own room by default, so a player is never accidentally
// placed in another player's single-player room. A ?room=... link still allows
// an explicit shared room when needed.
const room = requestedRoom || `player-${myPlayerId}`;
const PING = "__ping", PONG = "__pong";
let socket = null, retry = 0;
let displayedClicks = 0;
let queuedClicks = 0;
let flushTimer = null;
function setStatus(text, error = false) {
  const el = document.querySelector("#status");
  el.textContent = text; el.classList.toggle("error", error);
}
function send(msg) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg)); }
function connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${proto}//${location.host}/ws/${encodeURIComponent(room)}`);
  socket.addEventListener("open", () => { retry = 0; setStatus("Connected"); send({ type: "join", playerId: myPlayerId, username }); });
  socket.addEventListener("message", (event) => {
    if (event.data === PONG) return;
    try { const msg = JSON.parse(event.data); if (msg.type === "state") render(msg); else if (msg.type === "error") setStatus(msg.error, true); } catch {}
  });
  socket.addEventListener("close", () => { retry = Math.min(retry + 1, 6); const wait = 500 * 2 ** (retry - 1); setStatus(`Reconnecting in ${Math.round(wait / 1000)}s…`, true); setTimeout(connect, wait); });
}
setInterval(() => { if (socket?.readyState === WebSocket.OPEN) socket.send(PING); }, 30000);

const button = document.querySelector("#useless-button");

function phoneVibrate() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(12);
}
button.addEventListener("pointerdown", () => button.classList.add("touching"));
button.addEventListener("pointerup", () => button.classList.remove("touching"));
button.addEventListener("pointercancel", () => button.classList.remove("touching"));
const count = document.querySelector("#count");
const message = document.querySelector("#message");
const meta = document.querySelector("#meta");
const leaderboard = document.querySelector("#leaderboard");

function render(msg) {
  const { status, view, meta: gameMeta, connected } = msg;
  meta.textContent = `${gameMeta.game} · ${connected} connected · room “${room}”`;
  const serverClicks = view?.clicks ?? 0;
  // Keep the counter responsive while the server catches up. A server reset
  // to zero is authoritative; otherwise never move the local display backwards.
  displayedClicks = serverClicks === 0 ? 0 : Math.max(displayedClicks, serverClicks);
  count.textContent = displayedClicks;
  const clicks = displayedClicks;
  button.disabled = status !== "playing" || !view?.yourGame;
  message.textContent = clicks === 0
    ? "Press the button. There is no reason."
    : `${clicks} clicks. You can stop whenever you want. (You won't.)`;
  setStatus("Clicking is your only mission. Keep going forever.");
  button.textContent = "THE BUTTON";
}

async function loadLeaderboard() {
  try {
    const res = await fetch("/leaderboard", { cache: "no-store" });
    const rows = await res.json();
    leaderboard.innerHTML = rows.length
      ? rows.map((row, i) => `<div class="rank"><span>#${i + 1}</span><b>${escapeHtml(row.username || row.playerId.slice(0, 8))}</b><strong>${Number(row.clicks).toLocaleString()}</strong></div>`).join("")
      : '<div class="empty">No legends yet. Be the first.</div>';
  } catch { leaderboard.innerHTML = '<div class="empty">Leaderboard taking a nap.</div>'; }
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function flushClicks() {
  flushTimer = null;
  if (queuedClicks <= 0) return;
  const batch = Math.min(queuedClicks, 100);
  queuedClicks -= batch;
  send({ type: "action", action: { type: "click", count: batch } });
  if (queuedClicks > 0) scheduleFlush();
}
function scheduleFlush() {
  if (flushTimer === null) flushTimer = setTimeout(flushClicks, 35);
}
function registerClick() {
  if (button.disabled) return;
  displayedClicks += 1;
  count.textContent = displayedClicks;
  message.textContent = `${displayedClicks} clicks. You can stop whenever you want. (You won't.)`;
  queuedClicks += 1;
  scheduleFlush();
}
button.addEventListener("pointerdown", (event) => {
  phoneVibrate();
  if (event.pointerType !== "mouse" || event.button === 0) {
    event.preventDefault();
    registerClick();
  }
});
button.addEventListener("click", (event) => {
  // Mouse clicks that weren't already handled by pointerdown.
  if (event.detail === 0) registerClick();
});
document.querySelector("#reset").addEventListener("click", () => send({ type: "reset" }));
const modal = document.querySelector("#name-modal");
const nameForm = document.querySelector("#name-form");
const nameInput = document.querySelector("#username-input");
if (username) modal.style.display = "none"; else setTimeout(() => nameInput.focus(), 100);
nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = nameInput.value.trim().replace(/[^a-zA-Z0-9 _.-]/g, "").slice(0, 20);
  if (!value) return;
  username = value; localStorage.setItem(nameKey, username);
  modal.style.display = "none";
  if (socket?.readyState === WebSocket.OPEN) send({ type: "join", playerId: myPlayerId, username });
});
connect();
loadLeaderboard();
setInterval(loadLeaderboard, 5000);
