import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { handle } from "./account.ts";
import { sql } from "./db.ts";

function cookieOf(response: Response) {
  const set = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  return set;
}

async function signIn(deviceKey: string) {
  const response = await handle(
    new Request("http://127.0.0.1/api/auth/practice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceKey }),
    }),
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as { id: string; nickname: string };
  return { cookie: cookieOf(response), id: body.id, nickname: body.nickname };
}

function authed(path: string, cookie: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("cookie", cookie);
  return handle(new Request(`http://127.0.0.1${path}`, { ...init, headers }));
}

test("practice login is one account per browser and hides the other desk", async () => {
  const config = await handle(new Request("http://127.0.0.1/api/auth/config"));
  assert.equal(((await config.json()) as { kakao: boolean }).kakao, (process.env.KAKAO_REST_API_KEY?.trim() ?? "") !== "");

  const denied = await handle(new Request("http://127.0.0.1/api/me"));
  assert.equal(denied.status, 401);

  const device = randomUUID();
  const first = await signIn(device);
  const again = await signIn(device);
  assert.equal(again.id, first.id);

  const other = await signIn(randomUUID());
  assert.notEqual(other.id, first.id);

  const created = await authed("/api/tasks", again.cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "수학 20문제", subject: "수학" }),
  });
  assert.equal(created.status, 201);
  const task = (await created.json()) as { id: string };

  const mine = await authed("/api/tasks", again.cookie);
  assert.equal(((await mine.json()) as { tasks: { title: string }[] }).tasks.some((item) => item.title === "수학 20문제"), true);
  const theirs = await authed("/api/tasks", other.cookie);
  assert.equal(((await theirs.json()) as { tasks: unknown[] }).tasks.length, 0);

  const stolen = await authed(`/api/tasks/${task.id}`, other.cookie, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ done: true }),
  });
  assert.equal(stolen.status, 404);
});

test("study logs dedupe and stones stay on the account", async () => {
  const person = await signIn(randomUUID());
  const log = {
    id: `log-${randomUUID()}`,
    subject: "국어",
    seconds: 1500,
    note: "비문학",
    at: Date.now(),
  };
  const post = () =>
    authed("/api/logs", person.cookie, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(log),
    });
  assert.equal((await post()).status, 200);
  assert.equal((await post()).status, 200);
  const listed = await authed("/api/logs", person.cookie);
  const logs = ((await listed.json()) as { logs: { id: string }[] }).logs.filter((item) => item.id === log.id);
  assert.equal(logs.length, 1);

  const stone = await authed("/api/stones", person.cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ day: "2026-11-28" }),
  });
  assert.deepEqual(((await stone.json()) as { days: string[] }).days, ["2026-11-28"]);

  const grasp = await authed("/api/curriculum", person.cookie, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subject: "영어", grasp: 2 }),
  });
  assert.equal(((await grasp.json()) as { grasp: { 영어: number } }).grasp.영어, 2);
});

test("the mobile tables exist", async () => {
  const rows = await sql<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'`,
  );
  const names = new Set(rows.map((row) => row.table_name));
  for (const name of ["users", "sessions", "study_tasks", "study_logs", "curriculum", "exam_papers", "exam_codes", "exam_attempts", "desk_guests", "cairn_days"]) {
    assert.equal(names.has(name), true, name);
  }
});
