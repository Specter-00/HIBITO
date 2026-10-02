-- HIBITO のデータベース（Supabase の SQL Editor に貼り付けて「Run」）

create extension if not exists pgcrypto;

-- タスク
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  done boolean not null default false,
  due date,
  priority text not null default 'normal' check (priority in ('high', 'normal', 'low')),
  category text not null default 'school' check (category in ('school', 'dev', 'side', 'life')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

-- HIBITOが覚えていること（好み・決めたこと・目標）
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'note' check (kind in ('preference', 'decision', 'goal', 'note')),
  content text not null,
  created_at timestamptz not null default now()
);

-- 時間割（1=月〜5=金 / 何時間目）
create table if not exists timetable (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 1 and 6),
  period smallint not null check (period between 1 and 8),
  subject text not null,
  memo text,
  unique (weekday, period)
);

-- 会話履歴
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_created_at_idx on messages (created_at desc);

-- 1日1回だけ作るもの（今日は何の日・ひとこと）のキャッシュ
create table if not exists daily_cache (
  date date primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- 安全対策：ブラウザからの直接アクセスは全部禁止（サーバーだけが service_role キーで読み書きする）
alter table tasks enable row level security;
alter table memories enable row level security;
alter table timetable enable row level security;
alter table messages enable row level security;
alter table daily_cache enable row level security;
