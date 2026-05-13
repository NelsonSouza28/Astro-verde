-- @file supabase-one-shot.sql
-- @module database
-- @description Script unico, idempotente, para alinhar o banco Supabase do Astro Verde sem erros de colunas faltantes.
-- @requisitos RF01, RF02, RF03, RF07, RF08, RF09, RF10, RF12, RF13, RN01, RN02, RN03, RN04, RN05, RN06, RN07, RN08, RN09, RN10
-- @ator Sistema
-- @mode real

begin;

create extension if not exists pgcrypto;

-- =========================================================
-- TABELAS BASE DO SISTEMA
-- =========================================================

create table if not exists public.usuario (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  perfil text not null default 'Geral',
  auth_user_id uuid unique,
  singleton boolean not null default true,
  created_at timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  sensor text not null,
  value jsonb not null default '{}'::jsonb,
  source text not null default 'real',
  quality text,
  unit text,
  created_at timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  timestamp_device timestamptz not null default now(),
  received_at timestamptz not null default now()
);

create table if not exists public.esp_commands (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  mensagem text,
  created_at timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  sent_at timestamptz,
  ack_at timestamptz,
  ack_em timestamptz
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  category text not null default 'system',
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create table if not exists public.alerta (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  severidade text not null default 'warning',
  mensagem text not null,
  critica boolean not null default false,
  canal text,
  device_id text,
  sensor text,
  valor jsonb,
  aberto_em timestamptz not null default now(),
  resolvido_em timestamptz,
  created_at timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create table if not exists public.notificacoes_queue (
  id uuid primary key default gen_random_uuid(),
  canal text not null default 'telegram',
  destino text,
  mensagem text not null,
  payload jsonb,
  status text not null default 'pendente',
  tentativas integer not null default 0,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz
);

create table if not exists public.dispositivos (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  nome text,
  localizacao text,
  token text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.culturas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ph_min numeric(4,2) not null default 5.50,
  ph_max numeric(4,2) not null default 7.00,
  ciclo_dias integer not null default 30,
  fotoperiodo_inicio time not null default '06:00',
  fotoperiodo_fim time not null default '22:00',
  created_at timestamptz not null default now()
);

create table if not exists public.modulo_nft (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  nome text not null,
  fluxo_minimo numeric(8,3) not null default 0.500,
  periodo_ciclo_min integer not null default 30,
  duracao_ativa_min integer not null default 15,
  created_at timestamptz not null default now()
);

create table if not exists public.reservatorio (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  altura_cm numeric(8,2) not null default 50,
  nivel_critico_pct numeric(5,2) not null default 20,
  created_at timestamptz not null default now()
);

create table if not exists public.calibracoes_ph (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  adc_buffer1 integer not null,
  ph_buffer1 numeric(6,3) not null,
  adc_buffer2 integer not null,
  ph_buffer2 numeric(6,3) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.safra (
  id uuid primary key default gen_random_uuid(),
  cultura_id uuid references public.culturas(id),
  cultura_nome text not null,
  data_plantio date not null,
  previsao_colheita date not null,
  ciclo_cultura_dias integer not null,
  modulo_nft_id uuid references public.modulo_nft(id),
  created_at timestamptz not null default now()
);

create table if not exists public.estoque_insumo (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  quantidade numeric(12,3) not null default 0,
  unidade text not null default 'un',
  estoque_minimo numeric(12,3) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.relatorio (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuario(id),
  tipo text not null default 'csv',
  periodo_inicio timestamptz not null,
  periodo_fim timestamptz not null,
  filtros jsonb,
  criado_em timestamptz not null default now()
);

-- compatibilidade para scripts antigos que referenciam "leitura"
create table if not exists public.leitura (
  id uuid primary key default gen_random_uuid(),
  sensor_id uuid,
  device_id text not null,
  tipo_sensor text not null,
  valor numeric,
  coletado_em timestamptz not null default now(),
  payload jsonb,
  valido boolean not null default true,
  created_at timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

-- =========================================================
-- PATCH DE COMPATIBILIDADE DE COLUNAS
-- =========================================================

alter table public.usuario add column if not exists created_at timestamptz;
alter table public.usuario add column if not exists criado_em timestamptz;
alter table public.usuario add column if not exists updated_at timestamptz;
alter table public.usuario add column if not exists singleton boolean not null default true;
alter table public.usuario add column if not exists perfil text default 'Geral';

alter table public.sensor_readings add column if not exists created_at timestamptz;
alter table public.sensor_readings add column if not exists criado_em timestamptz;
alter table public.sensor_readings add column if not exists timestamp_device timestamptz;
alter table public.sensor_readings add column if not exists received_at timestamptz;
alter table public.sensor_readings add column if not exists source text default 'real';
alter table public.sensor_readings add column if not exists value jsonb default '{}'::jsonb;

alter table public.esp_commands add column if not exists created_at timestamptz;
alter table public.esp_commands add column if not exists criado_em timestamptz;
alter table public.esp_commands add column if not exists sent_at timestamptz;
alter table public.esp_commands add column if not exists ack_at timestamptz;
alter table public.esp_commands add column if not exists ack_em timestamptz;

alter table public.system_logs add column if not exists created_at timestamptz;
alter table public.system_logs add column if not exists criado_em timestamptz;
alter table public.system_logs add column if not exists level text;
alter table public.system_logs add column if not exists category text;
alter table public.system_logs add column if not exists message text;
alter table public.system_logs add column if not exists metadata jsonb;

do $$
begin
  update public.usuario
     set created_at = coalesce(created_at, criado_em, now()),
         criado_em = coalesce(criado_em, created_at, now()),
         updated_at = coalesce(updated_at, now());

  update public.sensor_readings
     set created_at = coalesce(created_at, criado_em, timestamp_device, now()),
         criado_em = coalesce(criado_em, created_at, timestamp_device, now()),
         timestamp_device = coalesce(timestamp_device, created_at, criado_em, now()),
         received_at = coalesce(received_at, created_at, now());

  update public.esp_commands
     set created_at = coalesce(created_at, criado_em, now()),
         criado_em = coalesce(criado_em, created_at, now()),
         ack_em = coalesce(ack_em, ack_at);

  update public.system_logs
     set created_at = coalesce(created_at, criado_em, now()),
         criado_em = coalesce(criado_em, created_at, now()),
         level = coalesce(level, 'info'),
         category = coalesce(category, 'system'),
         message = coalesce(message, 'log sem mensagem');
exception
  when undefined_table then
    null;
end $$;

alter table public.usuario alter column created_at set default now();
alter table public.usuario alter column criado_em set default now();
alter table public.usuario alter column updated_at set default now();

alter table public.sensor_readings alter column created_at set default now();
alter table public.sensor_readings alter column criado_em set default now();
alter table public.sensor_readings alter column timestamp_device set default now();
alter table public.sensor_readings alter column received_at set default now();

alter table public.esp_commands alter column created_at set default now();
alter table public.esp_commands alter column criado_em set default now();

alter table public.system_logs alter column created_at set default now();
alter table public.system_logs alter column criado_em set default now();

-- tentativa de NOT NULL apos backfill (idempotente e tolerante a falhas)
do $$
begin
  alter table public.usuario alter column created_at set not null;
  alter table public.usuario alter column criado_em set not null;
  alter table public.usuario alter column updated_at set not null;
exception when others then null; end $$;

do $$
begin
  alter table public.sensor_readings alter column created_at set not null;
  alter table public.sensor_readings alter column criado_em set not null;
  alter table public.sensor_readings alter column timestamp_device set not null;
exception when others then null; end $$;

do $$
begin
  alter table public.esp_commands alter column created_at set not null;
  alter table public.esp_commands alter column criado_em set not null;
exception when others then null; end $$;

do $$
begin
  alter table public.system_logs alter column created_at set not null;
  alter table public.system_logs alter column criado_em set not null;
  alter table public.system_logs alter column level set not null;
  alter table public.system_logs alter column category set not null;
  alter table public.system_logs alter column message set not null;
exception when others then null; end $$;

-- =========================================================
-- INDICES
-- =========================================================

create index if not exists idx_usuario_email on public.usuario(email);
create index if not exists idx_usuario_auth_user_id on public.usuario(auth_user_id);

create index if not exists idx_sensor_readings_device_sensor_created
  on public.sensor_readings(device_id, sensor, created_at desc);

create index if not exists idx_sensor_readings_device_sensor_ts
  on public.sensor_readings(device_id, sensor, timestamp_device desc);

create index if not exists idx_esp_commands_device_status_created
  on public.esp_commands(device_id, status, created_at asc);

create index if not exists idx_system_logs_created
  on public.system_logs(created_at desc);

create index if not exists idx_alerta_aberto_em
  on public.alerta(aberto_em desc);

-- =========================================================
-- CONSTRAINTS E CHECKS TOLERANTES
-- =========================================================

do $$
declare
  r record;
begin
  -- remove checks legados de perfil para permitir padrao atual
  begin
    for r in
      select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'usuario'
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ilike '%perfil%'
    loop
      execute format('alter table public.usuario drop constraint %I', r.conname);
    end loop;
  exception when others then
    null;
  end;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ck_usuario_perfil'
  ) then
    alter table public.usuario
      add constraint ck_usuario_perfil
      check (perfil in ('Geral', 'Administrador', 'Operador', 'Visualizador'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ck_esp_commands_status'
  ) then
    alter table public.esp_commands
      add constraint ck_esp_commands_status
      check (status in ('pending', 'sent', 'ack', 'failed', 'confirmado', 'falha'));
  end if;
end $$;

-- opcional: sistema de usuario unico
-- remove duplicidade de singleton antes de criar indice unico
with ranked as (
  select id, row_number() over (partition by singleton order by created_at nulls last, id) as rn
  from public.usuario
  where singleton is true
)
update public.usuario u
   set singleton = false
  from ranked r
 where u.id = r.id
   and r.rn > 1;

create unique index if not exists uq_usuario_singleton
  on public.usuario(singleton)
  where singleton = true;

-- =========================================================
-- FUNCOES DE APOIO (API ESP / ALERTAS)
-- =========================================================

create or replace function public.fn_validar_leitura_sensor(p_sensor text, p_valor jsonb)
returns table(valido boolean, motivo text)
language plpgsql
as $$
declare
  v_num numeric;
  v_bool boolean;
begin
  if p_sensor = 'boia' then
    begin
      v_bool := (p_valor->>'value')::boolean;
      return query select true, null::text;
    exception when others then
      return query select false, 'boia deve ser boolean';
    end;
    return;
  end if;

  begin
    v_num := (p_valor->>'value')::numeric;
  exception when others then
    return query select false, 'valor numerico invalido';
    return;
  end;

  if p_sensor = 'ph' and (v_num < 0 or v_num > 14) then
    return query select false, 'pH fora da faixa fisica 0-14';
    return;
  end if;

  if p_sensor = 'nivel_reservatorio' and (v_num < 0 or v_num > 200) then
    return query select false, 'nivel fora da faixa fisica 0-200 cm';
    return;
  end if;

  if p_sensor = 'fluxo_nft' and (v_num < 0 or v_num > 50) then
    return query select false, 'fluxo fora da faixa fisica 0-50 L/min';
    return;
  end if;

  if p_sensor = 'temperatura' and (v_num < 0 or v_num > 60) then
    return query select false, 'temperatura fora da faixa fisica 0-60 C';
    return;
  end if;

  if p_sensor = 'umidade' and (v_num < 0 or v_num > 100) then
    return query select false, 'umidade fora da faixa fisica 0-100%';
    return;
  end if;

  if p_sensor = 'luminosidade' and (v_num < 0 or v_num > 10000) then
    return query select false, 'luminosidade fora da faixa fisica 0-10000 lux';
    return;
  end if;

  return query select true, null::text;
end;
$$;

create or replace function public.fn_inserir_leitura(
  p_device_id text,
  p_sensor text,
  p_valor jsonb,
  p_timestamp timestamptz default now(),
  p_source text default 'real'
)
returns uuid
language plpgsql
as $$
declare
  v_ok boolean;
  v_motivo text;
  v_id uuid;
begin
  select valido, motivo
    into v_ok, v_motivo
    from public.fn_validar_leitura_sensor(p_sensor, p_valor);

  if not coalesce(v_ok, false) then
    raise exception 'Leitura invalida: %', coalesce(v_motivo, 'motivo nao informado');
  end if;

  insert into public.sensor_readings (
    device_id, sensor, value, source, created_at, criado_em, timestamp_device, received_at
  ) values (
    p_device_id, p_sensor, p_valor, p_source, p_timestamp, p_timestamp, p_timestamp, now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.fn_poll_comandos(p_device_id text)
returns table (
  id uuid,
  comando text,
  payload jsonb,
  criado_em timestamptz
)
language plpgsql
as $$
begin
  update public.esp_commands
     set status = 'sent',
         sent_at = now()
   where device_id = p_device_id
     and status = 'pending';

  return query
  select c.id, c.command as comando, c.payload, c.criado_em
    from public.esp_commands c
   where c.device_id = p_device_id
     and c.status = 'sent'
     and c.sent_at > now() - interval '2 minutes'
   order by c.created_at asc;
end;
$$;

create or replace function public.fn_ack_comando(
  p_comando_id uuid,
  p_device_id text,
  p_status text,
  p_mensagem text default null
)
returns boolean
language plpgsql
as $$
begin
  update public.esp_commands
     set status = case when p_status = 'ok' then 'ack' else 'failed' end,
         mensagem = p_mensagem,
         ack_at = now(),
         ack_em = now()
   where id = p_comando_id
     and device_id = p_device_id;

  if p_status <> 'ok' then
    insert into public.alerta(tipo, severidade, mensagem, critica, canal, device_id, sensor, valor)
    values ('falha_comando_esp', 'critico', coalesce(p_mensagem, 'Falha em comando ESP'), true, 'telegram', p_device_id, 'comando', jsonb_build_object('comando_id', p_comando_id));
  end if;

  return true;
end;
$$;

create or replace function public.fn_status_dispositivos()
returns table (
  device_id text,
  status text,
  ultimo_contato timestamptz
)
language sql
as $$
  with ult as (
    select sr.device_id, max(sr.created_at) as ultimo_contato
      from public.sensor_readings sr
     group by sr.device_id
  )
  select
    u.device_id,
    case
      when u.ultimo_contato is null then 'offline'
      when u.ultimo_contato > now() - interval '60 seconds' then 'online'
      else 'offline'
    end as status,
    u.ultimo_contato
  from ult u
  order by u.device_id;
$$;

create or replace function public.fn_historico_sensor(
  p_sensor text,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_device_id text default null
)
returns table (
  id uuid,
  device_id text,
  sensor text,
  value jsonb,
  created_at timestamptz,
  timestamp_device timestamptz
)
language plpgsql
as $$
begin
  if p_fim < p_inicio then
    raise exception 'Periodo invalido: fim menor que inicio';
  end if;

  if p_fim - p_inicio > interval '90 days' then
    raise exception 'Periodo maximo permitido: 90 dias';
  end if;

  return query
  select sr.id, sr.device_id, sr.sensor, sr.value, sr.created_at, sr.timestamp_device
    from public.sensor_readings sr
   where sr.sensor = p_sensor
     and sr.created_at >= p_inicio
     and sr.created_at <= p_fim
     and (p_device_id is null or sr.device_id = p_device_id)
   order by sr.created_at asc;
end;
$$;

create or replace function public.fn_verificar_esp_offline(p_threshold_ms bigint default 60000)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
begin
  insert into public.alerta(tipo, severidade, mensagem, critica, canal, device_id, sensor, valor)
  select
    'esp_offline',
    'critico',
    'Sem leitura recente do dispositivo',
    true,
    'telegram',
    x.device_id,
    'heartbeat',
    jsonb_build_object('ultimo_contato', x.ultimo_contato, 'threshold_ms', p_threshold_ms)
  from (
    select device_id, max(created_at) as ultimo_contato
    from public.sensor_readings
    group by device_id
  ) x
  where extract(epoch from (now() - x.ultimo_contato)) * 1000 > p_threshold_ms;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =========================================================
-- REALTIME
-- =========================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'sensor_readings'
    ) then
      execute 'alter publication supabase_realtime add table public.sensor_readings';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'system_logs'
    ) then
      execute 'alter publication supabase_realtime add table public.system_logs';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'alerta'
    ) then
      execute 'alter publication supabase_realtime add table public.alerta';
    end if;
  end if;
end $$;

commit;

-- =========================================================
-- POS-EXECUCAO (RODAR OPCIONALMENTE)
-- =========================================================
-- select now();
-- select * from public.fn_status_dispositivos();
-- select * from public.fn_historico_sensor('ph', now() - interval '1 day', now(), null);
