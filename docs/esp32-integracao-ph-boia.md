# Integração ESP32 (pH + Boia) - Astro Verde

## 1) Pré-requisitos
- ESP32
- Sensor pH analógico (saída em tensão)
- Boia digital
- Backend Astro Verde rodando (`server`)
- Wi-Fi comum entre ESP32 e backend

## 2) Backend pronto
No backend, confirme:
- `POST /api/esp/data`
- `GET /api/esp/commands/:device_id`
- `POST /api/esp/ack`

Arquivo de env (`server/.env`):
- `ESP_DEVICE_IDS=astro-verde-esp`
- `ESP_OFFLINE_THRESHOLD_MS=300000`
- credenciais Supabase preenchidas

## 3) Banco Supabase
Execute:
- `server/src/database/supabase-migration.sql`

Isso cria:
- `sensor_readings`
- `system_logs`
- `esp_commands`

## 4) Firmware ESP32
Arquivo pronto:
- `firmware/esp32/astro_verde_esp32.ino`
- `firmware/esp32/astro_verde_esp32_config.example.h`

Passos:
1. Copie `astro_verde_esp32_config.example.h` para `astro_verde_esp32_config.h`.
2. Preencha:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
   - `BACKEND_BASE_URL` (IP local do backend, ex.: `http://192.168.0.120:3001`)
   - `DEVICE_ID` (igual ao env do backend)
3. Compile e grave no ESP32.

Observação:
- O sketch já valida essas definições e interrompe a compilação se faltar algum campo.

## 5) Pinos
No sketch atual:
- pH: `GPIO34` (ADC)
- boia: `GPIO27` (digital)

Ajuste conforme seu circuito.

## 6) Calibração pH
No sketch:
- `PH_A`
- `PH_B`

Passo recomendado:
1. Ler tensão em solução pH 7 e pH 4.
2. Resolver reta `pH = A * V + B`.
3. Atualizar constantes.

## 7) Teste rápido
1. Suba o backend.
2. Grave firmware no ESP32.
3. Abra frontend e verifique card pH/boia em tempo real.
4. Verifique logs em `system_logs`.
5. Enfileire comando em `esp_commands` e confirme ACK.

## 8) Troubleshooting
- Sem leitura: confira `BACKEND_BASE_URL` e firewall.
- OFFLINE no painel: reduza perda Wi-Fi e confirme envio a cada 5s.
- pH estranho: recalibrar `PH_A`/`PH_B`.
- Boia invertida: trocar `BOIA_ACTIVE_LOW`.
