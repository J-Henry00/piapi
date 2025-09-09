const { exec } = require('child_process');

module.exports = () => {
  return new Promise((resolve, reject) => {
    exec('mpstat -P ALL 1 1', (error, stdout, stderr) => {
      if (error) {
        console.error(`Chyba při spouštění příkazu: ${error.message}`);
        console.error(
          'Možná je potřeba nainstalovat balíček sysstat: sudo apt-get install sysstat'
        );
        return reject(error);
      }

      if (stderr) {
        console.error(`Chyba standardního výstupu: ${stderr}`);
        return reject(new Error(stderr));
      }

      const lines = stdout.trim().split('\n');
      let cpuUsage = [];
      const dataStartIndex =
        lines.findIndex((line) => line.includes('CPU')) + 2;

      if (dataStartIndex >= lines.length) {
        return reject(new Error('Nepodařilo se parsovat data o CPU.'));
      }

      for (let i = dataStartIndex; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts[1] && parts[1] !== 'all' && parts.length > 10) {
          const idle = parseFloat(parts[parts.length - 1]);
          const usage = 100 - idle;
          cpuUsage.push(parseFloat(usage.toFixed(2)));
        }
      }
      // The array is being duplicated because 'mpstat -P ALL' outputs a header and data for each CPU, but sometimes the data is repeated.
      // To avoid duplicates, we can use a Set to track which CPU indices we've already processed.
      let seenCPUs = new Set();
      let uniqueCpuUsage = [];
      for (let i = dataStartIndex; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts[1] && parts[1] !== 'all' && parts.length > 10) {
          const cpuIndex = parts[1];
          if (!seenCPUs.has(cpuIndex)) {
            seenCPUs.add(cpuIndex);
            const idle = parseFloat(parts[parts.length - 1]);
            const usage = 100 - idle;
            uniqueCpuUsage.push(parseFloat(usage.toFixed(2)));
          }
        }
      }
      cpuUsage = uniqueCpuUsage;
      cpuUsage.shift();
      resolve(cpuUsage);
    });
  });
};
