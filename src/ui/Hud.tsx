import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CloudRain, Moon, Sun, Sunrise, Sunset, Volume2, VolumeX } from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import { input } from "../experience/input.ts";
import { getWorldSnap, subscribeWorld } from "../experience/bridge.ts";
import { visualFor } from "../experience/atmosphere.ts";
import {
  cycleTime,
  interact,
  setHelp,
  setRain,
  setRecord,
  setSheet,
  toggleSound,
  useStudy,
} from "../study/store.ts";
import { formatClock, formatSpan, remainingSeconds, streak, todaySeconds } from "../study/logic.ts";
import { Minimap } from "./Minimap.tsx";

function useCoarsePointer() {
  const subscribe = (onChange: () => void) => {
    const media = window.matchMedia("(pointer: coarse)");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  };
  return useSyncExternalStore(subscribe, () => window.matchMedia("(pointer: coarse)").matches, () => false);
}

function useWorld() {
  return useSyncExternalStore(subscribeWorld, getWorldSnap, getWorldSnap);
}

const TIME_ICON = {
  dawn: Sunrise,
  day: Sun,
  dusk: Sunset,
  night: Moon,
} as const;

export function Hud() {
  const coarse = useCoarsePointer();
  const world = useWorld();
  const timeOfDay = useStudy((state) => state.timeOfDay);
  const rain = useStudy((state) => state.rain);
  const sound = useStudy((state) => state.sound);
  const toast = useStudy((state) => state.toast);
  const visual = visualFor(timeOfDay, rain);
  const Icon = TIME_ICON[timeOfDay];

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <div className="pointer-events-auto absolute left-3 top-3 sm:left-4 sm:top-4">
        <Minimap />
      </div>
      <div className="absolute left-1/2 top-3 w-[min(280px,46vw)] -translate-x-1/2 text-center text-[#f6efe2] [text-shadow:0_1px_8px_rgba(0,0,0,0.45)] sm:top-4">
        <p className="font-serif text-lg tracking-[0.28em]">운무암</p>
        <p className="text-sm">{world.place}</p>
        <Toast toast={toast} />
      </div>
      <div className="pointer-events-auto absolute right-3 top-3 z-20 flex gap-2 sm:right-4 sm:top-4">
        <Button variant="overlay" size="icon" aria-label={rain ? "비 그치기" : "비 내리기"} onClick={() => setRain(!rain)}>
          <CloudRain className={rain ? "text-[#d5e4f2]" : "opacity-70"} />
        </Button>
        <Button variant="overlay" size="icon" aria-label={sound ? "소리 끄기" : "소리 켜기"} onClick={toggleSound}>
          {sound ? <Volume2 /> : <VolumeX />}
        </Button>
        <Button variant="overlay" size="sm" aria-label={`시각 ${visual.label}`} onClick={cycleTime}>
          <Icon className="h-4 w-4" />
          {visual.label}
        </Button>
      </div>
      <div className="pointer-events-auto absolute bottom-3 left-3 hidden max-w-xs text-xs leading-5 text-[#f6efe2]/80 sm:block">
        <button type="button" className="underline-offset-4 hover:underline" onClick={() => setHelp(true)}>
          WASD 걷기 · 마우스를 끌어 좌우로 둘러본다 · E 앉기
        </button>
      </div>
      {world.nearby ? (
        <div className="pointer-events-auto absolute bottom-28 left-1/2 z-20 -translate-x-1/2 sm:bottom-8">
          <Button variant="overlay" size="lg" onClick={() => interact(world.nearby!)}>
            {coarse ? world.nearby.verb : `E  ·  ${world.nearby.verb}`}
          </Button>
        </div>
      ) : null}
      <TodayChip />
      <Button className="pointer-events-auto absolute bottom-20 right-3 z-20 sm:bottom-20" variant="overlay" size="sm" onClick={() => setSheet(true)}>
        책상
      </Button>
      {coarse ? <Joystick /> : null}
      {coarse ? <LookPad /> : null}
      <LockDot />
    </div>
  );
}

