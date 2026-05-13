<!--
REMOVIDO NA LIMPEZA (2026-05-12):
- .md legados fora da especificacao v1.2 (raiz e docs/): removidos por estarem desatualizados.
- Fluxos legados nao mapeados a RF/RN/RNF (rotas/componentes antigos de controle termico e automacoes extras): despriorizados do bootstrap principal.
- Hardcodes de regra de negocio (faixa de pH fixa no service): substituido por leitura de configuracao.
-->

# Astro Verde

Sistema de automacao e monitoramento para fazenda vertical indoor NFT, alinhado a especificacao oficial v1.2.

## RFs implementados (13)
- RF01 Reposicao automatizada de agua: backend via leituras de nivel/boia e controle de bomba.
- RF02 Iluminacao artificial: ciclo local no ESP32 + comandos backend.
- RF03 Monitoramento do ambiente: coleta e exibicao de sensores.
- RF04 Planejamento de colheita: estrutura de entidade/tabela `safra`.
- RF05 Registro de safra: estrutura de entidade/tabela `safra`.
- RF06 Sincronizacao de modulos empilhados: estrutura de entidade/tabela `modulo_nft`.
- RF07 Alerta de interrupcao de fluxo NFT: regra critica no backend.
- RF08 Monitoramento e alerta de pH: validacao por faixa da cultura.
- RF09 Controle de acesso e autenticacao: RBAC no backend por perfil.
- RF10 Geracao de relatorios: exportacao CSV por periodo.
- RF11 Gestao de estoque de insumos: estrutura de entidade/tabela `estoque_insumo`.
- RF12 Notificacoes de falhas criticas: base para Telegram + alerta persistido.
- RF13 Controle da bomba de agua: ciclo local + controle operacional.

## RNF e RN destacados
- RNF05/RN08: firmware mantem ciclo local de bomba e LED mesmo sem internet.
- RNF06: validacao de range de sensores antes de persistir.
- RNF12: comunicacao ESP->backend via HTTPS em producao (`BACKEND_BASE_URL` deve ser https).
- RNF13: realtime habilitado em `leitura` e `alerta` na migracao Supabase.
- RNF09: backup e configurado no painel Supabase (operacao externa ao codigo).

## Banco (Supabase)
Executar `server/src/database/supabase-migration.sql` para criar entidades oficiais do diagrama:
- `controlador_iot`, `sensor`, `atuador`, `usuario`, `safra`, `reservatorio`, `modulo_nft`, `estoque_insumo`, `leitura`, `alerta`, `relatorio`.

## Permissoes (backend)
Header de perfil usado no backend: `x-user-role` com valores:
- `Administrador`
- `Operador`
- `Visualizador`

## Execucao
```bash
cd server
npm install
npm start
```
