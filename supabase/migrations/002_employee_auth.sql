alter table public.qwiz_employees
  add column if not exists access_code_hash text,
  add column if not exists access_code_set_at timestamptz,
  add column if not exists last_login_at timestamptz;

create unique index if not exists qwiz_employees_access_code_hash_idx
on public.qwiz_employees(access_code_hash)
where access_code_hash is not null;

create table if not exists public.qwiz_employee_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null references public.qwiz_employees(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists qwiz_employee_sessions_employee_id_idx
on public.qwiz_employee_sessions(employee_id);

create index if not exists qwiz_employee_sessions_expires_at_idx
on public.qwiz_employee_sessions(expires_at);

alter table public.qwiz_employee_sessions enable row level security;

grant all privileges on table public.qwiz_employee_sessions to service_role;
grant all privileges on all sequences in schema public to service_role;