function Toast({ toast }: { toast: { id: number; text: string } | null }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    setText(toast.text);
    const id = window.setTimeout(() => setText(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);
  if (!text) return null;
  return <p className="mt-2 text-sm">{text}</p>;
}

function TodayChip() {
  const sessions = useStudy((state) => state.sessions);
  const tick = useStudy((state) => state.tick);
  const running = useStudy((state) => state.running);
  const mode = useStudy((state) => state.mode);
  const subject = useStudy((state) => state.subject);
  const goal = useStudy((state) => state.goalSeconds);
  void tick;
  const now = Date.now();
  const state = useStudy((current) => current);
  const today = todaySeconds(sessions, now);
  const days = streak(sessions, now);
  const remain = remainingSeconds(state, now);
  const ratio = Math.min(100, (today / goal) * 100);
  return (
    <button
      type="button"
      className="pointer-events-auto absolute bottom-3 right-3 z-20 min-w-36 rounded-2xl border border-white/20 bg-black/40 px-3 py-2 text-left text-[#f6efe2] backdrop-blur-md sm:bottom-4 sm:right-4"
      onClick={() => setRecord(true)}
    >
      {running ? (
        <span className="block font-serif text-2xl tabular-nums">{formatClock(remain)}</span>
      ) : (
        <span className="block text-sm">오늘 {formatSpan(today)}</span>
      )}
      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/20">
        <span className="block h-full bg-[#e7c4a0]" style={{ width: `${ratio}%` }} />
      </span>
      <span className="mt-1 block text-[11px] text-[#f6efe2]/75">
        {running ? (mode === "focus" ? subject : "쉬는 중") : `${formatSpan(goal)} 목표`}
        {days > 0 ? ` · ${days}일` : ""}
      </span>
    </button>
  );
}

function Joystick() {
  const pad = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pad.current;
    if (!el) return;
    let id: number | null = null;
    const set = (x: number, y: number) => {
      input.joyX = x;
      input.joyY = y;
      if (knob.current) knob.current.style.transform = `translate(${x * 28}px, ${-y * 28}px)`;
    };
    const move = (event: PointerEvent) => {
      if (id !== event.pointerId) return;
      const rect = el.getBoundingClientRect();
      let x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      let y = -((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2));
      const len = Math.hypot(x, y) || 1;
      if (len > 1) {
        x /= len;
        y /= len;
      }
      set(x, y);
    };
    const down = (event: PointerEvent) => {
      id = event.pointerId;
      el.setPointerCapture(event.pointerId);
      move(event);
    };
    const up = (event: PointerEvent) => {
      if (id !== event.pointerId) return;
      id = null;
      set(0, 0);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      set(0, 0);
    };
  }, []);
  return (
    <div ref={pad} className="joystick pointer-events-auto" aria-label="이동">
      <div ref={knob} className="knob" />
    </div>
  );
}

function LookPad() {
  const pad = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pad.current;
    if (!el) return;
    let id: number | null = null;
    let lx = 0;
    let ly = 0;
    const down = (event: PointerEvent) => {
      id = event.pointerId;
      lx = event.clientX;
      ly = event.clientY;
      el.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (id !== event.pointerId) return;
      input.lookX += event.clientX - lx;
      input.lookY += event.clientY - ly;
      lx = event.clientX;
      ly = event.clientY;
    };
    const up = (event: PointerEvent) => {
      if (id === event.pointerId) id = null;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);
  return <div ref={pad} className="lookpad pointer-events-auto" aria-hidden />;
}

function LockDot() {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const onChange = () => setLocked(document.pointerLockElement != null);
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);
  if (!locked) return null;
  return <div className="pointer-events-none fixed left-1/2 top-1/2 z-20 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f6efe2]" />;
}
