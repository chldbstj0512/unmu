export type Session = {
  id: string;
  subject: string;
  seconds: number;
  note: string;
  at: number;
};

export type StudyMode = "focus" | "break";

export type TimeId = "dawn" | "day" | "dusk" | "night";

export type Toast = { id: number; text: string };

export type StudyState = {
  intention: string;
  school: string;
  department: string;
  goalSeconds: number;
  subject: string;
  note: string;
  focusSeconds: number;
  breakSeconds: number;
  sessions: Session[];
  sound: boolean;
  rain: boolean;
  timeOfDay: TimeId;
  mode: StudyMode;
  running: boolean;
  endsAt: number | null;
  pausedRemaining: number;
  segmentSeconds: number;
  seatedId: string | null;
  sheetOpen: boolean;
  breathOpen: boolean;
  recordOpen: boolean;
  vowOpen: boolean;
  helpOpen: boolean;
  entered: boolean;
  fade: boolean;
  tick: number;
  toast: Toast | null;
};

export type Action =
  | { type: "start" }
  | { type: "pause" }
  | { type: "complete" }
  | { type: "stop" }
  | { type: "preset"; focus: number; break: number }
  | { type: "subject"; subject: string }
  | { type: "note"; note: string }
  | { type: "intention"; intention: string }
  | { type: "goal"; hours: number }
  | { type: "clear" };

export const SUBJECTS = ["국어", "수학", "영어", "탐구", "한국사"] as const;

export const PRESETS = [
  { id: "25", label: "25 / 5", focus: 25 * 60, break: 5 * 60 },
  { id: "50", label: "50 / 10", focus: 50 * 60, break: 10 * 60 },
  { id: "90", label: "90 / 15", focus: 90 * 60, break: 15 * 60 },
] as const;

export const LINES = [
  "안개는 재촉하지 않는다.",
  "한 장만, 그리고 숨을 놓는다.",
  "종소리는 멀수록 또렷하다.",
  "오늘은 어제를 지나가는 중이다.",
  "빗소리는 이미 충분히 빠르다.",
  "아는 것을 천천히 다시 앉힌다.",
  "산은 틀린 답도 품은 채 있다.",
  "먹이 마를 때까지가 한 덩이다.",
  "무릎이 땅에 닿으면 시간이 고른다.",
  "급하지 않은 붓이 끝까지 간다.",
] as const;

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const seoulClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Mid-month sunrise and sunset in Seoul, minutes from midnight. Korea has no daylight saving.
const SEOUL_SUN: Array<[number, number]> = [
  [7 * 60 + 47, 17 * 60 + 36],
  [7 * 60 + 20, 18 * 60 + 8],
  [6 * 60 + 40, 18 * 60 + 38],
  [5 * 60 + 55, 19 * 60 + 8],
  [5 * 60 + 20, 19 * 60 + 37],
  [5 * 60 + 11, 19 * 60 + 57],
  [5 * 60 + 24, 19 * 60 + 52],
  [5 * 60 + 48, 19 * 60 + 22],
  [6 * 60 + 12, 18 * 60 + 38],
  [6 * 60 + 38, 17 * 60 + 52],
  [7 * 60 + 8, 17 * 60 + 20],
  [7 * 60 + 36, 17 * 60 + 17],
];

export function seoulTimeOfDay(ts: number): TimeId {
  const parts = seoulClock.formatToParts(new Date(ts));
  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const sun = SEOUL_SUN[pick("month") - 1] ?? SEOUL_SUN[0];
  const minutes = pick("hour") * 60 + pick("minute");
  const rise = sun[0];
  const set = sun[1];
  if (minutes >= rise - 40 && minutes < rise + 25) return "dawn";
  if (minutes >= set - 30 && minutes < set + 40) return "dusk";
  if (minutes >= rise + 25 && minutes < set - 30) return "day";
  return "night";
}

