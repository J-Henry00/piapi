const Docker = require('dockerode');

const docker = new Docker();

async function getActiveContainers() {
  try {
    const containers = await docker.listContainers({ all: false });
    let data = [];

    if (containers.length == 0) return [];
    containers.forEach((c) => {
      let model = {
        id: c.Id,
        name: c.Names[0].substring(1),
        image: c.Image,
        imageId: c.ImageID,
        command: c.Command,
        ports: c.Ports.map((p) => ({
          publicPort: p.PublicPort,
          privatePort: p.PrivatePort,
          ip: p.IP,
          type: p.Type,
        })),
        status: c.Status,
      };

      data.push(model);
    });
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

module.exports = getActiveContainers;
