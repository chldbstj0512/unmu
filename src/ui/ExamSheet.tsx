import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "../components/ui/button.tsx";
import {
  INQUIRY,
  KOR_CHOICES,
  MATH_CHOICES,
  SECOND_LANG,
  buildDay,
  marks,
  type ExamPlan,
  type Segment,
} from "../study/exam.ts";
import { formatClock } from "../study/logic.ts";
import { setExam, useStudy } from "../study/store.ts";

type Answers = Record<string, Array<number | string | null>>;

const EMPTY: ExamPlan = {
  kor: "언어와 매체",
  math: "미적분",
  inquiry: ["생활과 윤리", "물리학Ⅰ"],
  second: null,
};

function freshAnswers(segments: Segment[]): Answers {
  const next: Answers = {};
  for (const segment of segments) {
    if (segment.kind === "exam") next[segment.id] = Array.from({ length: segment.questions }, () => null);
  }
  return next;
}

function filled(values: Array<number | string | null> | undefined) {
  return (values ?? []).filter((value) => value !== null && value !== "").length;
}

export function ExamSheet() {
  const open = useStudy((state) => state.examOpen);
  const [plan, setPlan] = useState<ExamPlan>(EMPTY);
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [index, setIndex] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open || endsAt == null || done) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [open, endsAt, done]);

  const current = segments?.[index] ?? null;
  const remain = endsAt == null ? 0 : Math.max(0, (endsAt - now) / 1000);
  const advanced = useRef(false);

  useEffect(() => {
    if (remain > 0) {
      advanced.current = false;
      return;
    }
    if (advanced.current || !current || done || endsAt == null) return;
    advanced.current = true;
    const next = index + 1;
    if (!segments || next >= segments.length) {
      setDone(true);
      setEndsAt(null);
      return;
    }
    const upcoming = segments[next];
    if (!upcoming) return;
    setIndex(next);
    setEndsAt(Date.now() + upcoming.minutes * 60 * 1000);
  }, [current, done, endsAt, index, remain, segments]);

  const start = (only?: string) => {
    if (plan.inquiry[0] === plan.inquiry[1]) return;
    const day = buildDay(plan, only);
    const first = day[0];
    if (!first) return;
    setSegments(day);
    setAnswers(freshAnswers(day));
    setIndex(0);
    setDone(false);
    setNow(Date.now());
    setEndsAt(Date.now() + first.minutes * 60 * 1000);
  };

  const close = () => {
    setSegments(null);
    setDone(false);
    setEndsAt(null);
    setExam(false);
  };

  if (!open) return null;

  return (
    <aside className="hanji pointer-events-auto fixed inset-x-0 bottom-0 z-40 flex max-h-[86dvh] flex-col overflow-hidden rounded-t-2xl border border-[#e3e0da] p-4 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(520px,100vw)] sm:rounded-none sm:border-y-0 sm:border-r-0 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#8a7568]">시험장 · 100석</p>
          <h2 className="text-2xl font-semibold tracking-tight">수능 모의고사</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={close}>
          나가기
        </Button>
      </div>
      {done ? <Summary segments={segments ?? []} answers={answers} /> : null}
      {!done && current ? (
        <Running
          segment={current}
          index={index}
          total={segments?.length ?? 1}
          remain={remain}
          answers={answers[current.id] ?? []}
          onChoice={(question, choice) => {
            setAnswers((prev) => {
              const list = [...(prev[current.id] ?? [])];
              list[question] = list[question] === choice ? null : choice;
              return { ...prev, [current.id]: list };
            });
          }}
          onShort={(question, value) => {
            setAnswers((prev) => {
              const list = [...(prev[current.id] ?? [])];
              list[question] = value;
              return { ...prev, [current.id]: list };
            });
          }}
          onSkip={() => {
            if (!segments) return;
            const next = index + 1;
            if (next >= segments.length) {
              setDone(true);
              setEndsAt(null);
              return;
            }
            const upcoming = segments[next];
            if (!upcoming) return;
            setIndex(next);
            setNow(Date.now());
            setEndsAt(Date.now() + upcoming.minutes * 60 * 1000);
          }}
        />
      ) : null}
      {!done && !current ? <Setup plan={plan} setPlan={setPlan} onStart={start} /> : null}
    </aside>
  );
}

