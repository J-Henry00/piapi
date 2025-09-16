require('dotenv').config();
const express = require('express');
const os = require('os');
const { exec } = require('child_process');
const app = express();

const log = require('./utils/log');
const formatTime = require('./utils/formatTime');
const getCPUs = require('./utils/getCPUs');

const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) =>
  res.status(200).json({
    success: true,
  })
);

app.get('/sysinfo', (_req, res) => {
  let info = {
    hostname: os.hostname(),
    arch: os.arch(),
    uptime: {
      inSeconds: Math.floor(os.uptime()),
      inMinutes: os.uptime() / 60,
      inHours: os.uptime() / 3600,
      inDays: os.uptime() / 86400,
      formatted: formatTime(os.uptime()),
    },
  };
  exec('/home/pi/Scripts/viewTemp.sh', (err, temp, errMsg) => {
    if (err) {
      log(`Error running 'temp' command: `);
      console.error(err);
      return res.status(500).json({
        success: false,
        message: `Error fetching CPU temperature`,
      });
    }
    if (errMsg) {
      log(`Standard output error: ${errMsg}`);
      return res.status(500).json({
        success: false,
        message: `Error fetching CPU temperature`,
      });
    }
    info['tempCelsius'] = parseFloat(temp.split('=')[1].split("'")[0]);
    info['tempFarenheit'] = parseFloat(info['tempCelsius']) * (9 / 5) + 32;

    return res.status(200).json({
      success: true,
      data: info,
    });
  });
});

app.get('/resources', async (_req, res) => {
  let info = {
    cpu: {
      coreCount: os.cpus().length,
      cpuModel: os.cpus()[0].model,
      cpuSpeed: os.cpus()[0].speed,
      utilizationPercent: await getCPUs(),
    },
    ram: {
      free: {
        bytes: os.freemem(),
        kiloBytes: os.freemem() / 1_000,
        megaBytes: Math.floor(os.freemem() / 1_000_000),
        gigaBytes: Math.floor(os.freemem() / 1_000_000_000),
        formattedMB: `${Math.floor(os.freemem() / 1_000_000)} / ${Math.floor(
          os.totalmem() / 1_000_000
        )} MB (${Math.floor(
          (Math.floor(os.freemem()) / Math.floor(os.totalmem())) * 100
        )} %)`,
        formattedGB: `${Math.floor(
          os.freemem() / 1_000_000_000
        )} / ${Math.floor(os.totalmem() / 1_000_000_000)} GB (${Math.floor(
          (Math.floor(os.freemem()) / Math.floor(os.totalmem())) * 100
        )} %)`,
      },
      full: {
        bytes: os.totalmem() - os.freemem(),
        kiloBytes: (os.totalmem() - os.freemem()) / 1_000,
        megaBytes: Math.floor((os.totalmem() - os.freemem()) / 1_000_000),
        gigaBytes: Math.floor((os.totalmem() - os.freemem()) / 1_000_000_000),
        formattedMB: `${Math.floor(
          (os.totalmem() - os.freemem()) / 1_000_000
        )} / ${Math.floor(os.totalmem() / 1_000_000)} MB (${Math.floor(
          (Math.floor(os.totalmem() - os.freemem()) /
            Math.floor(os.freemem())) *
            100
        )} %)`,
        formattedGB: `${Math.floor(
          (os.totalmem() - os.freemem()) / 1_000_000_000
        )} / ${Math.floor(os.totalmem() / 1_000_000_000)} GB (${Math.floor(
          (Math.floor(os.totalmem() - os.freemem()) /
            Math.floor(os.freemem())) *
            100
        )} %)`,
      },
    },
  };

  return res.status(200).json({
    success: true,
    data: info,
  });
});

app.use((_req, res) =>
  res.status(404).json({
    success: false,
    message: `This resource doesn't exist`,
  })
);

app.listen(PORT, () => log(`piAPI running on port ${PORT}`));