export function seoulStamp(ts: number): { date: string; time: string } {
  const parts = seoulClock.formatToParts(new Date(ts));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${Number(pick("month"))}월 ${Number(pick("day"))}일`, time: `${pick("hour")}:${pick("minute")}` };
}

export function seoulDate(ts: number): string {
  return dayFormat.format(new Date(ts));
}

export function prevDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function defaultState(): StudyState {
  return {
    intention: "",
    school: "",
    department: "",
    goalSeconds: 4 * 3600,
    subject: "국어",
    note: "",
    focusSeconds: 50 * 60,
    breakSeconds: 10 * 60,
    sessions: [],
    sound: true,
    rain: false,
    timeOfDay: "dusk",
    mode: "focus",
    running: false,
    endsAt: null,
    pausedRemaining: 50 * 60,
    segmentSeconds: 50 * 60,
    seatedId: null,
    sheetOpen: false,
    breathOpen: false,
    recordOpen: false,
    vowOpen: false,
    helpOpen: false,
    entered: false,
    fade: false,
    tick: 0,
    toast: null,
  };
}

export function remainingSeconds(state: StudyState, now: number): number {
  if (state.running && state.endsAt != null) return Math.max(0, (state.endsAt - now) / 1000);
  return Math.max(0, state.pausedRemaining);
}

function withSession(state: StudyState, seconds: number, now: number): Session[] {
  const next = [
    ...state.sessions,
    {
      id: `${now}-${state.sessions.length}`,
      subject: state.subject,
      seconds,
      note: state.note.slice(0, 500),
      at: now,
    },
  ];
  return next.length > 400 ? next.slice(next.length - 400) : next;
}

export function reduce(state: StudyState, action: Action, now: number): StudyState {
  switch (action.type) {
    case "start": {
      if (state.running) return state;
      let remaining = state.pausedRemaining;
      let segment = state.segmentSeconds;
      if (remaining <= 0.2) {
        remaining = state.mode === "focus" ? state.focusSeconds : state.breakSeconds;
        segment = remaining;
      }
      return {
        ...state,
        running: true,
        segmentSeconds: segment,
        pausedRemaining: remaining,
        endsAt: now + remaining * 1000,
      };
    }
    case "pause": {
      if (!state.running || state.endsAt == null) return state;
      return {
        ...state,
        running: false,
        endsAt: null,
        pausedRemaining: Math.max(0, (state.endsAt - now) / 1000),
      };
    }
    case "complete": {
      if (!state.running || state.endsAt == null || now + 40 < state.endsAt) return state;
      if (state.mode === "focus") {
        return {
          ...state,
          sessions: withSession(state, Math.round(state.segmentSeconds), now),
          mode: "break",
          running: true,
          segmentSeconds: state.breakSeconds,
          pausedRemaining: state.breakSeconds,
          endsAt: now + state.breakSeconds * 1000,
          toast: { id: now, text: "한 덩이를 마쳤다. 숨 고를 시간." },
        };
      }
      return {
        ...state,
        mode: "focus",
        running: false,
        endsAt: null,
        segmentSeconds: state.focusSeconds,
        pausedRemaining: state.focusSeconds,
        toast: { id: now, text: "다시 책상 앞이다." },
      };
    }
    case "stop": {
      const remaining = remainingSeconds(state, now);
      const elapsed = Math.max(0, Math.round(state.segmentSeconds - remaining));
      let sessions = state.sessions;
      let toast = state.toast;
      if (state.mode === "focus" && elapsed >= 30) {
        sessions = withSession(state, elapsed, now);
        toast = { id: now, text: "여기까지를 기록해 두었다." };
      } else if (state.mode === "focus" && state.running && elapsed > 0) {
        toast = { id: now, text: "삼십 초가 되지 않아 기록은 남기지 않았다." };
      }
      return {
        ...state,
        sessions,
        toast,
        mode: "focus",
        running: false,
        endsAt: null,
        segmentSeconds: state.focusSeconds,
        pausedRemaining: state.focusSeconds,
      };
    }
    case "preset": {
      if (state.running) return state;
      const focus = clamp(action.focus, 60, 180 * 60);
      const rest = clamp(action.break, 60, 60 * 60);
      return {
        ...state,
        focusSeconds: focus,
        breakSeconds: rest,
        mode: "focus",
        pausedRemaining: focus,
        segmentSeconds: focus,
        endsAt: null,
      };
    }
    case "subject": {
      const subject = action.subject.trim().slice(0, 16) || "공부";
      return { ...state, subject };
    }
    case "note":
      return { ...state, note: action.note.slice(0, 500) };
    case "intention":
      return { ...state, intention: action.intention.trim().slice(0, 40) };
    case "goal":
      return { ...state, goalSeconds: clamp(Math.round(action.hours), 1, 14) * 3600 };
    case "clear":
      return { ...state, sessions: [], toast: { id: now, text: "기록을 거두었다." } };
    default:
      return state;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function todaySeconds(sessions: Session[], now: number): number {
  const day = seoulDate(now);
  return sessions.reduce((sum, session) => (seoulDate(session.at) === day ? sum + session.seconds : sum), 0);
}

export function streak(sessions: Session[], now: number): number {
  const days = new Set(sessions.map((session) => seoulDate(session.at)));
  let day = seoulDate(now);
  if (!days.has(day)) {
    day = prevDay(day);
    if (!days.has(day)) return 0;
  }
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = prevDay(day);
  }
  return count;
}

export function formatClock(seconds: number): string {
  const total = Math.ceil(Math.max(0, seconds) - 1e-9);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatSpan(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h <= 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function dayLabel(ymd: string, now: number): string {
  const today = seoulDate(now);
  if (ymd === today) return "오늘";
  if (ymd === prevDay(today)) return "어제";
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일`;
}

export function weekTotals(sessions: Session[], now: number): { key: string; label: string; seconds: number }[] {
  const days: string[] = [];
  let day = seoulDate(now);
  for (let i = 0; i < 7; i += 1) {
    days.push(day);
    day = prevDay(day);
  }
  days.reverse();
  return days.map((key) => ({
    key,
    label: new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "Asia/Seoul" }).format(
      new Date(`${key}T12:00:00+09:00`),
    ),
    seconds: sessions.reduce((sum, session) => (seoulDate(session.at) === key ? sum + session.seconds : sum), 0),
  }));
}

export type DayGroup = { key: string; label: string; seconds: number; items: Session[] };

export function sessionsByDay(sessions: Session[], now: number): DayGroup[] {
  const groups = new Map<string, Session[]>();
  for (const session of sessions) {
    const key = seoulDate(session.at);
    const list = groups.get(key);
    if (list) list.push(session);
    else groups.set(key, [session]);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => ({
      key,
      label: dayLabel(key, now),
      seconds: items.reduce((sum, session) => sum + session.seconds, 0),
      items: [...items].sort((a, b) => b.at - a.at),
    }));
}