function Setup({
  plan,
  setPlan,
  onStart,
}: {
  plan: ExamPlan;
  setPlan: (plan: ExamPlan) => void;
  onStart: (only?: string) => void;
}) {
  const day = useMemo(() => buildDay(plan), [plan]);
  const same = plan.inquiry[0] === plan.inquiry[1];
  return (
    <div className="mt-4 min-h-0 flex-1 overflow-auto">
      <p className="text-sm leading-6 text-[#4e463f]">
        2026학년도 수능 시간표다. 시각은 시험 당일 기준이고, 여기서는 시작하는 순간부터 그 길이만큼 센다. 문제는 가져온 문제지로 풀고, 이 자리에는 답만 표시한다. 답안은 이 화면에만 남고, 채점은 문제지의 정답으로 한다.
      </p>
      <div className="mt-4 grid gap-3">
        <Field label="국어 선택">
          <Pick
            value={plan.kor}
            options={KOR_CHOICES}
            onChange={(kor) => setPlan({ ...plan, kor })}
          />
        </Field>
        <Field label="수학 선택">
          <Pick value={plan.math} options={MATH_CHOICES} onChange={(math) => setPlan({ ...plan, math })} />
        </Field>
        <Field label="탐구 두 과목">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[0, 1].map((slot) => (
              <select
                key={slot}
                className="h-11 rounded-md border border-[#d9cbb3] bg-[#fbf6ec] px-3 text-sm"
                value={plan.inquiry[slot]}
                onChange={(event) => {
                  const inquiry: ExamPlan["inquiry"] = [...plan.inquiry];
                  inquiry[slot] = event.target.value as ExamPlan["inquiry"][number];
                  setPlan({ ...plan, inquiry });
                }}
              >
                {INQUIRY.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            ))}
          </div>
          {same ? <p className="mt-1 text-xs text-[#7a2e2a]">두 과목은 달라야 한다.</p> : null}
        </Field>
        <Field label="제2외국어/한문">
          <select
            className="h-11 w-full rounded-md border border-[#d9cbb3] bg-[#fbf6ec] px-3 text-sm"
            value={plan.second ?? ""}
            onChange={(event) => setPlan({ ...plan, second: event.target.value ? (event.target.value as ExamPlan["second"]) : null })}
          >
            <option value="">보지 않음</option>
            {SECOND_LANG.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </Field>
      </div>
      <ol className="mt-4 grid gap-2">
        {day.map((segment) => (
          <li key={segment.id} className="flex items-center justify-between gap-3 rounded-md bg-[#efe4cf] px-3 py-2 text-sm">
            <span>
              <span className="text-[#8a7568]">{segment.period}</span> {segment.name}
              <span className="mt-0.5 block text-xs text-[#6b5c4a]">
                {segment.clock} · {marks(segment)}
              </span>
            </span>
            {segment.kind === "exam" ? (
              <Button size="sm" variant="outline" disabled={same} onClick={() => onStart(segment.id)}>
                이 교시
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
      <Button className="mt-4 w-full" disabled={same} onClick={() => onStart()}>
        1교시부터
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-[#6b5c4a]">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Pick<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button key={option} size="sm" variant={value === option ? "default" : "outline"} onClick={() => onChange(option)}>
          {option}
        </Button>
      ))}
    </div>
  );
}

function Running({
  segment,
  index,
  total,
  remain,
  answers,
  onChoice,
  onShort,
  onSkip,
}: {
  segment: Segment;
  index: number;
  total: number;
  remain: number;
  answers: Array<number | string | null>;
  onChoice: (question: number, choice: number) => void;
  onShort: (question: number, value: string) => void;
  onSkip: () => void;
}) {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[#8a7568]">
            {index + 1} / {total} · {segment.clock}
          </p>
          <h3 className="text-xl font-semibold">{segment.name}</h3>
        </div>
        <p className="text-3xl font-semibold tabular-nums">{formatClock(remain)}</p>
      </div>
      {segment.kind === "break" ? (
        <div className="mt-6">
          <p className="text-sm leading-6 text-[#4e463f]">
            {segment.name} {segment.minutes}분. 수능 당일에는 이 길이만큼 쉰다. 준비되면 바로 다음으로 간다.
          </p>
          <Button className="mt-4" onClick={onSkip}>
            다음으로
          </Button>
        </div>
      ) : (
        <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
          <p className="mb-3 text-xs leading-5 text-[#6b5c4a]">
            {segment.listeningUntil > 0 ? `1–${segment.listeningUntil}번은 듣기다. ` : ""}
            다섯 칸은 선다형이고, 칸이 없는 번호는 단답이다.
          </p>
          <ol className="grid gap-2">
            {answers.map((value, question) => {
              const number = question + 1;
              const short = segment.shorts.includes(number);
              return (
                <li key={number} className="grid grid-cols-[2.5rem_1fr] items-center gap-2">
                  <span className="text-sm tabular-nums text-[#8a7568]">{number}</span>
                  {short ? (
                    <input
                      inputMode="numeric"
                      maxLength={3}
                      aria-label={`${number}번 단답`}
                      className="h-9 w-24 rounded-md border border-[#d9cbb3] bg-[#fbf6ec] px-2 text-sm tabular-nums"
                      value={typeof value === "string" ? value : ""}
                      onChange={(event) => onShort(question, event.target.value.replace(/\D/g, "").slice(0, 3))}
                    />
                  ) : (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          aria-label={`${number}번 ${choice}`}
                          aria-pressed={value === choice}
                          className={`grid h-8 w-8 place-items-center rounded-full border text-sm ${
                            value === choice ? "border-[#7a2e2a] bg-[#7a2e2a] text-[#f8f1e4]" : "border-[#d9cbb3] bg-[#fbf6ec]"
                          }`}
                          onClick={() => onChoice(question, choice)}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <Button className="my-4" variant="outline" onClick={onSkip}>
            답안 제출
          </Button>
        </div>
      )}
    </div>
  );
}

function Summary({ segments, answers }: { segments: Segment[]; answers: Answers }) {
  const exams = segments.filter((segment) => segment.kind === "exam");
  return (
    <div className="mt-4 overflow-auto">
      <p className="text-sm leading-6 text-[#4e463f]">표기한 칸만 세었다. 채점은 문제지의 정답으로 한다.</p>
      <ul className="mt-3 grid gap-2">
        {exams.map((segment) => (
          <li key={segment.id} className="rounded-md bg-[#efe4cf] px-3 py-2 text-sm">
            {segment.name}
            <span className="mt-0.5 block text-xs text-[#6b5c4a]">
              {filled(answers[segment.id])} / {segment.questions} 표기
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
