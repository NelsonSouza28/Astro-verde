# Contrato de Comunicacao ESP32 <-> Astro Verde Backend

## Protocolo
- HTTP/HTTPS
- Base: `/api/esp`

## Autenticacao
- Header `Authorization: Bearer <jwt_supabase>`
- Opcional por dispositivo: `X-Device-Token` (quando habilitado no backend)

## Endpoint de envio de leitura
- `POST /api/esp/leitura`

Payload:

```json
{
  "device_id": "esp32-modulo-01",
  "sensor": "ph",
  "valor": 6.3,
  "timestamp": "2026-05-12T14:32:00Z"
}
```

Sensores aceitos:
- `ph` (number 0.0-14.0)
- `boia` (boolean)
- `nivel_reservatorio` (number 0-200 cm)
- `fluxo_nft` (number 0.0-50.0 L/min)
- `temperatura` (number 0.0-60.0 C)
- `umidade` (number 0.0-100.0 %)
- `luminosidade` (number 0-10000 lux)
- `ec` (number)
- `fluxo_laminar` (number)
- `iluminacao` (object)

## Endpoint de polling de comandos
- `GET /api/esp/comandos/:device_id`

Resposta:

```json
[
  {
    "id": "uuid",
    "comando": "LIGAR_BOMBA",
    "payload": {},
    "criado_em": "2026-05-12T14:35:00Z"
  }
]
```

## Endpoint de ACK
- `POST /api/esp/ack`

Payload:

```json
{
  "comando_id": "uuid",
  "device_id": "esp32-modulo-01",
  "status": "ok",
  "mensagem": "executado com sucesso"
}
```

Status aceitos:
- `ok`
- `erro`

## Endpoint de status de dispositivos
- `GET /api/esp/status`

Resposta:

```json
{
  "devices": [
    {
      "device_id": "esp32-modulo-01",
      "status": "online",
      "ultimo_contato": "2026-05-12T14:40:10Z"
    }
  ]
}
```

## Endpoint de historico por sensor
- `GET /api/esp/historico/:sensor?inicio=<iso>&fim=<iso>&device_id=<opcional>`
- Limite de periodo por consulta: 90 dias

## Frequencia recomendada
- pH: a cada 30s
- Boia: a cada 10s ou por interrupcao
- Nivel reservatorio: a cada 30s
- Fluxo NFT: a cada 10s
- Temperatura: a cada 60s
- Umidade: a cada 60s
- Luminosidade: a cada 30s

## Comandos suportados
- `LIGAR_BOMBA`
- `DESLIGAR_BOMBA`
- `LIGAR_BOMBA_REPOSICAO`
- `LIGAR_LED`
- `DESLIGAR_LED`
- `SET_INTENSIDADE_LED`
- `SET_FLOW_RATE`
- `SET_LIGHT`
