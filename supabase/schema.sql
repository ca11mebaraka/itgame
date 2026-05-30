-- БекОфисные приключения — схема Supabase (учёт игроков и лидерборд)
--
-- Применять ЛОКАЛЬНО через прямое подключение к БД, например:
--   psql "$DATABASE_URL" -f supabase/schema.sql
-- или вставить в Supabase Dashboard → SQL Editor.
--
-- Архитектура (см. PLAN.md §9): фронтенд — статика на GitHub Pages, ходит по
-- ПУБЛИЧНОМУ anon-ключу. Поэтому:
--   * прямые INSERT/SELECT в таблицы для роли anon закрыты;
--   * запись идёт только через SECURITY DEFINER функцию submit_run() с валидацией;
--   * чтение лидерборда — только через вьюшку leaderboard (без client_uid).

-- ───────────────────────────── Таблицы ─────────────────────────────

create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  nickname    text not null check (char_length(nickname) between 2 and 24),
  client_uid  text not null unique,        -- генерится на клиенте, хранится в localStorage
  created_at  timestamptz not null default now()
);

create table if not exists public.runs (
  id                uuid primary key default gen_random_uuid(),
  player_id         uuid not null references public.players(id) on delete cascade,
  score             integer not null check (score >= 0 and score <= 100000),
  outcome           text not null check (outcome in ('won','lost')),
  loss_reason       text,
  turns             integer not null check (turns between 1 and 50),
  threats_faced     integer not null check (threats_faced >= 0),
  threats_defended  integer not null check (threats_defended >= 0),
  defense_peak      jsonb   not null default '{}'::jsonb,
  duration_seconds  integer check (duration_seconds is null or duration_seconds >= 0),
  created_at        timestamptz not null default now(),
  -- структурная анти-накрутка: нельзя отразить больше угроз, чем встретил
  constraint defended_le_faced check (threats_defended <= threats_faced)
);

create index if not exists runs_leaderboard_idx
  on public.runs (outcome, score desc, created_at asc);

-- ─────────────────────── Публичная вьюшка лидерборда ───────────────────────
-- Отдаёт только безопасные поля. Вьюшка выполняется с правами владельца и
-- обходит RLS базовых таблиц, поэтому таблицы можно держать закрытыми.

create or replace view public.leaderboard as
  select r.id,
         p.nickname,
         r.score,
         r.outcome,
         r.turns,
         r.threats_defended,
         r.threats_faced,
         r.created_at
  from public.runs r
  join public.players p on p.id = r.player_id
  where r.outcome = 'won'
  order by r.score desc, r.created_at asc;

-- ───────────────────────────── RLS ─────────────────────────────
-- Включаем RLS и НЕ добавляем политик для anon → прямой доступ к таблицам закрыт.
-- Вся запись идёт через submit_run() (security definer).

alter table public.players enable row level security;
alter table public.runs    enable row level security;

-- ──────────────────── Функция записи партии (анти-накрутка) ────────────────────

create or replace function public.submit_run(
  p_nickname         text,
  p_client_uid       text,
  p_score            integer,
  p_outcome          text,
  p_turns            integer,
  p_threats_faced    integer,
  p_threats_defended integer,
  p_loss_reason      text default null,
  p_defense_peak     jsonb default '{}'::jsonb,
  p_duration_seconds integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_run_id    uuid;
  v_rank      bigint;
begin
  -- Валидация на сервере (клиенту доверять нельзя)
  if char_length(p_nickname) not between 2 and 24 then
    raise exception 'nickname must be 2..24 chars';
  end if;
  if p_outcome not in ('won','lost') then
    raise exception 'invalid outcome';
  end if;
  if p_threats_defended > p_threats_faced then
    raise exception 'defended cannot exceed faced';
  end if;

  -- upsert игрока по client_uid (обновляем ник, если сменился)
  insert into public.players (nickname, client_uid)
  values (p_nickname, p_client_uid)
  on conflict (client_uid)
  do update set nickname = excluded.nickname
  returning id into v_player_id;

  insert into public.runs (
    player_id, score, outcome, loss_reason, turns,
    threats_faced, threats_defended, defense_peak, duration_seconds
  )
  values (
    v_player_id, p_score, p_outcome, p_loss_reason, p_turns,
    p_threats_faced, p_threats_defended, coalesce(p_defense_peak, '{}'::jsonb), p_duration_seconds
  )
  returning id into v_run_id;

  -- позиция в общем зачёте (только победы)
  if p_outcome = 'won' then
    select count(*) + 1 into v_rank
    from public.runs
    where outcome = 'won'
      and (score > p_score);
  else
    v_rank := null;
  end if;

  return jsonb_build_object('run_id', v_run_id, 'rank', v_rank);
end;
$$;

-- Доступ: anon и authenticated могут читать лидерборд и звать submit_run.
grant select  on public.leaderboard to anon, authenticated;
grant execute on function public.submit_run(
  text, text, integer, text, integer, integer, integer, text, jsonb, integer
) to anon, authenticated;
