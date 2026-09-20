/**
 * ÁbacoPhy Durable Object — persistencia aislada por tenant.
 * Variables: ABACOPHY_DO_TOKEN (opcional, Bearer)
 *
 * Rutas:
 *   PUT  /tenant/:id   body JSON snapshot
 *   GET  /tenant/:id
 *   GET  /health
 */
export class AbacoPhyStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const token = this.env.ABACOPHY_DO_TOKEN;
    if (token) {
      const auth = request.headers.get("Authorization") || "";
      if (auth !== "Bearer " + token) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
      }
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "health") {
      return Response.json({ ok: true, app: "AbacoPhy-DO" });
    }
    if (parts[0] === "tenant" && parts[1]) {
      const key = "tenant:" + parts[1];
      if (request.method === "PUT") {
        const body = await request.text();
        await this.state.storage.put(key, body);
        return Response.json({ ok: true, key });
      }
      if (request.method === "GET") {
        const body = await this.state.storage.get(key);
        if (!body) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
        return new Response(body, { headers: { "Content-Type": "application/json" } });
      }
    }
    return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id") || "global";
    const id = env.ABACOPHY_STORE.idFromName(idParam);
    const stub = env.ABACOPHY_STORE.get(id);
    return stub.fetch(request);
  },
};
