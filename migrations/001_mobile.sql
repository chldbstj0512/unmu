-- 모바일 계정의 데이터 구조.
-- 사람(users) 아래에 자습 할 일, 시간 기록, 과목 이해도, 돌탑, 모의고사 코드와 응시, 책상 초대가 매달린다.
-- 카카오 회원은 kakao_id, 연습 입장은 device_key. 둘 중 하나는 반드시 있다.

create table users (
  id uuid primary key default gen_random_uuid(),
  kakao_id text unique,
  device_key text unique,
  nickname text not null default '',
  email text not null default '',
  profile_image text not null default '',
  school text not null default '',
  department text not null default '',
  intention text not null default '',
  goal_seconds integer not null default 14400,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_identity check (kakao_id is not null or device_key is not null)
);

create table sessions (
  token text primary key,
  user_id uuid not null references users (id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sessions_user on sessions (user_id);

create table study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  title text not null,
  subject text not null default '공부',
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index study_tasks_user on study_tasks (user_id, done, position);

create table study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  client_key text not null,
  subject text not null,
  seconds integer not null,
  note text not null default '',
  logged_at timestamptz not null,
  unique (user_id, client_key)
);

create index study_logs_user on study_logs (user_id, logged_at);

create table curriculum (
  user_id uuid not null references users (id),
  subject text not null,
  grasp integer not null default 0 check (grasp between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (user_id, subject)
);

create table exam_papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  price_krw integer not null default 0,
  unique (title, subject)
);

create table exam_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  paper_id uuid not null references exam_papers (id),
  code text not null unique,
  issued_at timestamptz not null default now(),
  used_at timestamptz
);

create table exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  code_id uuid references exam_codes (id),
  paper_title text not null,
  subject text not null,
  marked_count integer not null default 0,
  answers jsonb not null default '{}'::jsonb,
  taken_at timestamptz not null default now()
);

create index exam_attempts_user on exam_attempts (user_id, taken_at);

create table desk_guests (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references users (id),
  guest_id uuid not null references users (id),
  status text not null default 'invited' check (status in ('invited', 'in')),
  created_at timestamptz not null default now(),
  unique (host_id, guest_id),
  constraint desk_not_self check (host_id <> guest_id)
);

create table cairn_days (
  user_id uuid not null references users (id),
  seoul_day text not null,
  primary key (user_id, seoul_day)
);
