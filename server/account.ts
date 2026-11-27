import { randomBytes, randomUUID } from "node:crypto";
import { sql } from "./db.ts";

const SUBJECTS = ["국어", "수학", "영어", "탐구", "한국사"] as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_DAYS = 30;

type UserRow = {
  id: string;
  kakao_id: string | null;
  device_key: string | null;
  nickname: string;
  email: string;
  profile_image: string;
  school: string;
  department: string;
  intention: string;
  goal_seconds: number;
};

export function kakaoReady() {
  return (process.env.KAKAO_REST_API_KEY?.trim() ?? "") !== "";
}

export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === "GET" && path === "/api/auth/config") return json({ kakao: kakaoReady() });
  if (request.method === "GET" && path === "/api/auth/kakao") return startKakao(request);
  if (request.method === "GET" && path === "/api/auth/kakao/callback") return finishKakao(request);
  if (request.method === "POST" && path === "/api/auth/practice") return practice(request);
  if (request.method === "POST" && path === "/api/auth/logout") return logout(request);

  const user = await userFrom(request);
  if (!user) return json({ error: "로그인이 필요하다" }, 401);
  if (request.method === "GET" && path === "/api/me") return json(view(user));
  if (request.method === "PATCH" && path === "/api/me") return patchMe(request, user);
  if (request.method === "GET" && path === "/api/tasks") return listTasks(user);
  if (request.method === "POST" && path === "/api/tasks") return addTask(request, user);
  if (request.method === "PATCH" && path.startsWith("/api/tasks/")) return patchTask(request, user, path.slice("/api/tasks/".length));
  if (request.method === "GET" && path === "/api/logs") return listLogs(user);
  if (request.method === "POST" && path === "/api/logs") return addLog(request, user);
  if (request.method === "DELETE" && path === "/api/logs") return clearLogs(user);
  if (request.method === "GET" && path === "/api/curriculum") return listCurriculum(user);
  if (request.method === "PUT" && path === "/api/curriculum") return putCurriculum(request, user);
  if (request.method === "GET" && path === "/api/stones") return listStones(user);
  if (request.method === "POST" && path === "/api/stones") return addStoneDay(request, user);
  return json({ error: "없는 주소다" }, 404);
}

function view(user: UserRow) {
  return {
    id: user.id,
    nickname: user.nickname,
    school: user.school,
    department: user.department,
    intention: user.intention,
    goalSeconds: user.goal_seconds,
    kakao: user.kakao_id != null,
  };
}

function startKakao(request: Request) {
  const key = process.env.KAKAO_REST_API_KEY?.trim() ?? "";
  if (key === "") return json({ error: "카카오 키가 아직 없다" }, 404);
  const state = randomBytes(16).toString("hex");
  const redirect = callbackUrl(request);
  const auth = new URL("https://kauth.kakao.com/oauth/authorize");
  auth.searchParams.set("client_id", key);
  auth.searchParams.set("redirect_uri", redirect);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("state", state);
  return redirectTo(auth.toString(), [stateCookie(state, request)]);
}

async function finishKakao(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const saved = readCookie(request, "unmu_oauth");
  const clear = stateCookie("", request, 0);
  if (code === "" || state === "" || state !== saved) return redirectTo("/?auth=fail", [clear]);
  const key = process.env.KAKAO_REST_API_KEY?.trim() ?? "";
  if (key === "") return redirectTo("/?auth=fail", [clear]);
  const redirect = callbackUrl(request);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: key,
    redirect_uri: redirect,
    code,
  });
  const secret = process.env.KAKAO_CLIENT_SECRET?.trim() ?? "";
  if (secret !== "") body.set("client_secret", secret);
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) return redirectTo("/?auth=fail", [clear]);
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) return redirectTo("/?auth=fail", [clear]);
  const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!profileRes.ok) return redirectTo("/?auth=fail", [clear]);
  const profile = (await profileRes.json()) as {
    id?: number;
    kakao_account?: { email?: string; profile?: { nickname?: string; profile_image_url?: string } };
  };
  if (typeof profile.id !== "number") return redirectTo("/?auth=fail", [clear]);
  const account = profile.kakao_account;
  const rows = await sql<UserRow>(
    `insert into users (id, kakao_id, nickname, email, profile_image)
     values ($1, $2, $3, $4, $5)
     on conflict (kakao_id) do update set
       nickname = excluded.nickname,
       email = excluded.email,
       profile_image = excluded.profile_image,
       updated_at = now()
     returning *`,
    [
      randomUUID(),
      String(profile.id),
      clip(account?.profile?.nickname ?? "", 24) || "수험생",
      clip(account?.email ?? "", 120),
      clip(account?.profile?.profile_image_url ?? "", 300),
    ],
  );
  const session = await openSession(rows[0].id);
  return redirectTo("/", [clear, sessionCookie(session, request)]);
}

