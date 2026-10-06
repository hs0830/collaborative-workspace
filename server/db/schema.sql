-- 협업 워크스페이스 DB 스키마 (Supabase / PostgreSQL)
-- 서버가 시작할 때 자동으로 실행되므로 직접 실행할 필요는 없습니다.
-- (Supabase SQL Editor 에 붙여넣어 미리 만들어도 됩니다)

create table if not exists members (
  id          text primary key,
  name        text not null,
  role        text not null default '',
  email       text not null default '',
  color       text not null default '#2563eb',
  created_at  timestamptz not null default now()
);
create unique index if not exists members_name_lower on members (lower(name));

create table if not exists kanban_columns (
  id        text primary key,
  label     text not null,
  color     text not null default 'gray',
  position  integer not null default 0
);

create table if not exists kanban_tasks (
  id          text primary key,
  title       text not null,
  assignee    text not null default '미지정',
  tag         text not null default '기타',
  status_id   text not null,
  due_date    text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists calendar_events (
  id          text primary key,
  title       text not null,
  date        text not null,
  assignee    text not null default '미지정',
  created_at  timestamptz not null default now()
);

create table if not exists files (
  id             text primary key,
  kind           text not null,             -- 'dataset' | 'chat'
  storage_key    text not null,
  name           text not null,
  size           bigint not null default 0,
  content_type   text not null default 'application/octet-stream',
  uploader_id    text,
  uploader_name  text not null default '',
  status         text not null default 'pending', -- 'pending' | 'ready'
  created_at     timestamptz not null default now()
);

create table if not exists chat_messages (
  id          text primary key,
  sender_id   text not null,
  text        text not null default '',
  file_id     text references files(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_created on chat_messages (created_at desc);

-- 실시간 문서(Yjs) 내용
create table if not exists yjs_documents (
  name        text primary key,
  state       bytea not null,
  updated_at  timestamptz not null default now()
);

-- Supabase 는 public 스키마 테이블을 자동 REST API 로도 열어 둡니다.
-- RLS 를 켜고 정책을 만들지 않으면 그 경로는 전부 막히고, 이 서버(테이블 소유자 postgres 계정)만 접근합니다.
alter table members          enable row level security;
alter table kanban_columns   enable row level security;
alter table kanban_tasks     enable row level security;
alter table calendar_events  enable row level security;
alter table files            enable row level security;
alter table chat_messages    enable row level security;
alter table yjs_documents    enable row level security;

-- 회의록 (본문은 yjs_documents 에 'yjs/meeting-<id>' 이름으로 저장)
create table if not exists meetings (
  id          text primary key,
  title       text not null,
  date        text not null,
  attendees   text not null default '[]',   -- 참석자 이름 JSON 배열
  created_by  text not null default '',
  preview     text not null default '',     -- 목록·검색용 본문 앞부분
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table meetings enable row level security;

-- 칸반 카드 완료 시각 (작업 기록용)
alter table kanban_tasks add column if not exists completed_at timestamptz;

-- 개인 작업물 (작업 기록 페이지)
create table if not exists works (
  id           text primary key,
  owner_id     text not null,
  title        text not null,
  description  text not null default '',
  category     text not null default '기타',
  visibility   text not null default 'team',   -- 'team' | 'private'
  file_id      text references files(id) on delete set null,
  link_url     text not null default '',
  task_id      text,                            -- 연결된 칸반 카드
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists works_owner on works (owner_id);
alter table works enable row level security;

-- 작업물 구분: 개인 작업물 / 팀 작업물(참여자와 역할 기록)
alter table works add column if not exists section text not null default 'personal';   -- 'personal' | 'team'
alter table works add column if not exists contributors text not null default '[]';    -- [{"name": "...", "role": "..."}]
