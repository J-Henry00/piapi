const si = require('systeminformation');
const ping = require('ping');
const Chart = require('chart.js/auto');
const { createCanvas } = require('canvas');
const log = require('./log');

// Konfigurace
const HISTORY_SIZE = 60; // Historie za 60 minut
const TARGET_IP = '8.8.8.8'; // Cílová IP pro měření latence

function getDataHistory() {
  return JSON.parse(
    require('fs').readFileSync(
      require('path').join(__dirname, '..', 'db', 'networkDataHistory.json')
    )
  );
}

function writeDataHistory(data) {
  require('fs').writeFileSync(
    require('path').join(__dirname, '..', 'db', 'networkDataHistory.json'),
    JSON.stringify(data, null, 2)
  );
  return;
}

let dataHistory = getDataHistory();

// Funkce pro sběr dat a udržování historie
async function collectDataAndMaintainHistory() {
  try {
    const networkStats = await si.networkStats();
    const stats = networkStats[0];

    const res = await ping.promise.probe(TARGET_IP);
    const packetLoss = res.alive ? 0 : 100;
    const latency = res.avg || null;

    const timestamp = new Date().toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newPoint = {
      timestamp,
      rx_bytes: stats.rx_bytes,
      tx_bytes: stats.tx_bytes,
      latency,
      packet_loss: packetLoss,
    };

    if (dataHistory.length >= HISTORY_SIZE) {
      dataHistory.shift();
    }
    dataHistory.push(newPoint);
    writeDataHistory(dataHistory);

    log(
      `NETWORK: Data collected at ${timestamp}. History size: ${dataHistory.length}`
    );
  } catch (e) {
    console.error('Error during data collection:', e);
  }
}

// Funkce pro generování jednoho grafu, lze ji znovu použít
async function createChart(data, chartType, label, color, title, yAxisLabel) {
  const width = 1000;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const chartConfig = {
    type: chartType,
    data: {
      labels: data.map((d) => d.timestamp),
      datasets: [
        {
          label: label,
          data: data.map((d) => d.value),
          borderColor: color,
          tension: 0.1,
          fill: false,
          borderWidth: 2,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: yAxisLabel },
        },
        x: {
          title: { display: true, text: 'Čas' },
        },
      },
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 24 },
        },
      },
    },
  };

  new Chart(ctx, chartConfig);
  return canvas.toBuffer('image/png');
}

// Funkce pro generování grafu provozu
async function generateTrafficChart() {
  const rxData = dataHistory.map((d) => ({
    timestamp: d.timestamp,
    value: Math.round(d.rx_bytes / 1024 / 1024),
  }));
  const txData = dataHistory.map((d) => ({
    timestamp: d.timestamp,
    value: Math.round(d.tx_bytes / 1024 / 1024),
  }));

  const chartConfig = {
    type: 'line',
    data: {
      labels: dataHistory.map((d) => d.timestamp),
      datasets: [
        {
          label: 'Přijaté bajty (MB)',
          data: rxData.map((d) => d.value),
          borderColor: 'rgb(75, 192, 192)',
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Odeslané bajty (MB)',
          data: txData.map((d) => d.value),
          borderColor: 'rgb(255, 99, 132)',
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Množství dat (MB)' },
        },
        x: {
          title: { display: true, text: 'Čas' },
        },
      },
      plugins: {
        title: {
          display: true,
          text: 'Graf síťového provozu (posledních 60 minut)',
          font: { size: 24 },
        },
      },
    },
  };
  const canvas = createCanvas(1000, 600);
  const ctx = canvas.getContext('2d');
  new Chart(ctx, chartConfig);

  return canvas.toBuffer('image/png');
}

// Funkce pro generování grafu latence
async function generateLatencyChart() {
  const data = dataHistory.map((d) => ({
    timestamp: d.timestamp,
    value: d.latency || 0,
  }));
  return createChart(
    data,
    'line',
    'Latence (ms)',
    'rgb(54, 162, 235)',
    'Graf latence (posledních 60 minut)',
    'Latence (ms)'
  );
}

// Funkce pro generování grafu ztráty paketů
async function generatePacketLossChart() {
  const data = dataHistory.map((d) => ({
    timestamp: d.timestamp,
    value: d.packet_loss,
  }));
  return createChart(
    data,
    'line',
    'Ztráta paketů (%)',
    'rgb(255, 205, 86)',
    'Graf ztráty paketů (posledních 60 minut)',
    'Ztráta paketů (%)'
  );
}

// Exportování funkcí pro použití v routeru
module.exports = {
  collectDataAndMaintainHistory,
  generateTrafficChart,
  generateLatencyChart,
  generatePacketLossChart,
};
