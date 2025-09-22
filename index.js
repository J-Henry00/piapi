require('dotenv').config();
const express = require('express');
const os = require('os');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();

const log = require('./utils/log');
const formatTime = require('./utils/formatTime');
const getCPUs = require('./utils/getCPUs');
const getRunningServers = require('./utils/getRunningServers');
const getStorageInfo = require('./utils/getStorageInfo');

const PORT = process.env.PORT || 3000;

app.use(cors());

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
      total: {
        bytes: os.totalmem(),
        kilobytes: Math.floor(os.totalmem() / 1_000),
        megabytes: Math.floor(os.totalmem() / 1_000_000),
        gigabytes: Math.floor(os.totalmem() / 1_000_000_000),
      },
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
        percentage: Math.floor((os.freemem() * 100) / os.totalmem()),
      },
      full: {
        bytes: os.totalmem() - os.freemem(),
        kiloBytes: (os.totalmem() - os.freemem()) / 1_000,
        megaBytes: Math.floor((os.totalmem() - os.freemem()) / 1_000_000),
        gigaBytes: Math.floor((os.totalmem() - os.freemem()) / 1_000_000_000),
        formattedMB: `${Math.floor(
          (os.totalmem() - os.freemem()) / 1_000_000
        )} / ${Math.floor(os.totalmem() / 1_000_000)} MB (${Math.floor(
          ((os.totalmem() - os.freemem()) * 100) / os.totalmem()
        )} %)`,
        formattedGB: `${Math.floor(
          (os.totalmem() - os.freemem()) / 1_000_000_000
        )} / ${Math.floor(os.totalmem() / 1_000_000_000)} GB (${Math.floor(
          ((os.totalmem() - os.freemem()) * 100) / os.totalmem()
        )} %)`,
        percentage: Math.floor(
          ((os.totalmem() - os.freemem()) * 100) / os.totalmem()
        ),
      },
    },
  };

  return res.status(200).json({
    success: true,
    data: info,
  });
});

app.get('/services', async (_req, res) => {
  const hostnames = await getRunningServers();

  if (hostnames == null) {
    return res.status(500).json({
      success: false,
      message: 'Error getting tunnel config data',
    });
  }
  return res.status(200).json({
    success: true,
    data: hostnames,
  });
});

app.get('/storage', async (req, res) => {
  let data = await getStorageInfo();

  if (
    !(
      req.query.showAll &&
      (req.query.showAll.toLowerCase() == 'yes' ||
        req.query.showAll.toLowerCase() == 'true')
    )
  )
    data = data.filter(
      (d) => d.mounted_on == '/' || d.mounted_on == '/media/pi/nextcloud-hdd'
    );

  return res.status(200).json({ success: true, data });
});

app.use((_req, res) =>
  res.status(404).json({
    success: false,
    message: `This resource doesn't exist`,
  })
);

app.listen(PORT, () => log(`piAPI running on port ${PORT}`));
