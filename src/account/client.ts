import { useSyncExternalStore } from "react";
import type { Session } from "../study/logic.ts";
import { getState, hydrateAccount, leaveAccount } from "../study/store.ts";

export type AccountUser = {
  id: string;
  nickname: string;
  school: string;
  department: string;
  intention: string;
  goalSeconds: number;
  kakao: boolean;
};

export type TaskItem = { id: string; title: string; subject: string; done: boolean };

const SUBJECTS = ["국어", "수학", "영어", "탐구", "한국사"] as const;
export type Grasp = Record<(typeof SUBJECTS)[number], number>;

type AccountSnap = {
  ready: boolean;
  kakao: boolean;
  user: AccountUser | null;
  tasks: TaskItem[];
  grasp: Grasp;
  error: string;
};

const emptyGrasp = () => Object.fromEntries(SUBJECTS.map((subject) => [subject, 0])) as Grasp;

let snap: AccountSnap = { ready: false, kakao: false, user: null, tasks: [], grasp: emptyGrasp(), error: "" };
const listeners = new Set<() => void>();
let boot: Promise<void> | null = null;

function emit(next: AccountSnap) {
  snap = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccount() {
  return useSyncExternalStore(subscribe, () => snap, () => snap);
}

export function ensureAccount() {
  boot ??= refresh();
  return boot;
}

async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { response, data };
}

export async function refresh() {
  const config = await request("/api/auth/config");
  const kakao = config.data.kakao === true;
  const me = await request("/api/me");
  if (!me.response.ok) {
    emit({ ...snap, ready: true, kakao, user: null, tasks: [], grasp: emptyGrasp(), error: "" });
    return;
  }
  let user = me.data as AccountUser;
  const local = getState();
  if (user.school === "" && user.department === "" && user.intention === "" && (local.school || local.department || local.intention)) {
    const patched = await request("/api/me", {
      method: "PATCH",
      body: JSON.stringify({
        school: local.school,
        department: local.department,
        intention: local.intention,
        goalHours: local.goalSeconds / 3600,
      }),
    });
    if (patched.response.ok) user = patched.data as AccountUser;
  }
  const [tasks, logs, stones, curriculum] = await Promise.all([
    request("/api/tasks"),
    request("/api/logs"),
    request("/api/stones"),
    request("/api/curriculum"),
  ]);
  const serverLogs = Array.isArray(logs.data.logs) ? (logs.data.logs as Session[]) : [];
  const known = new Set(serverLogs.map((item) => item.id));
  let merged = serverLogs;
  const missing = getState().sessions.filter((session) => !known.has(session.id));
  if (missing.length > 0) {
    for (const session of missing) {
      await request("/api/logs", { method: "POST", body: JSON.stringify(session) });
    }
    const again = await request("/api/logs");
    merged = Array.isArray(again.data.logs) ? (again.data.logs as Session[]) : serverLogs;
  }
  const days = Array.isArray(stones.data.days) ? (stones.data.days as string[]) : [];
  hydrateAccount({
    school: user.school,
    department: user.department,
    intention: user.intention,
    goalSeconds: user.goalSeconds,
    sessions: merged,
    stones: [...new Set([...getState().stones, ...days])].sort(),
  });
  for (const day of getState().stones) {
    if (!days.includes(day)) await request("/api/stones", { method: "POST", body: JSON.stringify({ day }) });
  }
  const grasp = { ...emptyGrasp(), ...(curriculum.data.grasp as Partial<Grasp> | undefined) };
  emit({
    ready: true,
    kakao,
    user,
    tasks: Array.isArray(tasks.data.tasks) ? (tasks.data.tasks as TaskItem[]) : [],
    grasp,
    error: "",
  });
}

export async function practiceLogin() {
  const key = deviceKey();
  const result = await request("/api/auth/practice", { method: "POST", body: JSON.stringify({ deviceKey: key }) });
  if (!result.response.ok) {
    emit({ ...snap, ready: true, error: "연습 입장이 열리지 않았다" });
    return;
  }
  boot = refresh();
  await boot;
}

export async function logout() {
  await request("/api/auth/logout", { method: "POST" });
  emit({ ...snap, user: null, tasks: [], grasp: emptyGrasp(), error: "" });
  leaveAccount();
}

export async function saveProfile(input: { school: string; department: string; intention: string; goalHours: number }) {
  if (!snap.user) return;
  const result = await request("/api/me", { method: "PATCH", body: JSON.stringify(input) });
  if (!result.response.ok) return;
  emit({ ...snap, user: result.data as AccountUser });
}

export async function addTask(title: string, subject: string) {
  const result = await request("/api/tasks", { method: "POST", body: JSON.stringify({ title, subject }) });
  if (!result.response.ok) {
    emit({ ...snap, error: typeof result.data.error === "string" ? result.data.error : "할 일을 넣지 못했다" });
    return;
  }
  emit({ ...snap, tasks: [...snap.tasks, result.data as TaskItem], error: "" });
}

export async function toggleTask(id: string, done: boolean) {
  const result = await request(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ done }) });
  if (!result.response.ok) return;
  const task = result.data as TaskItem;
  emit({ ...snap, tasks: snap.tasks.map((item) => (item.id === id ? task : item)) });
}

export async function setGrasp(subject: string, grasp: number) {
  const result = await request("/api/curriculum", { method: "PUT", body: JSON.stringify({ subject, grasp }) });
  if (!result.response.ok) return;
  emit({ ...snap, grasp: { ...emptyGrasp(), ...(result.data.grasp as Partial<Grasp>) } });
}

export async function pushLog(session: Session) {
  if (!snap.user && !(await signedIn())) return;
  await request("/api/logs", { method: "POST", body: JSON.stringify(session) });
}

export async function clearServerLogs() {
  if (!snap.user) return;
  await request("/api/logs", { method: "DELETE" });
}

export async function pushStone(day: string) {
  if (!snap.user) return;
  await request("/api/stones", { method: "POST", body: JSON.stringify({ day }) });
}

async function signedIn() {
  if (snap.user) return true;
  const me = await request("/api/me");
  return me.response.ok;
}

function deviceKey() {
  const saved = localStorage.getItem("unmu.device");
  if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return saved;
  const next = crypto.randomUUID();
  localStorage.setItem("unmu.device", next);
  return next;
}
