create table if not exists public.qwiz_quiz_schedule (
  date_key date primary key,
  quiz_id text not null references public.qwiz_quizzes(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists qwiz_quiz_schedule_quiz_id_idx
on public.qwiz_quiz_schedule(quiz_id);

alter table public.qwiz_quiz_schedule enable row level security;

grant all privileges on table public.qwiz_quiz_schedule to service_role;
grant all privileges on all sequences in schema public to service_role;
