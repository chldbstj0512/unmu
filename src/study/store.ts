import { useSyncExternalStore } from "react";
import { ambience } from "../audio/ambience.ts";
import { bridge } from "../experience/bridge.ts";
import {
  type Action,
  type Session,
  type StudyState,
  addStone,
  defaultState,
  formatClock,
  reduce,
  remainingSeconds,
  seoulDate,
  seoulTimeOfDay,
  stoneDays,
} from "./logic.ts";
import type { Spot, Zone } from "../world/layout.ts";

const KEY = "unmuam.v1";

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<Session>;
  return (
    typeof session.id === "string" &&
    typeof session.subject === "string" &&
    typeof session.seconds === "number" &&
    typeof session.note === "string" &&
    typeof session.at === "number"
  );
}

function num(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sanitize(raw: unknown): StudyState {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<StudyState>;
  const mode = data.mode === "break" ? "break" : "focus";
  const focusSeconds = num(data.focusSeconds, base.focusSeconds, 60, 180 * 60);
  const breakSeconds = num(data.breakSeconds, base.breakSeconds, 60, 60 * 60);
  let running = data.running === true;
  let endsAt = typeof data.endsAt === "number" && Number.isFinite(data.endsAt) ? data.endsAt : null;
  if (running && endsAt == null) running = false;
  return {
    ...base,
    intention: typeof data.intention === "string" ? data.intention.slice(0, 40) : "",
    school: typeof data.school === "string" ? data.school.trim().slice(0, 24) : "",
    department: typeof data.department === "string" ? data.department.trim().slice(0, 16) : "",
    goalSeconds: num(data.goalSeconds, base.goalSeconds, 3600, 14 * 3600),
    subject: typeof data.subject === "string" && data.subject.trim() ? data.subject.trim().slice(0, 16) : base.subject,
    note: typeof data.note === "string" ? data.note.slice(0, 500) : "",
    focusSeconds,
    breakSeconds,
    sessions: Array.isArray(data.sessions) ? data.sessions.filter(isSession).slice(-400) : [],
    sound: data.sound !== false,
    rain: data.rain === true,
    timeOfDay: seoulTimeOfDay(Date.now()),
    mode,
    running,
    endsAt,
    pausedRemaining: num(data.pausedRemaining, mode === "focus" ? focusSeconds : breakSeconds, 0, 180 * 60),
    segmentSeconds: num(data.segmentSeconds, mode === "focus" ? focusSeconds : breakSeconds, 60, 180 * 60),
    stones: stoneDays(data.stones),
  };
}

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultState();
  }
}

function write(next: StudyState) {
  try {
    const { intention, school, department, goalSeconds, subject, note, focusSeconds, breakSeconds, sessions, sound, rain, timeOfDay, mode, running, endsAt, pausedRemaining, segmentSeconds, stones } = next;
    localStorage.setItem(
      KEY,
      JSON.stringify({ intention, school, department, goalSeconds, subject, note, focusSeconds, breakSeconds, sessions, sound, rain, timeOfDay, mode, running, endsAt, pausedRemaining, segmentSeconds, stones }),
    );
  } catch {
    /* private mode or a full disk */
  }
}

function boot() {
  if (typeof localStorage === "undefined") return defaultState();
  let next = readLocal();
  if (next.running && next.endsAt != null && Date.now() >= next.endsAt) {
    next = reduce(next, { type: "complete" }, Date.now());
    write(next);
  }
  return next;
}

let state = boot();
const listeners = new Set<() => void>();

function commit(next: StudyState, persist: boolean) {
  const previous = state;
  const added = next.sessions.filter((session) => !previous.sessions.some((item) => item.id === session.id));
  const cleared = previous.sessions.length > 0 && next.sessions.length === 0;
  const profile =
    next.school !== previous.school ||
    next.department !== previous.department ||
    next.intention !== previous.intention ||
    next.goalSeconds !== previous.goalSeconds;
  state = next;
  if (persist) write(state);
  listeners.forEach((listener) => listener());
  if (!persist) return;
  if (added.length > 0 || cleared || profile) {
    void import("../account/client.ts").then((account) => {
      for (const session of added) void account.pushLog(session);
      if (cleared) void account.clearServerLogs();
      if (profile) {
        void account.saveProfile({
          school: next.school,
          department: next.department,
          intention: next.intention,
          goalHours: next.goalSeconds / 3600,
        });
      }
    });
  }
}

export function hydrateAccount(input: {
  school: string;
  department: string;
  intention: string;
  goalSeconds: number;
  sessions: Session[];
  stones: string[];
}) {
  commit(
    {
      ...state,
      school: input.school,
      department: input.department,
      intention: input.intention,
      goalSeconds: input.goalSeconds,
      sessions: input.sessions,
      stones: input.stones,
    },
    true,
  );
}

