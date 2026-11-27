import assert from "node:assert/strict";
import test from "node:test";
import { buildDay, type ExamPlan } from "./exam.ts";
import { examSeats } from "../world/layout.ts";

const plan: ExamPlan = {
  kor: "언어와 매체",
  math: "미적분",
  inquiry: ["생활과 윤리", "물리학Ⅰ"],
  second: "일본어",
};

test("a full sittings follows the CSAT clock", () => {
  const day = buildDay(plan);
  const byId = Object.fromEntries(day.map((item) => [item.id, item]));
  assert.equal(byId.kor?.minutes, 80);
  assert.equal(byId.kor?.questions, 45);
  assert.equal(byId.math?.minutes, 100);
  assert.equal(byId.math?.questions, 30);
  assert.deepEqual(byId.math?.shorts, [16, 17, 18, 19, 20, 21, 22, 29, 30]);
  assert.equal(byId.eng?.minutes, 70);
  assert.equal(byId.eng?.listeningUntil, 17);
  assert.equal(byId.hist?.minutes, 30);
  assert.equal(byId.hist?.questions, 20);
  assert.equal(byId["inq-1"]?.minutes, 30);
  assert.equal(byId["inq-2"]?.name, "탐구 · 물리학Ⅰ");
  assert.equal(byId.second?.minutes, 40);
  assert.equal(byId.second?.questions, 30);
  assert.equal(byId.lunch?.minutes, 60);
  assert.equal(byId.swap?.minutes, 2);
  assert.equal(day[0]?.id, "kor");
  assert.equal(day.at(-1)?.id, "second");
});

test("skipping the second language ends after inquiry", () => {
  const day = buildDay({ ...plan, second: null });
  assert.equal(day.some((item) => item.id === "second"), false);
  assert.equal(day.at(-1)?.id, "inq-2");
});

test("one period does not drag the whole day", () => {
  const day = buildDay(plan, "eng");
  assert.equal(day.length, 1);
  assert.equal(day[0]?.id, "eng");
});

test("the hall has one hundred seats", () => {
  const seats = examSeats();
  assert.equal(seats.length, 100);
  assert.equal(seats[0]?.n, 1);
  assert.equal(seats[99]?.n, 100);
  const xs = seats.map((seat) => seat.x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 8);
});
