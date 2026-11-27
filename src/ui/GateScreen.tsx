import { useState, type ReactNode } from "react";
import { addTask, logout, practiceLogin, saveProfile, setGrasp, toggleTask, useAccount } from "../account/client.ts";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { SUBJECTS } from "../study/logic.ts";
import { enterWorld, setIdentity, useStudy } from "../study/store.ts";

const HOURS = [2, 3, 4, 6, 8];
const GRASP = ["아직", "들어 봄", "풀 수 있음", "설명 가능"];

export function GateScreen() {
  const account = useAccount();
  const savedVow = useStudy((state) => state.intention);
  const savedGoal = useStudy((state) => state.goalSeconds);
  const savedSchool = useStudy((state) => state.school);
  const savedDepartment = useStudy((state) => state.department);
  const [vow, setVow] = useState(savedVow);
  const [hours, setHours] = useState(Math.round(savedGoal / 3600) || 4);
  const [school, setSchool] = useState(savedSchool);
  const [department, setDepartment] = useState(savedDepartment);
  const [task, setTask] = useState("");
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>("수학");
  const [synced, setSynced] = useState("");
  const failed = new URLSearchParams(window.location.search).get("auth") === "fail";
  if (account.user && account.user.id !== synced) {
    setSynced(account.user.id);
    setSchool(account.user.school);
    setDepartment(account.user.department);
    setVow(account.user.intention);
    setHours(Math.round(account.user.goalSeconds / 3600) || 4);
  }

  if (!account.ready) {
    return (
      <Shell>
        <p className="text-sm leading-7 text-[#4e463f]">문을 확인하고 있다.</p>
      </Shell>
    );
  }

  if (!account.user) {
    return (
      <Shell>
        <p className="mt-4 text-sm leading-7 text-[#4e463f]">휴대폰에서는 내 계정으로 들어간다. 광장과 개인 책상은 이 계정에 남는다.</p>
        {failed ? <p className="mt-4 text-sm text-[#7a2e2a]">카카오 로그인이 끝나지 않았다. 다시 누르거나 연습으로 들어간다.</p> : null}
        {account.kakao ? (
          <Button className="mt-6 w-full bg-[#FEE500] text-[#191919] hover:bg-[#f2d900]" size="lg" onClick={() => { window.location.href = "/api/auth/kakao"; }}>
            카카오로 시작
          </Button>
        ) : (
          <p className="mt-6 rounded-md bg-[#efe4cf] px-3 py-3 text-sm leading-6 text-[#6b5c4a]">카카오 키를 넣으면 카카오 로그인이 열린다. 그 전에는 연습 입장으로 같은 책상을 쓴다.</p>
        )}
        <Button className="mt-3 w-full" size="lg" variant={account.kakao ? "outline" : "default"} onClick={() => void practiceLogin()}>
          연습으로 들어가기
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="mt-4 text-sm leading-7 text-[#4e463f]">
        {account.user.nickname}의 책상이다. {account.user.kakao ? "카카오 계정" : "연습 계정"}으로 열려 있다.
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
      <Input id="vow" className="mt-2" maxLength={40} value={vow} placeholder="오늘 끝낼 한 단원" onChange={(event) => setVow(event.target.value)} />
      <p className="mt-5 text-sm text-[#6b5c4a]">오늘 목표</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {HOURS.map((hour) => (
          <Button key={hour} size="sm" variant={hours === hour ? "default" : "outline"} onClick={() => setHours(hour)}>
            {hour}시간
          </Button>
        ))}
      </div>
      <p className="mt-5 text-sm text-[#6b5c4a]">오늘 할 일</p>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const title = task.trim();
          if (!title) return;
          void addTask(title, subject);
          setTask("");
        }}
      >
        <select
          className="h-10 rounded-md border border-[#d9cbb3] bg-white px-2 text-sm"
          aria-label="과목"
          value={subject}
          onChange={(event) => setSubject(event.target.value as (typeof SUBJECTS)[number])}
        >
          {SUBJECTS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <Input value={task} maxLength={40} placeholder="이어서 할 것" onChange={(event) => setTask(event.target.value)} />
        <Button type="submit" variant="outline">
          넣기
        </Button>
      </form>
      {account.error ? <p className="mt-2 text-sm text-[#7a2e2a]">{account.error}</p> : null}
      <ul className="mt-3 space-y-1">
        {account.tasks.length === 0 ? <li className="text-sm text-[#8a7764]">아직 적힌 할 일이 없다.</li> : null}
        {account.tasks.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-[#efe4cf]"
              onClick={() => void toggleTask(item.id, !item.done)}
            >
              <span className="grid h-4 w-4 place-items-center rounded-sm border border-[#7a2e2a] text-[10px] text-[#7a2e2a]">{item.done ? "✓" : ""}</span>
              <span className={item.done ? "text-[#8a7764] line-through" : ""}>
                {item.subject} · {item.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-[#6b5c4a]">과목별 이해도</p>
      <ul className="mt-2 space-y-2">
        {SUBJECTS.map((item) => (
          <li key={item} className="flex items-center justify-between gap-3 text-sm">
            <span>{item}</span>
            <span className="flex gap-1">
              {GRASP.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={`rounded-md px-2 py-1 text-xs ${account.grasp[item] === index ? "bg-[#7a2e2a] text-[#f8f1e4]" : "bg-[#efe4cf] text-[#6b5c4a]"}`}
                  onClick={() => void setGrasp(item, index)}
                >
                  {label}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-7 w-full"
        size="lg"
        onClick={() => {
          void saveProfile({ school, department, intention: vow, goalHours: hours });
          enterWorld(vow, hours, school, department);
        }}
      >
        내 공간으로
      </Button>
      <button type="button" className="mt-4 w-full text-center text-xs text-[#8a7764] underline-offset-4 hover:underline" onClick={() => void logout()}>
        로그아웃
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center p-3 sm:items-center sm:justify-start sm:p-8 md:p-12">
      <section className="hanji pointer-events-auto max-h-[min(720px,calc(100dvh-1.5rem))] w-full max-w-[440px] overflow-auto rounded-2xl border border-[#e3e0da] p-6 sm:p-8">
        <div>
          <p className="text-xs font-medium text-[#8a7568]">나의 공부 공간</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#241c14]">운무암</h1>
        </div>
        {children}
      </section>
    </div>
  );
}
