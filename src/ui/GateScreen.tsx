import { useState } from "react";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { enterWorld, useStudy } from "../study/store.ts";

const HOURS = [2, 3, 4, 6, 8];

export function GateScreen() {
  const savedVow = useStudy((state) => state.intention);
  const savedGoal = useStudy((state) => state.goalSeconds);
  const [vow, setVow] = useState(savedVow);
  const [hours, setHours] = useState(Math.round(savedGoal / 3600));

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center p-3 sm:items-center sm:justify-start sm:p-8 md:p-12">
      <section className="hanji pointer-events-auto max-h-[min(720px,calc(100dvh-1.5rem))] w-full max-w-[440px] overflow-auto rounded-3xl border border-[#e6d7bf] p-6 shadow-[0_24px_80px_rgba(40,24,12,0.35)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#8a6a4a]">산사 공부방</p>
            <h1 className="mt-2 font-serif text-5xl text-[#241c14]">운무암</h1>
            <p className="mt-1 font-serif text-sm tracking-[0.4em] text-[#7a2e2a]">雲霧庵</p>
          </div>
          <div className="seal-mark" aria-hidden>
            운무
          </div>
        </div>
        <p className="mt-6 text-base leading-8 text-[#3d3228]">
          수험생의 산사. 안개가 걷히기 전에, 오늘의 분량을 마당에 내려놓으러 왔다.
        </p>
        <label className="mt-6 block text-sm text-[#6b5c4a]" htmlFor="vow">
          오늘의 다짐
        </label>
        <Input
          id="vow"
          className="mt-2"
          maxLength={40}
          value={vow}
          placeholder="한 단원만 정직하게"
          onChange={(event) => setVow(event.target.value)}
        />
        <p className="mt-5 text-sm text-[#6b5c4a]">오늘의 양</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {HOURS.map((hour) => (
            <Button key={hour} size="sm" variant={hours === hour ? "default" : "outline"} onClick={() => setHours(hour)}>
              {hour}시간
            </Button>
          ))}
        </div>
        <Button className="mt-7 w-full" size="lg" onClick={() => enterWorld(vow, hours)}>
          마당으로 들어간다
        </Button>
        <p className="mt-4 text-center text-xs leading-6 text-[#8a7764]">
          선방 방석에 앉으면 공부가 시작된다.
          <br />
          기록은 이 브라우저에만 남는다.
        </p>
      </section>
    </div>
  );
}
