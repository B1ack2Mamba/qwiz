create extension if not exists pgcrypto;

create table if not exists public.qwiz_employees (
  id text primary key,
  full_name text not null,
  role text not null,
  avatar text not null,
  total_points integer not null default 0 check (total_points >= 0),
  weekly_points integer not null default 0 check (weekly_points >= 0),
  streak integer not null default 0 check (streak >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qwiz_quizzes (
  id text primary key,
  title text not null,
  category text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qwiz_questions (
  id bigserial primary key,
  quiz_id text not null references public.qwiz_quizzes(id) on delete cascade,
  sort_order integer not null,
  prompt text not null,
  options jsonb not null,
  correct_index integer not null check (correct_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, sort_order)
);

create table if not exists public.qwiz_daily_attempts (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null references public.qwiz_employees(id) on delete cascade,
  quiz_id text not null references public.qwiz_quizzes(id) on delete restrict,
  date_key date not null,
  score integer not null check (score >= 0),
  correct_count integer not null check (correct_count >= 0),
  accuracy integer not null check (accuracy >= 0 and accuracy <= 100),
  answers jsonb not null,
  streak_after integer not null check (streak_after >= 0),
  created_at timestamptz not null default now(),
  unique (employee_id, date_key)
);

create table if not exists public.qwiz_point_transactions (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null references public.qwiz_employees(id) on delete cascade,
  amount integer not null,
  reason text not null,
  source_type text not null,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.qwiz_prizes (
  place integer primary key check (place > 0),
  title text not null,
  detail text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.qwiz_weekly_awards (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  winners jsonb not null,
  created_at timestamptz not null default now()
);

insert into public.qwiz_employees (id, full_name, role, avatar, total_points, weekly_points, streak)
values
  ('an', 'Аида Новикова', 'Продажи', 'АН', 620, 164, 6),
  ('mk', 'Марк Ким', 'Поддержка', 'МК', 590, 142, 4),
  ('es', 'Елена Смирнова', 'Операции', 'ЕС', 545, 136, 5),
  ('dr', 'Даниил Романов', 'Маркетинг', 'ДР', 488, 118, 3),
  ('vp', 'Виктория Павлова', 'HR', 'ВП', 430, 96, 2),
  ('it', 'Илья Тарасов', 'IT', 'ИТ', 394, 82, 1)
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  avatar = excluded.avatar,
  updated_at = now();

insert into public.qwiz_prizes (place, title, detail)
values
  (1, 'Премия 3 000 ₽', 'Для лидера недельного рейтинга'),
  (2, 'Сертификат 2 000 ₽', 'Для второго места'),
  (3, 'Дополнительный выходной слот', 'Для третьего места')
on conflict (place) do update set
  title = excluded.title,
  detail = excluded.detail,
  updated_at = now();

insert into public.qwiz_quizzes (id, title, category)
values
  ('service', 'Культура сервиса', 'Клиенты'),
  ('security', 'Безопасность данных', 'Процессы'),
  ('collaboration', 'Командная работа', 'Коммуникация')
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  updated_at = now();

insert into public.qwiz_questions (quiz_id, sort_order, prompt, options, correct_index)
values
  ('service', 1, 'Что лучше всего делать после сложного обращения клиента?', '["Закрыть тикет сразу после ответа","Зафиксировать причину, решение и следующий шаг","Перенаправить клиента без комментария","Подождать повторного обращения"]'::jsonb, 1),
  ('service', 2, 'Какой ответ помогает снизить напряжение в переписке?', '["Короткое отрицание","Обещание без срока","Признание проблемы и конкретный срок","Ссылка на общий регламент"]'::jsonb, 2),
  ('service', 3, 'Что считается хорошей метрикой качества сервиса?', '["Только количество закрытых обращений","Скорость без оценки клиента","Решение с первого контакта и удовлетворенность","Количество сообщений в чате"]'::jsonb, 2),
  ('service', 4, 'Когда стоит передавать обращение коллегам?', '["Когда нужен владелец процесса или специальные права","Когда вопрос кажется скучным","После первого сообщения клиента","Только в конце недели"]'::jsonb, 0),
  ('service', 5, 'Что важнее всего в финальном сообщении клиенту?', '["Краткий итог решения","Длинная история переписки","Внутренние причины сбоя","Оценка работы других команд"]'::jsonb, 0),
  ('security', 1, 'Что нужно сделать при подозрительном письме с вложением?', '["Открыть вложение на телефоне","Переслать всем в команде","Сообщить ответственным и не открывать файл","Удалить письмо без фиксации"]'::jsonb, 2),
  ('security', 2, 'Где безопаснее хранить рабочие пароли?', '["В корпоративном менеджере паролей","В заметках на рабочем столе","В личном мессенджере","В общем документе отдела"]'::jsonb, 0),
  ('security', 3, 'Что делать перед отправкой отчета внешнему адресату?', '["Проверить получателя и состав данных","Отправить быстрее, потом уточнить","Добавить всех коллег в копию","Убрать тему письма"]'::jsonb, 0),
  ('security', 4, 'Какая практика снижает риск доступа к данным?', '["Единый пароль для всех систем","Доступ по роли и регулярная ревизия","Передача логина сменщику","Хранение выгрузок без срока"]'::jsonb, 1),
  ('security', 5, 'Как поступить с найденной уязвимостью в процессе?', '["Обсудить в открытом чате","Использовать как обходной путь","Передать по внутреннему каналу безопасности","Подождать следующего аудита"]'::jsonb, 2),
  ('collaboration', 1, 'Что делает задачу понятной для исполнителя?', '["Контекст, результат и срок","Только срочность","Большое количество ссылок","Устное упоминание без записи"]'::jsonb, 0),
  ('collaboration', 2, 'Как лучше начать встречу по проблемному проекту?', '["С фактов, цели встречи и ограничений","С поиска виноватого","С обсуждения всех прошлых ошибок","С переноса встречи"]'::jsonb, 0),
  ('collaboration', 3, 'Какой формат статуса наиболее полезен?', '["Все нормально","Пока не знаю","Сделано, риск, следующий шаг","Вернусь позже"]'::jsonb, 2),
  ('collaboration', 4, 'Что помогает не терять решения после созвона?', '["Короткое резюме с владельцами действий","Надежда на память участников","Еще один созвон без повестки","Длинная запись без итогов"]'::jsonb, 0),
  ('collaboration', 5, 'Когда стоит эскалировать риск?', '["Когда уже сорван срок","Когда риск влияет на срок, бюджет или клиента","Только после нескольких напоминаний","Никогда, если команда занята"]'::jsonb, 1)
on conflict (quiz_id, sort_order) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  updated_at = now();

create or replace function public.qwiz_record_attempt(
  p_employee_id text,
  p_quiz_id text,
  p_date_key date,
  p_score integer,
  p_correct_count integer,
  p_accuracy integer,
  p_answers jsonb,
  p_streak_after integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
begin
  insert into public.qwiz_daily_attempts (
    employee_id,
    quiz_id,
    date_key,
    score,
    correct_count,
    accuracy,
    answers,
    streak_after
  )
  values (
    p_employee_id,
    p_quiz_id,
    p_date_key,
    p_score,
    p_correct_count,
    p_accuracy,
    p_answers,
    p_streak_after
  )
  returning id into v_attempt_id;

  insert into public.qwiz_point_transactions (
    employee_id,
    amount,
    reason,
    source_type,
    source_id
  )
  values (
    p_employee_id,
    p_score,
    'daily_quiz',
    'qwiz_daily_attempt',
    v_attempt_id
  );

  update public.qwiz_employees
  set
    total_points = total_points + p_score,
    weekly_points = weekly_points + p_score,
    streak = p_streak_after,
    updated_at = now()
  where id = p_employee_id;

  return v_attempt_id;
end;
$$;

create or replace view public.qwiz_weekly_leaderboard as
select
  id,
  full_name,
  role,
  avatar,
  total_points,
  weekly_points,
  streak,
  dense_rank() over (order by weekly_points desc, total_points desc) as rank
from public.qwiz_employees
where is_active = true;

alter table public.qwiz_employees enable row level security;
alter table public.qwiz_quizzes enable row level security;
alter table public.qwiz_questions enable row level security;
alter table public.qwiz_daily_attempts enable row level security;
alter table public.qwiz_point_transactions enable row level security;
alter table public.qwiz_prizes enable row level security;
alter table public.qwiz_weekly_awards enable row level security;

drop policy if exists "qwiz authenticated read employees" on public.qwiz_employees;
create policy "qwiz authenticated read employees"
on public.qwiz_employees for select
to authenticated
using (true);

drop policy if exists "qwiz authenticated read quizzes" on public.qwiz_quizzes;
create policy "qwiz authenticated read quizzes"
on public.qwiz_quizzes for select
to authenticated
using (true);

drop policy if exists "qwiz authenticated read questions" on public.qwiz_questions;
create policy "qwiz authenticated read questions"
on public.qwiz_questions for select
to authenticated
using (true);

drop policy if exists "qwiz authenticated read prizes" on public.qwiz_prizes;
create policy "qwiz authenticated read prizes"
on public.qwiz_prizes for select
to authenticated
using (true);

drop policy if exists "qwiz authenticated read weekly awards" on public.qwiz_weekly_awards;
create policy "qwiz authenticated read weekly awards"
on public.qwiz_weekly_awards for select
to authenticated
using (true);

grant execute on function public.qwiz_record_attempt(text, text, date, integer, integer, integer, jsonb, integer) to service_role;
grant select on public.qwiz_weekly_leaderboard to authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all privileges on table
  public.qwiz_employees,
  public.qwiz_quizzes,
  public.qwiz_questions,
  public.qwiz_daily_attempts,
  public.qwiz_point_transactions,
  public.qwiz_prizes,
  public.qwiz_weekly_awards
to service_role;
grant all privileges on all sequences in schema public to service_role;
