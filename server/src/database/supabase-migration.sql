-- @file supabase-migration.sql
-- @module database
-- @description Migracao oficial das entidades do diagrama de classes Astro Verde.
-- @requisitos RF01, RF02, RF03, RF04, RF05, RF06, RF07, RF08, RF09, RF10, RF11, RF12, RF13, RN01, RN02, RN03, RN04, RN05, RN06, RN07, RN08, RN09, RN10
-- @ator Sistema
-- @mode real

create extension if not exists pgcrypto;

create table if not exists usuario (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  perfil text not null check (perfil in ('Administrador','Operador','Visualizador')),
  auth_user_id uuid unique,
  created_at timestamptz default now()
);

create table if not exists controlador_iot (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  firmware text,
  modo_operacao text not null default 'real',
  ultimo_online_em timestamptz
);

create table if not exists reservatorio (
  id uuid primary key default gen_random_uuid(),
  controlador_iot_id uuid references controlador_iot(id),
  nivel_minimo numeric not null,
  nivel_maximo numeric not null,
  nivel_critico_pct numeric not null default 20,
  updated_at timestamptz default now()
);

create table if not exists modulo_nft (
  id uuid primary key default gen_random_uuid(),
  controlador_iot_id uuid references controlador_iot(id),
  nome text not null,
  fluxo_minimo numeric not null,
  periodo_ciclo_min integer not null,
  duracao_ativa_min integer not null,
  hora_inicio_luz time not null,
  hora_fim_luz time not null,
  ativo boolean default true
);

create table if not exists sensor (
  id uuid primary key default gen_random_uuid(),
  controlador_iot_id uuid references controlador_iot(id),
  tipo text not null,
  unidade text not null,
  calibrado_em timestamptz,
  ativo boolean default true
);

create table if not exists atuador (
  id uuid primary key default gen_random_uuid(),
  controlador_iot_id uuid references controlador_iot(id),
  tipo text not null,
  estado text not null,
  updated_at timestamptz default now()
);

create table if not exists safra (
  id uuid primary key default gen_random_uuid(),
  cultura text not null,
  data_plantio date not null,
  previsao_colheita date not null,
  ciclo_cultura_dias integer not null,
  modulo_nft_id uuid references modulo_nft(id),
  created_by uuid references usuario(id),
  created_at timestamptz default now()
);

create table if not exists estoque_insumo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  quantidade numeric not null,
  unidade text not null,
  estoque_minimo numeric not null,
  updated_at timestamptz default now()
);

create table if not exists leitura (
  id uuid primary key default gen_random_uuid(),
  sensor_id uuid references sensor(id),
  device_id text not null,
  tipo_sensor text not null,
  valor numeric not null,
  coletado_em timestamptz not null,
  payload jsonb,
  valido boolean not null default true
);

create table if not exists alerta (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  severidade text not null,
  mensagem text not null,
  critica boolean default false,
  canal text,
  aberto_em timestamptz default now(),
  resolvido_em timestamptz
);

create table if not exists relatorio (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuario(id),
  periodo_inicio timestamptz not null,
  periodo_fim timestamptz not null,
  formato text not null default 'csv',
  criado_em timestamptz default now()
);

alter publication supabase_realtime add table leitura;
alter publication supabase_realtime add table alerta;
