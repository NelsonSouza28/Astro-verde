/**
 * @file calculos.js
 * @module calculos
 * @description Formulas matematicas e logicas puras do sistema Astro Verde.
 * @requisitos RF01, RF02, RF03, RF04, RF07, RF08, RF13, RN01, RN03, RN04, RN06, RN07, RN10
 * @ator Sistema
 * @mode real
 */

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function verificarPH(phLido, phMin, phMax) {
  if (!Number.isFinite(phLido) || !Number.isFinite(phMin) || !Number.isFinite(phMax)) {
    throw new Error('Parametros invalidos para verificarPH.');
  }
  if (phMax < phMin) throw new Error('Faixa de pH invalida.');

  if (phLido < phMin) return { valido: false, desvio: round(phMin - phLido, 2), status: 'acido' };
  if (phLido > phMax) return { valido: false, desvio: round(phLido - phMax, 2), status: 'alcalino' };
  return { valido: true, desvio: 0, status: 'ideal' };
}

function converterADCparaPH(leituraADC, adcBuffer1, phBuffer1, adcBuffer2, phBuffer2) {
  if (![leituraADC, adcBuffer1, phBuffer1, adcBuffer2, phBuffer2].every(Number.isFinite)) {
    throw new Error('Parametros invalidos para converterADCparaPH.');
  }
  if (adcBuffer2 === adcBuffer1) throw new Error('Calibracao invalida: pontos ADC iguais.');
  const ph = phBuffer1 + ((leituraADC - adcBuffer1) * (phBuffer2 - phBuffer1)) / (adcBuffer2 - adcBuffer1);
  return round(Math.min(14, Math.max(0, ph)), 2);
}

function converterNivelReservatorio(distanciaCm, alturaReservatorio) {
  if (!Number.isFinite(distanciaCm) || !Number.isFinite(alturaReservatorio) || alturaReservatorio <= 0) {
    throw new Error('Parametros invalidos para converterNivelReservatorio.');
  }
  const nivelCm = Math.min(alturaReservatorio, Math.max(0, alturaReservatorio - distanciaCm));
  const nivelPct = round((nivelCm / alturaReservatorio) * 100, 2);
  let status = 'normal';
  if (nivelPct >= 70) status = 'cheio';
  else if (nivelPct < 10) status = 'critico';
  else if (nivelPct < 20) status = 'baixo';
  return { nivel_cm: round(nivelCm, 2), nivel_pct: nivelPct, status };
}

function verificarFluxoNFT(fluxoLido, fluxoMinimo) {
  if (!Number.isFinite(fluxoLido) || !Number.isFinite(fluxoMinimo)) {
    throw new Error('Parametros invalidos para verificarFluxoNFT.');
  }
  const interrompido = fluxoLido < fluxoMinimo;
  const deficit = interrompido ? round(fluxoMinimo - fluxoLido, 3) : 0;
  return { interrompido, deficit };
}

function parseHHMM(value) {
  const [h, m] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error('Horario invalido no formato HH:MM.');
  }
  return (h * 60) + m;
}

function calcularFotoperiodo(agora, horaInicio, horaFim) {
  const now = new Date(agora);
  if (Number.isNaN(now.getTime())) throw new Error('Data invalida em calcularFotoperiodo.');
  const inicioMin = parseHHMM(horaInicio);
  const fimMin = parseHHMM(horaFim);
  const nowMin = (now.getHours() * 60) + now.getMinutes();

  const cruzaMeiaNoite = fimMin <= inicioMin;
  const ativo = cruzaMeiaNoite
    ? (nowMin >= inicioMin || nowMin < fimMin)
    : (nowMin >= inicioMin && nowMin < fimMin);

  let minutosRestantes;
  if (ativo) {
    minutosRestantes = cruzaMeiaNoite
      ? (nowMin < fimMin ? (fimMin - nowMin) : ((24 * 60 - nowMin) + fimMin))
      : (fimMin - nowMin);
  } else {
    minutosRestantes = cruzaMeiaNoite
      ? (inicioMin > nowMin ? (inicioMin - nowMin) : 0)
      : (nowMin < inicioMin ? (inicioMin - nowMin) : ((24 * 60 - nowMin) + inicioMin));
  }

  return { ativo, minutosRestantes };
}

function calcularCicloIrrigacao(agora, periodoSegundos, duracaoAtivaSegundos) {
  const now = new Date(agora);
  if (Number.isNaN(now.getTime())) throw new Error('Data invalida em calcularCicloIrrigacao.');
  if (!Number.isFinite(periodoSegundos) || !Number.isFinite(duracaoAtivaSegundos) || periodoSegundos <= 0) {
    throw new Error('Parametros invalidos para calcularCicloIrrigacao.');
  }
  const ativa = Math.max(0, Math.min(duracaoAtivaSegundos, periodoSegundos));
  const unixSeconds = Math.floor(now.getTime() / 1000);
  const segundosDoCiclo = unixSeconds % periodoSegundos;
  const bombaAtiva = segundosDoCiclo < ativa;
  const segundosProximaMudanca = bombaAtiva ? (ativa - segundosDoCiclo) : (periodoSegundos - segundosDoCiclo);
  return { bombaAtiva, segundosProximaMudanca };
}

function calcularPrevisaoColheita(dataPlantio, cicloCulturaDias, hoje = new Date()) {
  const plantio = new Date(dataPlantio);
  const atual = new Date(hoje);
  if (Number.isNaN(plantio.getTime()) || Number.isNaN(atual.getTime()) || !Number.isFinite(cicloCulturaDias) || cicloCulturaDias <= 0) {
    throw new Error('Parametros invalidos para calcularPrevisaoColheita.');
  }

  const dataColheita = new Date(plantio);
  dataColheita.setDate(dataColheita.getDate() + Math.trunc(cicloCulturaDias));

  const diasDecorridos = Math.floor((atual.getTime() - plantio.getTime()) / (24 * 60 * 60 * 1000));
  const diasRestantes = Math.floor((dataColheita.getTime() - atual.getTime()) / (24 * 60 * 60 * 1000));
  const progressoPct = round((diasDecorridos / cicloCulturaDias) * 100, 2);

  let status = 'em_andamento';
  if (diasRestantes <= 0 && progressoPct >= 100) status = diasRestantes === 0 ? 'pronto' : 'atrasado';
  else if (diasRestantes <= 7) status = 'proximo_colheita';

  return {
    dataColheitaPrevista: dataColheita,
    diasRestantes,
    progressoPct,
    status,
  };
}

function validarLeituraSensor(sensor, valor) {
  const ranges = {
    ph: [0, 14],
    nivel_reservatorio: [0, 200],
    fluxo_nft: [0, 50],
    temperatura: [0, 60],
    umidade: [0, 100],
    luminosidade: [0, 10000],
  };

  if (sensor === 'boia') {
    if (typeof valor !== 'boolean') return { valido: false, motivo: 'boia deve ser boolean.' };
    return { valido: true };
  }

  const num = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(num)) return { valido: false, motivo: 'valor deve ser numerico.' };

  if (!ranges[sensor]) return { valido: true };
  const [min, max] = ranges[sensor];
  if (num < min) return { valido: false, motivo: `${sensor} abaixo do minimo fisico (${min}).` };
  if (num > max) return { valido: false, motivo: `${sensor} acima do maximo fisico (${max}).` };
  return { valido: true };
}

module.exports = {
  verificarPH,
  converterADCparaPH,
  converterNivelReservatorio,
  verificarFluxoNFT,
  calcularFotoperiodo,
  calcularCicloIrrigacao,
  calcularPrevisaoColheita,
  validarLeituraSensor,
};
