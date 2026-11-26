import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import { LINES, PRESETS, SUBJECTS, formatClock, remainingSeconds } from "../study/logic.ts";
import { dispatch, pauseTimer, setSheet, setVow, stand, startTimer, stopTimer, useStudy } from "../study/store.ts";

export function StudySheet() {
  const open = useStudy((state) => state.sheetOpen);
  const state = useStudy((current) => current);
  if (!open) return null;
  const remain = remainingSeconds(state, Date.now());
  const total = Math.max(1, state.segmentSeconds);
  const progress = Math.min(1, Math.max(0, 1 - remain / total));
  const line = LINES[Math.floor(Date.now() / 60_000) % LINES.length] ?? LINES[0];
  const partial = state.mode === "focus" && (state.running || state.pausedRemaining < state.focusSeconds - 1);

  return (
    <aside className="hanji pointer-events-auto fixed inset-x-0 bottom-0 z-40 max-h-[78dvh] overflow-auto rounded-t-3xl border border-[#e6d7bf] p-5 shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[400px] sm:rounded-none sm:border-y-0 sm:border-r-0">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#d9cbb3] sm:hidden" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.28em] text-[#8a6a4a]">선방</p>
          <h2 className="font-serif text-2xl">{state.mode === "focus" ? "집중" : "쉼"}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSheet(false)}>
          접기
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {SUBJECTS.map((subject) => (
          <Button
            key={subject}
            size="sm"
            variant={state.subject === subject ? "default" : "outline"}
            onClick={() => dispatch({ type: "subject", subject })}
          >
            {subject}
          </Button>
        ))}
      </div>
      <Input
        className="mt-3"
        aria-label="과목"
        maxLength={16}
        value={state.subject}
        onChange={(event) => dispatch({ type: "subject", subject: event.target.value })}
      />
      <div className="mt-4 flex gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.id}
            size="sm"
            variant={state.focusSeconds === preset.focus && state.breakSeconds === preset.break ? "default" : "outline"}
            disabled={state.running}
            onClick={() => dispatch({ type: "preset", focus: preset.focus, break: preset.break })}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <p className="mt-6 text-center font-serif text-6xl tabular-nums tracking-tight">{formatClock(remain)}</p>
      <div className="mx-auto mt-3 h-1 w-40 overflow-hidden rounded-full bg-[#e7dcc6]">
        <div className="h-full bg-[#7a2e2a]" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="mt-4 text-center font-serif text-sm text-[#6b5c4a]">{line}</p>
      <div className="mt-5 flex gap-2">
        {state.running ? (
          <Button className="flex-1" onClick={pauseTimer}>
            잠시 멈춘다
          </Button>
        ) : (
          <Button className="flex-1" onClick={startTimer}>
            {state.mode === "focus" ? "공부를 시작한다" : "쉼을 시작한다"}
          </Button>
        )}
        {partial ? (
          <Button variant="outline" onClick={stopTimer}>
            여기까지 기록
          </Button>
        ) : null}
      </div>
      <button type="button" className="mt-5 block w-full text-left text-sm text-[#6b5c4a]" onClick={() => setVow(true)}>
        {state.intention ? `다짐 · ${state.intention}` : "다짐이 아직 비어 있다"}
      </button>
      <label className="mt-4 block text-sm text-[#6b5c4a]" htmlFor="note">
        책상 위 메모
      </label>
      <Textarea
        id="note"
        className="mt-2"
        maxLength={500}
        placeholder="막힌 문제, 다음에 볼 페이지"
        value={state.note}
        onChange={(event) => dispatch({ type: "note", note: event.target.value })}
      />
      {state.seatedId ? (
        <Button className="mt-4 w-full" variant="outline" onClick={stand}>
          일어난다
        </Button>
      ) : (
        <p className="mt-4 text-xs leading-6 text-[#8a7764]">선방 방석에 앉으면 마당이 무릎 높이로 내려앉는다.</p>
      )}
    </aside>
  );
}
