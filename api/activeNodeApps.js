const pm2 = require('pm2');

// Funkce, která vrátí Promise s daty o PM2 procesech jako JavaScript objekt
function getPm2Data() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        console.error('Chyba při připojení k PM2:', err.message);
        return reject(err);
      }

      pm2.list((err, list) => {
        if (err) {
          pm2.disconnect();
          console.error('Chyba při získávání seznamu:', err.message);
          return reject(err);
        }

        const data = list.map((app) => ({
          id: app.pm_id,
          name: app.name,
          online: app.pm2_env.status == 'online',
          pid: app.pid,
          cpu: app.monit.cpu,
          ram: (app.monit.memory / 1024 / 1024).toFixed(2) + ' MB',
          commands: {
            start: `pm2 start ${app.name}`,
            stop: `pm2 stop ${app.name}`,
            restart: `pm2 restart ${app.name}`,
            logs: `pm2 logs ${app.name} --lines 40`,
          },
        }));

        pm2.disconnect();
        resolve(data);
      });
    });
  });
}

module.exports = getPm2Data;