async function practice(request: Request) {
  const body = await readJson(request);
  const deviceKey = typeof body.deviceKey === "string" ? body.deviceKey.trim().toLowerCase() : "";
  if (!UUID.test(deviceKey)) return json({ error: "이 브라우저를 구분하지 못했다" }, 400);
  const rows = await sql<UserRow>(
    `insert into users (id, device_key, nickname)
     values ($1, $2, '연습')
     on conflict (device_key) do update set updated_at = now()
     returning *`,
    [randomUUID(), deviceKey],
  );
  const session = await openSession(rows[0].id);
  const headers = new Headers();
  headers.append("set-cookie", sessionCookie(session, request));
  return json(view(rows[0]), 200, headers);
}

async function logout(request: Request) {
  const token = readCookie(request, "unmu_session");
  if (token) await sql("delete from sessions where token = $1", [token]);
  const headers = new Headers();
  headers.append("set-cookie", sessionCookie("", request, 0));
  return json({ ok: true }, 200, headers);
}

async function patchMe(request: Request, user: UserRow) {
  const body = await readJson(request);
  const school = clip(typeof body.school === "string" ? body.school : user.school, 24);
  const department = clip(typeof body.department === "string" ? body.department : user.department, 16);
  const intention = clip(typeof body.intention === "string" ? body.intention : user.intention, 40);
  const hours = typeof body.goalHours === "number" && Number.isFinite(body.goalHours) ? body.goalHours : user.goal_seconds / 3600;
  const goal = Math.min(14, Math.max(1, Math.round(hours))) * 3600;
  const rows = await sql<UserRow>(
    `update users set school = $2, department = $3, intention = $4, goal_seconds = $5, updated_at = now()
     where id = $1 returning *`,
    [user.id, school, department, intention, goal],
  );
  return json(view(rows[0]));
}

async function listTasks(user: UserRow) {
  const rows = await sql<{ id: string; title: string; subject: string; done: boolean }>(
    "select id, title, subject, done from study_tasks where user_id = $1 order by done, position, created_at",
    [user.id],
  );
  return json({ tasks: rows });
}

async function addTask(request: Request, user: UserRow) {
  const body = await readJson(request);
  const title = clip(typeof body.title === "string" ? body.title : "", 40);
  const subject = subjectOf(body.subject);
  if (title === "") return json({ error: "할 일을 적어야 한다" }, 400);
  const count = await sql<{ n: number }>("select count(*)::int as n from study_tasks where user_id = $1", [user.id]);
  if (Number(count[0]?.n ?? 0) >= 30) return json({ error: "할 일은 서른 개까지다" }, 400);
  const position = await sql<{ n: number }>("select coalesce(max(position), 0)::int as n from study_tasks where user_id = $1", [user.id]);
  const rows = await sql<{ id: string; title: string; subject: string; done: boolean }>(
    `insert into study_tasks (id, user_id, title, subject, position)
     values ($1, $2, $3, $4, $5)
     returning id, title, subject, done`,
    [randomUUID(), user.id, title, subject, Number(position[0]?.n ?? 0) + 1],
  );
  return json(rows[0], 201);
}

async function patchTask(request: Request, user: UserRow, id: string) {
  if (!UUID.test(id)) return json({ error: "없는 할 일이다" }, 404);
  const body = await readJson(request);
  if (typeof body.done !== "boolean") return json({ error: "끝냈는지가 없다" }, 400);
  const rows = await sql<{ id: string; title: string; subject: string; done: boolean }>(
    `update study_tasks set done = $3 where id = $1 and user_id = $2 returning id, title, subject, done`,
    [id, user.id, body.done],
  );
  if (!rows[0]) return json({ error: "없는 할 일이다" }, 404);
  return json(rows[0]);
}

async function listLogs(user: UserRow) {
  const rows = await sql<{ client_key: string; subject: string; seconds: number; note: string; at: string | number }>(
    `select client_key, subject, seconds, note, (extract(epoch from logged_at) * 1000) as at
     from study_logs where user_id = $1 order by logged_at`,
    [user.id],
  );
  return json({
    logs: rows.map((row) => ({
      id: row.client_key,
      subject: row.subject,
      seconds: row.seconds,
      note: row.note,
      at: Number(row.at),
    })),
  });
}

