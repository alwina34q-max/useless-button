import type { Env } from "./env";
import { Room } from "./room";

export { Room };

const WS_PREFIX = "/ws";
const DEFAULT_ROOM = "main";
const ROOM_RE = /^[A-Za-z0-9_-]{1,64}$/;

import { getLeaderboard } from "./leaderboard";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/leaderboard" && request.method === "GET") {
      try { return Response.json(await getLeaderboard(env), { headers: { "Cache-Control": "no-store" } }); }
      catch { return Response.json({ error: "leaderboard unavailable" }, { status: 503 }); }
    }

    if (url.pathname === WS_PREFIX || url.pathname.startsWith(WS_PREFIX + "/")) {
      if (request.headers.get("Upgrade") !== "websocket") return new Response("expected a websocket upgrade", { status: 426 });
      const raw = url.pathname.slice(WS_PREFIX.length).replace(/^\/+/, "");
      const room = raw === "" ? DEFAULT_ROOM : raw;
      if (!ROOM_RE.test(room)) return new Response("invalid room name", { status: 400 });
      const id = env.ROOMS.idFromName(room);
      return env.ROOMS.get(id).fetch(request);
    }

    if (request.method === "GET" && request.headers.get("Accept")?.includes("text/html")) {
      return env.ASSETS.fetch(new Request(new URL("/", url), request));
    }
    return new Response("not found", { status: 404 });
  },
};

