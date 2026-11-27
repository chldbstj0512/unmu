import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";
import { handle } from "./account.ts";

export function apiPlugin(): Plugin {
  const attach = (middlewares: Connect.Server) => {
    middlewares.use(async (req, res, next) => {
      const path = req.url?.split("?")[0] ?? "";
      if (!path.startsWith("/api")) {
        next();
        return;
      }
      try {
        const response = await handle(await nodeToRequest(req));
        await writeNode(res, response);
      } catch (error) {
        console.error(error instanceof Error ? error.name : "api");
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: "서버가 요청을 마치지 못했다" }));
        }
      }
    });
  };
  return {
    name: "unmu-api",
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}

async function nodeToRequest(req: IncomingMessage) {
  const host = req.headers.host ?? "127.0.0.1";
  const forwarded = req.headers["x-forwarded-proto"];
  const proto = typeof forwarded === "string" && forwarded !== "" ? forwarded.split(",")[0].trim() : "http";
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const method = req.method ?? "GET";
  if (method === "GET" || method === "HEAD") return new Request(`${proto}://${host}${req.url ?? "/"}`, { method, headers });
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > 32_000) break;
    chunks.push(buf);
  }
  return new Request(`${proto}://${host}${req.url ?? "/"}`, { method, headers, body: Buffer.concat(chunks) });
}

async function writeNode(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (cookies.length > 0) res.setHeader("set-cookie", cookies);
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie") res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}
