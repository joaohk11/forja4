-- ============================================================
-- FORJA — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── TEAMS ────────────────────────────────────────────────────
create table if not exists teams (
  id         text primary key default gen_random_uuid()::text,
  nome       text not null,
  foto       text,
  created_at timestamptz default now()
);

-- ── ATHLETES ─────────────────────────────────────────────────
create table if not exists athletes (
  id         text primary key default gen_random_uuid()::text,
  team_id    text references teams(id) on delete cascade,
  nome       text not null,
  numero     int not null default 1,
  posicao    text not null,
  altura     text,
  idade      int,
  foto       text,
  observacao text,
  created_at timestamptz default now()
);

-- ── ATHLETE ATTRIBUTES (evaluation scores) ───────────────────
create table if not exists athlete_attributes (
  id          text primary key default gen_random_uuid()::text,
  athlete_id  text references athletes(id) on delete cascade,
  ataque      numeric default 0,
  bloqueio    numeric default 0,
  passe       numeric default 0,
  defesa      numeric default 0,
  levantamento numeric default 0,
  forca       numeric default 0,
  explosao    numeric default 0,
  velocidade  numeric default 0,
  agilidade   numeric default 0,
  resistencia numeric default 0,
  reflexo     numeric default 0,
  created_at  timestamptz default now()
);

-- ── EVAL TESTS ────────────────────────────────────────────────
create table if not exists eval_tests (
  id               text primary key default gen_random_uuid()::text,
  team_id          text references teams(id) on delete cascade,
  attribute        text not null,
  category         text not null,
  name             text not null,
  measurement_type text not null,
  max_value        numeric not null,
  rule             text not null,
  created_at       timestamptz default now()
);

-- ── EVAL RESULTS ─────────────────────────────────────────────
create table if not exists eval_results (
  id               text primary key default gen_random_uuid()::text,
  athlete_id       text references athletes(id) on delete cascade,
  test_id          text references eval_tests(id) on delete cascade,
  raw_value        numeric not null,
  converted_score  numeric not null,
  date             text not null,
  created_at       timestamptz default now()
);

-- ── TRAININGS ─────────────────────────────────────────────────
create table if not exists trainings (
  id         text primary key default gen_random_uuid()::text,
  team_id    text references teams(id) on delete cascade,
  nome       text not null,
  data       text not null,
  duracao    int default 120,
  status     text default 'planejado',
  focus_tag  text,
  favorito   boolean default false,
  created_at timestamptz default now()
);

-- ── TRAINING MODULES ──────────────────────────────────────────
create table if not exists training_modules (
  id                text primary key default gen_random_uuid()::text,
  training_id       text references trainings(id) on delete cascade,
  tipo              text,
  block_type        text default 'geral',
  fundamento        text,
  descricao         text,
  duracao           int default 20,
  status            text default 'nao_fez',
  observacao        text,
  skill_observation text,
  skills            text[],
  positions         text[],
  ordem             int default 0,
  created_at        timestamptz default now()
);

-- ── TRAINING EXECUTION ────────────────────────────────────────
create table if not exists training_execution (
  id          text primary key default gen_random_uuid()::text,
  training_id text references trainings(id) on delete cascade,
  module_id   text references training_modules(id) on delete set null,
  status      text,
  data        text,
  created_at  timestamptz default now()
);

-- ── LINEUPS ───────────────────────────────────────────────────
create table if not exists lineups (
  id         text primary key default gen_random_uuid()::text,
  team_id    text references teams(id) on delete cascade,
  nome       text,
  data       text,
  created_at timestamptz default now()
);

-- ── LINEUP PLAYERS ────────────────────────────────────────────
create table if not exists lineup_players (
  id              text primary key default gen_random_uuid()::text,
  lineup_id       text references lineups(id) on delete cascade,
  athlete_id      text references athletes(id) on delete cascade,
  posicao_quadra  text not null,
  created_at      timestamptz default now()
);

-- ── ACCESS LINKS ─────────────────────────────────────────────
create table if not exists access_links (
  id           text primary key default gen_random_uuid()::text,
  token        text unique not null,
  tipo         text not null,
  reference_id text not null,
  role         text not null default 'viewer',
  created_at   timestamptz default now()
);

-- ── PERIODIZATION ─────────────────────────────────────────────
create table if not exists macrocycles (
  id         text primary key default gen_random_uuid()::text,
  team_id    text references teams(id) on delete cascade,
  nome       text not null,
  start_date text not null,
  end_date   text not null,
  tipo       text default '6months',
  created_at timestamptz default now()
);

create table if not exists mesocycles (
  id            text primary key default gen_random_uuid()::text,
  macrocycle_id text references macrocycles(id) on delete cascade,
  nome          text not null,
  start_date    text not null,
  end_date      text not null,
  weeks         int default 4,
  created_at    timestamptz default now()
);

create table if not exists microcycles (
  id           text primary key default gen_random_uuid()::text,
  mesocycle_id text references mesocycles(id) on delete cascade,
  nome         text not null,
  start_date   text not null,
  end_date     text not null,
  weeks        int default 1,
  created_at   timestamptz default now()
);

-- ── ROW LEVEL SECURITY (basic) ────────────────────────────────
-- For token-based access, keep RLS disabled or use custom policies
-- alter table teams enable row level security;
-- alter table athletes enable row level security;

-- ============================================================
-- Enable Realtime for key tables
-- ============================================================
-- Run in Supabase Dashboard → Database → Replication → supabase_realtime
-- or uncomment below:
-- alter publication supabase_realtime add table athletes;
-- alter publication supabase_realtime add table trainings;
-- alter publication supabase_realtime add table training_execution;
