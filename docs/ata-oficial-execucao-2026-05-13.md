# ATA OFICIAL - EXECUCAO ASTRO VERDE

**Data de registro:** 12 de maio de 2026  
**Data oficial de execucao:** 13 de maio de 2026  
**Projeto:** Astro Verde (React/Frontend Web + Node.js + Supabase + ESP32 + Telegram)

## 1. Status consolidado em 12/05/2026

- Deploy de producao publicado e ativo em:
  - `https://astro-verde.vercel.app`
- API validada em producao:
  - `GET /api/health` retornando `status: ok`
- Banco Supabase preparado com script unico:
  - `server/src/database/supabase-one-shot.sql`
- Contrato de comunicacao ESP32 documentado:
  - `docs/contrato-esp32.md`
- Backend ajustado para operacao real:
  - sem simulacao ativa
  - rotas ESP em producao
  - validacoes de leitura e alertas
- Frontend ajustado para estado real:
  - sem dados falsos
  - estado `AGUARDANDO SENSOR` quando nao houver leitura

## 2. Ambiente de producao confirmado

### Vercel
- Projeto online: `astro-verde.vercel.app`
- Rewrites API habilitados para rotas `/api/*`

### Variaveis de ambiente em producao (Vercel)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## 3. Rotas oficiais do ESP32 (backend)

- `POST /api/esp/leitura`
- `GET /api/esp/comandos/:device_id`
- `POST /api/esp/ack`
- `GET /api/esp/status`
- `GET /api/esp/historico/:sensor`

Observacao:
- Rotas protegidas por autenticacao.
- Suporte adicional a `X-Device-Token` nas rotas `/api/esp/*` para integracao direta do dispositivo.

## 4. Script SQL ja executado

- Script principal executado no Supabase:
  - `server/src/database/supabase-one-shot.sql`

## 5. Roteiro oficial para 13/05/2026

### Etapa A - Registrar dispositivo ESP no banco
```sql
insert into public.dispositivos (device_id, nome, token, ativo)
values ('esp32-modulo-01', 'ESP32 Modulo 01', 'TOKEN_ESP_001', true)
on conflict (device_id)
do update set token = excluded.token, ativo = true, updated_at = now();
```

### Etapa B - Teste real de envio de leitura (payload)
```bash
curl -X POST "https://astro-verde.vercel.app/api/esp/leitura" \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: TOKEN_ESP_001" \
  -d "{\"device_id\":\"esp32-modulo-01\",\"sensor\":\"ph\",\"valor\":6.3,\"timestamp\":\"2026-05-13T10:00:00Z\"}"
```

### Etapa C - Validar fila de comandos
```bash
curl "https://astro-verde.vercel.app/api/esp/comandos/esp32-modulo-01" \
  -H "X-Device-Token: TOKEN_ESP_001"
```

### Etapa D - Confirmar ACK
```bash
curl -X POST "https://astro-verde.vercel.app/api/esp/ack" \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: TOKEN_ESP_001" \
  -d "{\"comando_id\":\"UUID_DO_COMANDO\",\"device_id\":\"esp32-modulo-01\",\"status\":\"ok\"}"
```

### Etapa E - Verificar status e historico
```bash
curl "https://astro-verde.vercel.app/api/esp/status" -H "X-Device-Token: TOKEN_ESP_001"
curl "https://astro-verde.vercel.app/api/esp/historico/ph?inicio=2026-05-13T00:00:00Z&fim=2026-05-13T23:59:59Z&device_id=esp32-modulo-01" -H "X-Device-Token: TOKEN_ESP_001"
```

## 6. Checkpoint oficial

Este documento formaliza que a base tecnica ficou preparada em 12/05/2026 e que a execucao operacional completa (teste fisico do payload ESP32 e validacao fim-a-fim) sera realizada em 13/05/2026.

