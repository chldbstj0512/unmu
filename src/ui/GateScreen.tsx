import { useState } from "react";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { enterWorld, setIdentity, useStudy } from "../study/store.ts";

const HOURS = [2, 3, 4, 6, 8];

export function GateScreen() {
  const savedVow = useStudy((state) => state.intention);
  const savedGoal = useStudy((state) => state.goalSeconds);
  const savedSchool = useStudy((state) => state.school);
  const savedDepartment = useStudy((state) => state.department);
  const [vow, setVow] = useState(savedVow);
  const [hours, setHours] = useState(Math.round(savedGoal / 3600));
  const [school, setSchool] = useState(savedSchool);
  const [department, setDepartment] = useState(savedDepartment);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center p-3 sm:items-center sm:justify-start sm:p-8 md:p-12">
      <section className="hanji pointer-events-auto max-h-[min(720px,calc(100dvh-1.5rem))] w-full max-w-[440px] overflow-auto rounded-2xl border border-[#e3e0da] p-6 sm:p-8">
        <div>
          <p className="text-xs font-medium text-[#8a7568]">공부 공간</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#241c14]">구름결</h1>
        </div>
        <p className="mt-4 text-sm leading-7 text-[#4e463f]">
          앉은 시간과 배운 것이 겹으로 남아 내 것이 된다.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <label className="block text-sm text-[#6b5c4a]" htmlFor="school">
            목표 학교
            <Input
              id="school"
              className="mt-2"
              maxLength={24}
              value={school}
              placeholder="가고 싶은 학교"
              onChange={(event) => {
                setSchool(event.target.value);
                setIdentity(event.target.value, department);
              }}
            />
          </label>
          <label className="block text-sm text-[#6b5c4a]" htmlFor="department">
            학과
            <Input
              id="department"
              className="mt-2"
              maxLength={16}
              value={department}
              placeholder="학과"
              onChange={(event) => {
                setDepartment(event.target.value);
                setIdentity(school, event.target.value);
              }}
            />
          </label>
        </div>
        <label className="mt-5 block text-sm text-[#6b5c4a]" htmlFor="vow">
          오늘 한 줄
        </label>
        <Input
          id="vow"
          className="mt-2"
          maxLength={40}
          value={vow}
          placeholder="오늘 끝낼 한 단원"
          onChange={(event) => setVow(event.target.value)}
        />
        <p className="mt-5 text-sm text-[#6b5c4a]">오늘 목표</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {HOURS.map((hour) => (
            <Button key={hour} size="sm" variant={hours === hour ? "default" : "outline"} onClick={() => setHours(hour)}>
              {hour}시간
            </Button>
          ))}
        </div>
        <Button className="mt-7 w-full" size="lg" onClick={() => enterWorld(vow, hours, school, department)}>
          들어가기
        </Button>
        <p className="mt-4 text-center text-xs leading-6 text-[#8a7764]">
          학교와 학과는 옆에 따라온다.
          <br />
          책상에 앉으면 타이머가 시작된다. 기록은 이 브라우저에만 남는다.
        </p>
      </section>
    </div>
  );
}