async function addLog(request: Request, user: UserRow) {
  const body = await readJson(request);
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 80) : "";
  const subject = clip(typeof body.subject === "string" ? body.subject : "", 16) || "공부";
  const seconds = typeof body.seconds === "number" && Number.isFinite(body.seconds) ? Math.round(body.seconds) : 0;
  const note = clip(typeof body.note === "string" ? body.note : "", 500);
  const at = typeof body.at === "number" && Number.isFinite(body.at) ? body.at : Date.now();
  if (id === "" || seconds < 30 || seconds > 180 * 60) return json({ error: "남길 기록이 아니다" }, 400);
  await sql(
    `insert into study_logs (id, user_id, client_key, subject, seconds, note, logged_at)
     values ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))
     on conflict (user_id, client_key) do nothing`,
    [randomUUID(), user.id, id, subject, seconds, note, at],
  );
  return json({ ok: true });
}

async function clearLogs(user: UserRow) {
  await sql("delete from study_logs where user_id = $1", [user.id]);
  return json({ ok: true });
}

async function listCurriculum(user: UserRow) {
  const rows = await sql<{ subject: string; grasp: number }>("select subject, grasp from curriculum where user_id = $1", [user.id]);
  const grasp = Object.fromEntries(SUBJECTS.map((subject) => [subject, 0])) as Record<(typeof SUBJECTS)[number], number>;
  for (const row of rows) {
    if (SUBJECTS.includes(row.subject as (typeof SUBJECTS)[number])) grasp[row.subject as (typeof SUBJECTS)[number]] = row.grasp;
  }
  return json({ grasp });
}

async function putCurriculum(request: Request, user: UserRow) {
  const body = await readJson(request);
  const subject = typeof body.subject === "string" ? body.subject : "";
  const grasp = typeof body.grasp === "number" && Number.isFinite(body.grasp) ? Math.round(body.grasp) : -1;
  if (!SUBJECTS.includes(subject as (typeof SUBJECTS)[number]) || grasp < 0 || grasp > 3) {
    return json({ error: "과목과 이해도를 다시 고른다" }, 400);
  }
  await sql(
    `insert into curriculum (user_id, subject, grasp) values ($1, $2, $3)
     on conflict (user_id, subject) do update set grasp = excluded.grasp, updated_at = now()`,
    [user.id, subject, grasp],
  );
  return listCurriculum(user);
}

async function listStones(user: UserRow) {
  const rows = await sql<{ seoul_day: string }>("select seoul_day from cairn_days where user_id = $1 order by seoul_day", [user.id]);
  return json({ days: rows.map((row) => row.seoul_day) });
}

async function addStoneDay(request: Request, user: UserRow) {
  const body = await readJson(request);
  const day = typeof body.day === "string" ? body.day : "";
  if (!DAY.test(day)) return json({ error: "날짜가 아니다" }, 400);
  await sql("insert into cairn_days (user_id, seoul_day) values ($1, $2) on conflict do nothing", [user.id, day]);
  return listStones(user);
}

async function openSession(userId: string) {
  await sql("delete from sessions where user_id = $1", [userId]);
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await sql("insert into sessions (token, user_id, expires_at) values ($1, $2, $3)", [token, userId, expires]);
  return token;
}

async function userFrom(request: Request): Promise<UserRow | null> {
  const token = readCookie(request, "unmu_session");
  if (!token || token.length < 32) return null;
  const rows = await sql<UserRow>(
    `select users.* from sessions join users on users.id = sessions.user_id
     where sessions.token = $1 and sessions.expires_at > now()`,
    [token],
  );
  return rows[0] ?? null;
}

function callbackUrl(request: Request) {
  return `${publicOrigin(request)}/api/auth/kakao/callback`;
}

function publicOrigin(request: Request) {
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    const host = forwarded.split(",")[0]?.trim() ?? "";
    const proto = (request.headers.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim() || "https";
    if (host !== "" && host.length < 200 && !host.includes(" ")) return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

function sessionCookie(token: string, request: Request, maxAge = SESSION_DAYS * 24 * 60 * 60) {
  const secure = publicOrigin(request).startsWith("https://") ? "; Secure" : "";
  return `unmu_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function stateCookie(state: string, request: Request, maxAge = 600) {
  const secure = publicOrigin(request).startsWith("https://") ? "; Secure" : "";
  return `unmu_oauth=${state}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function redirectTo(location: string, cookies: string[]) {
  const headers = new Headers({ location, "cache-control": "no-store" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function json(data: unknown, status = 200, headers = new Headers()) {
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return {};
  const text = await request.text();
  if (text.length > 32_000) return {};
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  } catch {
    return {};
  }
}

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

function subjectOf(value: unknown) {
  return typeof value === "string" && SUBJECTS.includes(value as (typeof SUBJECTS)[number]) ? value : "국어";
}