export function leaveAccount() {
  commit(
    {
      ...state,
      entered: false,
      school: "",
      department: "",
      intention: "",
      sessions: [],
      stones: [],
      seatedId: null,
      sheetOpen: false,
      examOpen: false,
    },
    true,
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

export function useStudy<T>(selector: (current: StudyState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export function dispatch(action: Action) {
  commit(reduce(state, action, Date.now()), true);
}

export function engineTick() {
  const now = Date.now();
  const sky = seoulTimeOfDay(now);
  if (sky !== state.timeOfDay) commit({ ...state, timeOfDay: sky }, false);
  if (state.running && state.endsAt != null && now >= state.endsAt) {
    const finished = state.mode;
    commit(reduce(state, { type: "complete" }, now), true);
    if (finished === "focus") ambience.bell();
    else ambience.chime();
  } else if (state.running) {
    commit({ ...state, tick: state.tick + 1 }, false);
  }
  if (state.running) {
    document.title = `${formatClock(remainingSeconds(state, Date.now()))} · ${state.mode === "focus" ? state.subject : "쉼"} · 운무암`;
  } else if (document.title !== "운무암") {
    document.title = "운무암";
  }
}

export function startTimer() {
  const before = state;
  const next = reduce(before, { type: "start" }, Date.now());
  commit(next, true);
  if (!before.running && next.running && next.mode === "focus") ambience.moktak();
}

export function pauseTimer() {
  commit(reduce(state, { type: "pause" }, Date.now()), true);
}

export function stopTimer() {
  commit(reduce(state, { type: "stop" }, Date.now()), true);
}

function label(value: string, max: number) {
  return value.trim().slice(0, max);
}

export function setIdentity(school: string, department: string) {
  commit({ ...state, school: label(school, 24), department: label(department, 16) }, true);
}

export function enterWorld(intention: string, goalHours: number, school: string, department: string) {
  ambience.unlock();
  const withVow = reduce(reduce(state, { type: "intention", intention }, Date.now()), { type: "goal", hours: goalHours }, Date.now());
  commit({ ...withVow, school: label(school, 24), department: label(department, 16), entered: true, fade: true }, true);
  window.setTimeout(() => {
    if (state.entered) commit({ ...state, fade: false }, false);
  }, 520);
}

export function travelTo(spot: Spot) {
  if (state.fade) return;
  commit({ ...state, seatedId: null, sheetOpen: state.seatedId ? false : state.sheetOpen, examOpen: false, fade: true }, false);
  window.setTimeout(() => {
    bridge.travel = { x: spot.x, z: spot.z, yaw: spot.yaw, pitch: spot.pitch };
    window.setTimeout(() => commit({ ...state, fade: false }, false), 80);
  }, 280);
}

export function interact(zone: Zone) {
  if (zone.kind === "desk") {
    document.exitPointerLock?.();
    commit({ ...state, seatedId: zone.id, sheetOpen: true }, false);
    return;
  }
  if (zone.kind === "exam") {
    document.exitPointerLock?.();
    commit({ ...state, examOpen: true }, false);
    return;
  }
  if (zone.kind === "cairn") {
    stackStone();
    return;
  }
  if (zone.kind === "bell") {
    ambience.bell();
    bridge.ringUntil = performance.now() + 4800;
    commit({ ...state, toast: { id: Date.now(), text: "종이 마당을 한 바퀴 돈다." } }, false);
    return;
  }
  if (zone.kind === "breath") {
    document.exitPointerLock?.();
    commit({ ...state, breathOpen: true }, false);
    return;
  }
  document.exitPointerLock?.();
  commit({ ...state, vowOpen: true }, false);
}

export function stackStone(now = Date.now()) {
  const next = addStone(state.stones, now);
  if (!next.added) {
    commit({ ...state, toast: { id: now, text: "오늘은 이미 돌을 얹었다." } }, false);
    return;
  }
  commit(
    {
      ...state,
      stones: next.days,
      toast: { id: now, text: `돌을 얹었다. ${next.days.length}개.` },
    },
    true,
  );
  void import("../account/client.ts").then((account) => account.pushStone(seoulDate(now)));
}

export function stand() {
  commit({ ...state, seatedId: null, sheetOpen: false }, false);
}

export function setSheet(open: boolean) {
  if (open) document.exitPointerLock?.();
  commit({ ...state, sheetOpen: open }, false);
}

export function setRecord(open: boolean) {
  if (open) document.exitPointerLock?.();
  commit({ ...state, recordOpen: open }, false);
}

export function setVow(open: boolean) {
  if (open) document.exitPointerLock?.();
  commit({ ...state, vowOpen: open }, false);
}

export function setExam(open: boolean) {
  if (open) document.exitPointerLock?.();
  commit({ ...state, examOpen: open }, false);
}

export function setHelp(open: boolean) {
  if (open) document.exitPointerLock?.();
  commit({ ...state, helpOpen: open }, false);
}

export function setBreath(open: boolean) {
  commit({ ...state, breathOpen: open }, false);
}

export function setRain(rain: boolean) {
  commit({ ...state, rain }, true);
}

export function toggleSound() {
  ambience.unlock();
  commit({ ...state, sound: !state.sound }, true);
}

