const { exec } = require('child_process');

const command = 'ss -tulpn';

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error running command: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Error: ${stderr}`);
    return;
  }

  const lines = stdout
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.startsWith('Netid'));

  const filteredPorts = [];
  const processNames = ['node'];

  lines.forEach((line) => {
    const parts = line.split(/\s+/);
    const processInfo = parts[6] || '';
    const protocol = parts[0];
    const addressAndPort = parts[4];
    const port = addressAndPort.split(':')[1];

    if (
      !isNaN(port) &&
      processNames.some((name) => processInfo.includes(name))
    ) {
      filteredPorts.push({
        protocol: protocol,
        port: parseInt(port),
        process: processInfo,
      });
    }
  });

  console.log(JSON.stringify(filteredPorts, null, 2));
});
