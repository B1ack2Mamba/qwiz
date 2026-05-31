create or replace function public.qwiz_adjust_points(
  p_employee_id text,
  p_amount integer,
  p_reason text,
  p_include_weekly boolean default true
)
returns table (
  total_points integer,
  weekly_points integer,
  transaction_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_total integer;
  v_current_weekly integer;
  v_new_total integer;
  v_new_weekly integer;
begin
  if p_amount = 0 then
    raise exception 'amount must not be zero' using errcode = '22023';
  end if;

  select employee.total_points, employee.weekly_points
  into v_current_total, v_current_weekly
  from public.qwiz_employees as employee
  where employee.id = p_employee_id and employee.is_active = true
  for update;

  if not found then
    raise exception 'employee not found' using errcode = 'P0002';
  end if;

  v_new_total := v_current_total + p_amount;
  v_new_weekly := v_current_weekly + case when p_include_weekly then p_amount else 0 end;

  if v_new_total < 0 or v_new_weekly < 0 then
    raise exception 'points cannot be negative' using errcode = '22023';
  end if;

  update public.qwiz_employees
  set
    total_points = v_new_total,
    weekly_points = v_new_weekly,
    updated_at = now()
  where id = p_employee_id;

  insert into public.qwiz_point_transactions (
    employee_id,
    amount,
    reason,
    source_type
  )
  values (
    p_employee_id,
    p_amount,
    coalesce(nullif(trim(p_reason), ''), 'admin_adjustment'),
    'admin_adjustment'
  )
  returning id into transaction_id;

  total_points := v_new_total;
  weekly_points := v_new_weekly;
  return next;
end;
$$;

grant execute on function public.qwiz_adjust_points(text, integer, text, boolean) to service_role;
