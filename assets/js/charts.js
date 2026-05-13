/**
 * @file charts.js
 * @module charts
 * @description Graficos do dashboard com dados reais.
 * @requisitos RF03, RF10, RNF13
 * @ator Visualizador, Operador
 * @mode real
 */

const Charts = {
  envChartInstance: null,
  MAX_POINTS: 20,

  init() {
    this._initEnvChart();
  },

  _initEnvChart() {
    const canvas = document.getElementById('envChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    this.envChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Temperatura (C)',
            data: [],
            borderColor: '#98ce00',
            backgroundColor: 'rgba(152, 206, 0, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: isMobile ? 2 : 3,
          },
          {
            label: 'Umidade (%)',
            data: [],
            borderColor: '#343a40',
            borderDash: [5, 5],
            tension: 0.4,
            fill: false,
            pointRadius: isMobile ? 2 : 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: {
            position: isMobile ? 'bottom' : 'top',
            labels: {
              boxWidth: isMobile ? 10 : 16,
              font: { family: "'Inter', sans-serif", size: isMobile ? 10 : 12 },
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: true,
              maxRotation: 0,
              minRotation: 0,
              maxTicksLimit: isMobile ? 4 : 7,
            },
          },
        },
      },
    });
  },

  addDataPoint(temperature, humidity) {
    if (!this.envChartInstance) return;
    if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) return;

    const chart = this.envChartInstance;
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(parseFloat(temperature.toFixed(1)));
    chart.data.datasets[1].data.push(parseFloat(humidity.toFixed(1)));

    if (chart.data.labels.length > this.MAX_POINTS) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
      chart.data.datasets[1].data.shift();
    }

    chart.update('none');
  },
};
