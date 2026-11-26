import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultState,
  formatClock,
  prevDay,
  reduce,
  seoulDate,
  seoulStamp,
  seoulTimeOfDay,
  streak,
  todaySeconds,
  weekTotals,
} from "./logic.ts";

const noon = Date.parse("2026-11-26T03:00:00.000Z");

test("seoul date follows Asia/Seoul", () => {
  assert.equal(seoulDate(noon), "2026-11-26");
  assert.equal(seoulDate(Date.parse("2026-11-25T14:30:00.000Z")), "2026-11-25");
});

test("seoul stamp is the Korean date and 24-hour time", () => {
  assert.deepEqual(seoulStamp(Date.parse("2026-11-27T00:11:00+09:00")), { date: "11월 27일", time: "00:11" });
  assert.deepEqual(seoulStamp(Date.parse("2026-06-21T19:05:00+09:00")), { date: "6월 21일", time: "19:05" });
});

test("seoul sky follows the month's sunrise and sunset", () => {
  assert.equal(seoulTimeOfDay(Date.parse("2026-11-27T00:06:00+09:00")), "night");
  assert.equal(seoulTimeOfDay(Date.parse("2026-11-26T07:20:00+09:00")), "dawn");
  assert.equal(seoulTimeOfDay(Date.parse("2026-11-26T12:00:00+09:00")), "day");
  assert.equal(seoulTimeOfDay(Date.parse("2026-11-26T17:10:00+09:00")), "dusk");
  assert.equal(seoulTimeOfDay(Date.parse("2026-06-21T05:20:00+09:00")), "dawn");
  assert.equal(seoulTimeOfDay(Date.parse("2026-06-21T04:00:00+09:00")), "night");
  assert.equal(seoulTimeOfDay(Date.parse("2026-06-21T20:20:00+09:00")), "dusk");
});

test("prevDay crosses month boundaries", () => {
  assert.equal(prevDay("2026-03-01"), "2026-02-28");
  assert.equal(prevDay("2024-03-01"), "2024-02-29");
});

test("start, pause, and complete a focus block", () => {
  let state = defaultState();
  state = reduce(state, { type: "start" }, noon);
  assert.equal(state.running, true);
  assert.equal(state.endsAt, noon + 50 * 60 * 1000);

  state = reduce(state, { type: "pause" }, noon + 10_000);
  assert.equal(state.running, false);
  assert.ok(Math.abs(state.pausedRemaining - (50 * 60 - 10)) < 0.02);

  state = reduce(state, { type: "start" }, noon + 10_000);
  state = reduce(state, { type: "complete" }, state.endsAt ?? 0);
  assert.equal(state.mode, "break");
  assert.equal(state.running, true);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0]?.seconds, 50 * 60);
  assert.equal(state.sessions[0]?.subject, "국어");
});

test("complete is ignored before the block ends", () => {
  let state = reduce(defaultState(), { type: "start" }, noon);
  const next = reduce(state, { type: "complete" }, noon + 1000);
  assert.equal(next, state);
});

test("early stop logs a partial focus and ignores a short one", () => {
  let state = reduce(defaultState(), { type: "start" }, noon);
  state = reduce(state, { type: "stop" }, noon + 120_000);
  assert.equal(state.sessions[0]?.seconds, 120);
  assert.equal(state.running, false);
  assert.equal(state.pausedRemaining, 50 * 60);

  state = reduce(state, { type: "start" }, noon);
  state = reduce(state, { type: "stop" }, noon + 10_000);
  assert.equal(state.sessions.length, 1);
});

test("preset waits until the timer is paused", () => {
  let state = reduce(defaultState(), { type: "start" }, noon);
  const ignored = reduce(state, { type: "preset", focus: 25 * 60, break: 5 * 60 }, noon);
  assert.equal(ignored.focusSeconds, 50 * 60);
  state = reduce(state, { type: "pause" }, noon + 1000);
  state = reduce(state, { type: "preset", focus: 25 * 60, break: 5 * 60 }, noon);
  assert.equal(state.focusSeconds, 25 * 60);
  assert.equal(state.pausedRemaining, 25 * 60);
  assert.equal(state.mode, "focus");
});

test("today total and streak use Seoul midnights", () => {
  const sessions = [
    { id: "a", subject: "수학", seconds: 100, note: "", at: Date.parse("2026-11-24T03:00:00.000Z") },
    { id: "b", subject: "수학", seconds: 200, note: "", at: Date.parse("2026-11-25T03:00:00.000Z") },
    { id: "c", subject: "국어", seconds: 300, note: "", at: noon },
    { id: "d", subject: "국어", seconds: 50, note: "", at: noon + 3600_000 },
  ];
  assert.equal(todaySeconds(sessions, noon), 350);
  assert.equal(streak(sessions, noon), 3);
  assert.equal(streak(sessions.slice(0, 2), noon), 2);
  assert.equal(streak([sessions[0]!], noon), 0);
  assert.equal(weekTotals(sessions, noon).length, 7);
  assert.equal(weekTotals(sessions, noon).at(-1)?.seconds, 350);
});

test("notes and subjects are bounded", () => {
  let state = reduce(defaultState(), { type: "note", note: "가".repeat(800) }, noon);
  assert.equal(state.note.length, 500);
  state = reduce(state, { type: "subject", subject: "  생명과학탐구아주긴이름  " }, noon);
  assert.equal(state.subject.length <= 16, true);
  state = reduce(state, { type: "start" }, noon);
  state = reduce(state, { type: "complete" }, state.endsAt ?? noon);
  assert.equal(state.sessions[0]?.note.length, 500);
});

test("clock format", () => {
  assert.equal(formatClock(50 * 60), "50:00");
  assert.equal(formatClock(0), "00:00");
  assert.equal(formatClock(65), "01:05");
});
