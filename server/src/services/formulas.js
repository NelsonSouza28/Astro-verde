/**
 * @file formulas.js
 * @module formulas
 * @description Funcoes puras das regras matematicas do Astro Verde.
 * @requisitos RF01, RF02, RF04, RF07, RF08, RF13, RN01, RN03, RN04, RN10
 * @ator Sistema
 * @mode real
 */

/**
 * FÓRMULA: previsao_colheita = data_plantio + ciclo_cultura_dias
 * @param {Date|string} dataPlantio
 * @param {number} cicloCulturaDias
 * @returns {Date}
 */
function calcularPrevisaoColheita(dataPlantio, cicloCulturaDias) {
  const base = new Date(dataPlantio);
  if (Number.isNaN(base.getTime())) throw new Error('dataPlantio invalida.');
  if (!Number.isFinite(cicloCulturaDias) || cicloCulturaDias < 0) throw new Error('cicloCulturaDias invalido.');
  const out = new Date(base);
  out.setDate(out.getDate() + Math.trunc(cicloCulturaDias));
  return out;
}

/**
 * FÓRMULA: pH_valido = pH_lido >= pH_min_cultura && pH_lido <= pH_max_cultura
 * @param {number} phLido
 * @param {number} phMinCultura
 * @param {number} phMaxCultura
 * @returns {boolean}
 */
function validarFaixaPh(phLido, phMinCultura, phMaxCultura) {
  return Number.isFinite(phLido) && Number.isFinite(phMinCultura) && Number.isFinite(phMaxCultura)
    && phLido >= phMinCultura && phLido <= phMaxCultura;
}

/**
 * FÓRMULA: nivel_pct = ((leitura_sensor - nivel_minimo) / (nivel_maximo - nivel_minimo)) * 100
 * @param {number} leituraSensor
 * @param {number} nivelMinimo
 * @param {number} nivelMaximo
 * @returns {number}
 */
function calcularNivelReservatorioPercentual(leituraSensor, nivelMinimo, nivelMaximo) {
  if (nivelMaximo <= nivelMinimo) throw new Error('Faixa de nivel invalida.');
  return ((leituraSensor - nivelMinimo) / (nivelMaximo - nivelMinimo)) * 100;
}

/**
 * FÓRMULA: fluxo_interrompido = leitura_fluxo < fluxo_minimo_configurado
 * @param {number} leituraFluxo
 * @param {number} fluxoMinimoConfigurado
 * @returns {boolean}
 */
function detectarInterrupcaoFluxoNft(leituraFluxo, fluxoMinimoConfigurado) {
  return Number.isFinite(leituraFluxo) && Number.isFinite(fluxoMinimoConfigurado)
    && leituraFluxo < fluxoMinimoConfigurado;
}

/**
 * FÓRMULA: led_ativo = hora_atual >= hora_inicio_ciclo && hora_atual < hora_fim_ciclo
 * @param {Date|string} horaAtual
 * @param {string} horaInicioCiclo HH:mm
 * @param {string} horaFimCiclo HH:mm
 * @returns {boolean}
 */
function calcularLedAtivoPorFotoperiodo(horaAtual, horaInicioCiclo, horaFimCiclo) {
  const now = new Date(horaAtual);
  if (Number.isNaN(now.getTime())) throw new Error('horaAtual invalida.');
  const [ih, im] = horaInicioCiclo.split(':').map(Number);
  const [fh, fm] = horaFimCiclo.split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = ih * 60 + im;
  const end = fh * 60 + fm;
  return minutes >= start && minutes < end;
}

/**
 * FÓRMULA: bomba_ativa = (hora_atual % periodo_ciclo) < duracao_ativa
 * @param {number} minutosDoDia
 * @param {number} periodoCicloMinutos
 * @param {number} duracaoAtivaMinutos
 * @returns {boolean}
 */
function calcularBombaAtivaPorCiclo(minutosDoDia, periodoCicloMinutos, duracaoAtivaMinutos) {
  if (periodoCicloMinutos <= 0 || duracaoAtivaMinutos < 0) throw new Error('Parametros de ciclo invalidos.');
  return (minutosDoDia % periodoCicloMinutos) < duracaoAtivaMinutos;
}

module.exports = {
  calcularPrevisaoColheita,
  validarFaixaPh,
  calcularNivelReservatorioPercentual,
  detectarInterrupcaoFluxoNft,
  calcularLedAtivoPorFotoperiodo,
  calcularBombaAtivaPorCiclo,
};
