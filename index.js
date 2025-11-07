require('dotenv').config();
const express = require('express');
const os = require('os');
const { exec } = require('child_process');
const cors = require('cors');
const axios = require('axios');
const app = express();

const log = require('./utils/log');
const formatTime = require('./utils/formatTime');
const getCPUs = require('./utils/getCPUs');
const getRunningServers = require('./utils/getRunningServers');
const getStorageInfo = require('./utils/getStorageInfo');
const generate = require('./utils/getNetworkGraphs');
const getDockerContainers = require('./utils/dockerContainers');
const getPM2apps = require('./api/activeNodeApps');

const INTERVAL_SECONDS = 60; // Interval sběru dat v sekundách (1x za minutu)
setInterval(generate.collectDataAndMaintainHistory, INTERVAL_SECONDS * 1000);
generate.collectDataAndMaintainHistory(); // Okamžitý start

const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (_req, res) =>
  res.status(200).json({
    success: true,
  })
);

app.get('/sysinfo', async (req, res) => {
  let info = {
    hostname: os.hostname(),
    arch: os.arch(),
    publicIp: null,
    uptime: {
      inSeconds: Math.floor(os.uptime()),
      inMinutes: os.uptime() / 60,
      inHours: os.uptime() / 3600,
      inDays: os.uptime() / 86400,
      formatted: formatTime(os.uptime()),
    },
  };
  if (req.query.ipkey == process.env.PUBLIC_IP_KEY)
    info.publicIp = (await axios.get('https://ifconfig.me/ip')).data;
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

app.get('/network', (_req, res) =>
  res.json({
    endpoints: ['/network/traffic', '/network/latency', '/network/packet-loss'],
  })
);

app.get('/network/traffic', async (_req, res) => {
  try {
    const image = await generate.generateTrafficChart();
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).end(image);
  } catch (error) {
    res.setHeader('Content-Type', 'image/png');
    return res.status(500).sendFile(__dirname + '/static/errorImg.jpg');
  }
});

app.get('/network/latency', async (_req, res) => {
  try {
    const image = await generate.generateLatencyChart();
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).end(image);
  } catch (error) {
    res.setHeader('Content-Type', 'image/png');
    return res.status(500).sendFile(__dirname + '/static/errorImg.jpg');
  }
});

app.get('/network/packet-loss', async (_req, res) => {
  try {
    const image = await generate.generatePacketLossChart();
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).end(image);
  } catch (error) {
    res.setHeader('Content-Type', 'image/png');
    return res.status(500).sendFile(__dirname + '/static/errorImg.jpg');
  }
});

app.get('/dockerContainers', async (_req, res) => {
  try {
    const containers = await getDockerContainers();
    if (containers.length == 0)
      return res.status(204).json({
        success: true,
        data: null,
      });

    return res.status(200).json({
      success: true,
      data: containers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting Docker containers',
    });
  }
});

app.get('/piLogs', (req, res) => {
  const linesCount = 100;

  exec(`journalctl -n ${linesCount} --no-pager`, (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching PI logs',
      });
    }
    if (stderr) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Error of standard output',
      });
    }
    const linesArray = stdout.split('\n').filter((line) => line.trim() !== '');
    return res.status(200).json({
      success: true,
      data: linesArray
        .map((line) => {
          const logRegex =
            /^([A-Z][a-z]{2} +\d{1,2} \d{2}:\d{2}:\d{2}) ([^ ]+) [^:]+: (.*)$/;
          const match = line.match(logRegex);
          let date = null,
            host = null,
            message = null,
            dateObj = null;
          if (match) {
            date = match[1];
            host = match[2]; // host name
            message = match[3];
            // Parse the date string into a Date object for sorting
            // The log date does not include the year, so we add the current year
            const currentYear = new Date().getFullYear();
            // Example: "Jun  7 19:32:01"
            // We need to parse it as "Jun  7 19:32:01 2024"
            dateObj = new Date(`${date} ${currentYear}`);
            // If the date is in the future (e.g., logs from December and now is January), subtract one year
            if (dateObj > new Date()) {
              dateObj.setFullYear(currentYear - 1);
            }
          }
          return { date, host, message, dateObj };
        })
        .sort((a, b) => {
          // Sort descending by dateObj (latest first)
          if (!a.dateObj && !b.dateObj) return 0;
          if (!a.dateObj) return 1;
          if (!b.dateObj) return -1;
          return b.dateObj - a.dateObj;
        })
        .map(({ date, host, message }) => ({ date, host, message })),
    });
  });
});

app.get('/pm2', async (req, res) => {
  try {
    const data = await getPM2apps();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);
  }
  return res.status(500).json({
    success: false,
    message: 'Error fetching active node apps',
  });
});

app.get('/restart-server', (req, res) => {
  if (req.query.action == 'success')
    return res.status(200).json({
      success: true,
      message: 'Server rebooted',
    });
  if (req.query.restartkey != process.env.RESTART_KEY)
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });

  try {
    exec('sudo reboot', (error, stdout, stderr) => {
      if (error) {
        console.error('Reboot error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error while rebooting the server',
        });
      }

      console.log(stdout);
      res.redirect('/restart-server?action=success');
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to restart system',
    });
  }
});

app.use((_req, res) =>
  res.status(404).json({
    success: false,
    message: `This resource doesn't exist`,
  })
);

app.listen(PORT, () => log(`piAPI running on port ${PORT}`));
