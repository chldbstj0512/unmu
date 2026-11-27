export const KOR_CHOICES = ["화법과 작문", "언어와 매체"] as const;
export const MATH_CHOICES = ["확률과 통계", "미적분", "기하"] as const;
export const INQUIRY = [
  "생활과 윤리",
  "윤리와 사상",
  "한국지리",
  "세계지리",
  "동아시아사",
  "세계사",
  "경제",
  "정치와 법",
  "사회·문화",
  "물리학Ⅰ",
  "화학Ⅰ",
  "생명과학Ⅰ",
  "지구과학Ⅰ",
  "물리학Ⅱ",
  "화학Ⅱ",
  "생명과학Ⅱ",
  "지구과학Ⅱ",
] as const;
export const SECOND_LANG = ["독일어", "프랑스어", "스페인어", "중국어", "일본어", "러시아어", "아랍어", "베트남어", "한문"] as const;

export type ExamKind = "exam" | "break";

export type Segment = {
  id: string;
  kind: ExamKind;
  period: string;
  name: string;
  clock: string;
  minutes: number;
  questions: number;
  shorts: number[];
  listeningUntil: number;
};

export type ExamPlan = {
  kor: (typeof KOR_CHOICES)[number];
  math: (typeof MATH_CHOICES)[number];
  inquiry: [(typeof INQUIRY)[number], (typeof INQUIRY)[number]];
  second: (typeof SECOND_LANG)[number] | null;
};

function range(from: number, to: number) {
  const out: number[] = [];
  for (let n = from; n <= to; n += 1) out.push(n);
  return out;
}

function exam(id: string, period: string, name: string, clock: string, minutes: number, questions: number, shorts: number[] = [], listeningUntil = 0): Segment {
  return { id, kind: "exam", period, name, clock, minutes, questions, shorts, listeningUntil };
}

function pause(id: string, name: string, clock: string, minutes: number): Segment {
  return { id, kind: "break", period: "쉼", name, clock, minutes, questions: 0, shorts: [], listeningUntil: 0 };
}

export function buildDay(plan: ExamPlan, only?: string): Segment[] {
  const mathShorts = [...range(16, 22), 29, 30];
  const day: Segment[] = [
    exam("kor", "1교시", `국어 · ${plan.kor}`, "08:40–10:00", 80, 45),
    pause("rest-kor", "휴식", "10:00–10:30", 30),
    exam("math", "2교시", `수학 · ${plan.math}`, "10:30–12:10", 100, 30, mathShorts),
    pause("lunch", "점심", "12:10–13:10", 60),
    exam("eng", "3교시", "영어", "13:10–14:20", 70, 45, [], 17),
    pause("rest-eng", "휴식", "14:20–14:50", 30),
    exam("hist", "4교시", "한국사", "14:50–15:20", 30, 20),
    pause("hand-1", "탐구 문제지", "15:20–15:35", 15),
    exam("inq-1", "4교시", `탐구 · ${plan.inquiry[0]}`, "15:35–16:05", 30, 20),
    pause("swap", "문제지 교체", "16:05–16:07", 2),
    exam("inq-2", "4교시", `탐구 · ${plan.inquiry[1]}`, "16:07–16:37", 30, 20),
  ];
  if (plan.second) {
    day.push(pause("rest-2", "휴식", "16:37–17:05", 28));
    day.push(exam("second", "5교시", plan.second, "17:05–17:45", 40, 30));
  }
  if (!only) return day;
  const one = day.find((item) => item.id === only && item.kind === "exam");
  return one ? [one] : day;
}

export function marks(segment: Segment): string {
  if (segment.kind === "break") return `${segment.minutes}분`;
  const parts = [`${segment.questions}문항`, `${segment.minutes}분`];
  if (segment.listeningUntil > 0) parts.push(`듣기 1–${segment.listeningUntil}`);
  if (segment.shorts.length > 0) parts.push(`단답 ${segment.shorts.length}`);
  return parts.join(" · ");
}
