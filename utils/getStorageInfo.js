const { exec } = require('child_process');

function getDiskUsageAsJson() {
  return new Promise((resolve, reject) => {
    exec('df -h', (error, stdout, stderr) => {
      if (error) {
        return reject(`Chyba při spouštění příkazu: ${error.message}`);
      }
      if (stderr) {
        return reject(`Chyba standardního výstupu: ${stderr}`);
      }

      const lines = stdout.trim().split('\n');
      const headers = lines[0].split(/\s+/);
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/);

        // Získání hodnot z řádků
        const filesystem = parts[headers.indexOf('Filesystem')];
        const mountedOn = parts[headers.indexOf('Mounted')];
        const sizeString = parts[headers.indexOf('Size')];
        const usedString = parts[headers.indexOf('Used')];
        const availString = parts[headers.indexOf('Avail')];
        const usedPercentageRaw = parts[headers.indexOf('Use%')];

        // Funkce pro parsování a konverzi velikosti na bajty
        const parseSizeToBytes = (sizeString) => {
          let totalBytes = 0;
          let sizeValue = parseFloat(sizeString);
          let unit = sizeString.slice(-1).toUpperCase();

          if (unit === 'G') {
            totalBytes = sizeValue * 1024 * 1024 * 1024;
          } else if (unit === 'M') {
            totalBytes = sizeValue * 1024 * 1024;
          } else if (unit === 'K') {
            totalBytes = sizeValue * 1024;
          }
          return totalBytes;
        };

        const totalBytes = parseSizeToBytes(sizeString);
        const usedBytes = parseSizeToBytes(usedString);
        const availBytes = parseSizeToBytes(availString);

        // Vytvoření vnořených objektů s daty
        const entry = {
          filesystem: filesystem,
          mounted_on: mountedOn,
          total: {
            raw: sizeString,
            mb: parseFloat((totalBytes / (1024 * 1024)).toFixed(2)),
            gb: parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(2)),
          },
          full: {
            raw: usedString,
            mb: parseFloat((usedBytes / (1024 * 1024)).toFixed(2)),
            gb: parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(2)),
            percentage: parseInt(usedPercentageRaw.replace('%', ''), 10),
          },
          free: {
            raw: availString,
            mb: parseFloat((availBytes / (1024 * 1024)).toFixed(2)),
            gb: parseFloat((availBytes / (1024 * 1024 * 1024)).toFixed(2)),
            percentage: 100 - parseInt(usedPercentageRaw.replace('%', ''), 10),
          },
        };

        data.push(entry);
      }

      resolve(data);
    });
  });
}

module.exports = getDiskUsageAsJson;
