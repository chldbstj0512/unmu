import { useEffect, useState } from "react";
import { Button } from "../components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/ui/dialog.tsx";
import { Input } from "../components/ui/input.tsx";
import { formatSpan, sessionsByDay, weekTotals } from "../study/logic.ts";
import { dispatch, setBreath, setHelp, setRecord, setVow, travelTo, useStudy } from "../study/store.ts";
import { SPOTS } from "../world/layout.ts";

export function RecordDialog() {
  const open = useStudy((state) => state.recordOpen);
  const sessions = useStudy((state) => state.sessions);
  const goal = useStudy((state) => state.goalSeconds);
  const [confirm, setConfirm] = useState(false);
  const now = Date.now();
  const days = sessionsByDay(sessions, now);
  const week = weekTotals(sessions, now);
  const max = Math.max(1, ...week.map((day) => day.seconds));
  const today = week.at(-1)?.seconds ?? 0;

  return (
    <Dialog open={open} onOpenChange={setRecord}>
      <DialogContent>
        <DialogTitle className="text-2xl font-semibold tracking-tight">공부 기록</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-[#6b5c4a]">이 브라우저에만 남는다. 오늘은 {formatSpan(today)} / {formatSpan(goal)}.</DialogDescription>
        <div className="mt-5 flex h-24 items-end gap-2">
          {week.map((day) => (
            <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end rounded-sm bg-[#efe4cf]">
                <div className="w-full rounded-sm bg-[#7a2e2a]" style={{ height: `${Math.max(4, (day.seconds / max) * 100)}%` }} />
              </div>
              <span className="text-[10px] text-[#6b5c4a]">{day.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 max-h-64 space-y-4 overflow-auto pr-1">
          {days.length === 0 ? <p className="text-sm leading-7 text-[#6b5c4a]">오늘 기록이 아직 없다. 책상에 앉으면 남는다.</p> : null}
          {days.map((day) => (
            <section key={day.key}>
              <h3 className="font-serif text-sm">
                {day.label} · {formatSpan(day.seconds)}
              </h3>
              <ul className="mt-1 space-y-1 text-sm">
                {day.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 border-b border-[#eadfcd] py-1">
                    <span>
                      {item.subject}
                      {item.note ? <span className="mt-0.5 block text-xs text-[#6b5c4a]">{item.note}</span> : null}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatSpan(item.seconds)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-4">
          {confirm ? (
            <Button
              variant="outline"
              onClick={() => {
                dispatch({ type: "clear" });
                setConfirm(false);
              }}
            >
              정말 지운다
            </Button>
          ) : (
            <button type="button" className="text-xs text-[#8a7764] underline-offset-4 hover:underline" onClick={() => setConfirm(true)}>
              기록 지우기
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VowDialog() {
  const open = useStudy((state) => state.vowOpen);
  const intention = useStudy((state) => state.intention);
  return (
    <Dialog open={open} onOpenChange={setVow}>
      <DialogContent>
        <DialogTitle className="text-2xl font-semibold tracking-tight">오늘 한 줄</DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-7 text-[#6b5c4a]">
          책상에도 같은 문장이 남는다.
        </DialogDescription>
        <Input
          className="mt-5"
          maxLength={40}
          value={intention}
          placeholder="오늘 끝낼 한 단원"
          onChange={(event) => dispatch({ type: "intention", intention: event.target.value })}
        />
        <Button className="mt-4" onClick={() => setVow(false)}>
          둔다
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function HelpDialog() {
  const open = useStudy((state) => state.helpOpen);
  return (
    <Dialog open={open} onOpenChange={setHelp}>
      <DialogContent>
        <DialogTitle className="text-2xl font-semibold tracking-tight">안내</DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-7 text-[#3d3228]">
          걷기 WASD 또는 화살표. Shift는 천천히. 마당을 누른 채 마우스를 좌우로 끌면 시야가 돌아간다. Esc로 손을 놓는다.
          방석 앞에서 E, 또는 글을 누르면 앉는다. 걸을 때 카메라는 어깨 뒤 위에 있고, 마우스를 끌면 주위를 돈다. 지도의 번호나 숫자 1부터 8까지 장소를 옮긴다. 광장 나무 아래에는 하루에 돌 하나를 얹고, 광장 동쪽 시험장에서 수능 모의고사를 푼다.
        </DialogDescription>
        <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {SPOTS.filter((spot) => spot.key).map((spot) => (
            <li key={spot.id} className="rounded-md bg-[#efe4cf] px-3 py-2">
              {spot.key} {spot.name}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-7 text-[#6b5c4a]">
          하늘은 한국 시각을 따른다. 오른쪽 위에서 비와 소리를 고른다. 집중하는 동안 바람 소리는 낮아진다. 종은 한 덩이가 끝날 때 울린다.
          좁은 화면에서는 왼쪽 스틱으로 걷고, 오른쪽을 끌어 둘러본다.
        </p>
      </DialogContent>
    </Dialog>
  );
}

const PHASES = ["들숨", "멈추기", "날숨", "비우기"] as const;
const PHASE_MS = 4000;

export function BreathOverlay() {
  const open = useStudy((state) => state.breathOpen);
  const [now, setNow] = useState(() => Date.now());
  const [started, setStarted] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const origin = Date.now();
    setStarted(origin);
    setNow(origin);
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [open]);
  if (!open) return null;
  const elapsed = now - started;
  const step = Math.floor(elapsed / PHASE_MS);
  const done = step >= PHASES.length * 4;
  const phase = PHASES[step % PHASES.length] ?? "들숨";
  const round = Math.min(4, Math.floor(step / PHASES.length) + 1);
  const wide = phase === "들숨" || phase === "멈추기";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const study = SPOTS.find((spot) => spot.id === "study");

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#1a140f]/45 p-6" role="dialog" aria-modal="true" aria-labelledby="breath-title">
      <div className="hanji w-full max-w-sm rounded-3xl px-6 py-8 text-center">
        <p id="breath-title" className="text-xs tracking-[0.3em] text-[#8a6a4a]">
          다실
        </p>
        <div
          className="mx-auto mt-6 grid h-40 w-40 place-items-center rounded-full border border-[#7a2e2a]/40"
          style={{ transform: reduced ? undefined : `scale(${done ? 1 : wide ? 1 : 0.72})`, transition: "transform 3.6s ease" }}
        >
          <span className="text-3xl font-medium">{done ? "끝" : phase}</span>
        </div>
        <p className="mt-4 text-sm text-[#6b5c4a]">{done ? "숨이 자리로 돌아왔다." : `${round} / 4`}</p>
        <div className="mt-6 flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => {
              setBreath(false);
              if (study) travelTo(study);
            }}
          >
            선방으로
          </Button>
          <Button className="flex-1" onClick={() => setBreath(false)}>
            그대로
          </Button>
        </div>
      </div>
    </div>
  );
}
