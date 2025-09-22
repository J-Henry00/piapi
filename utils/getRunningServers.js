const axios = require('axios');

const API_TOKEN = process.env.CLOUDFLARE_API;
// const ZONE = process.env.CLOUDFLARE_ZONE;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT;
const TUNNEL = process.env.CLOUDFLARE_TUNNEL;

async function getPublicServers() {
  try {
    const response = await axios.get(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/cfd_tunnel/${TUNNEL}/configurations`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.data; // V axiosu je data přímo v response objektu

    if (!data.success) {
      console.error(`Error during getting tunnel config:`, data.errors);
      return null;
    }

    const hostnames = data.result.config.ingress
      .filter((ingress) => ingress.hostname)
      .map((ingress) => ({
        hostname: ingress.hostname,
        local: ingress.service,
        protocol: ingress.service.split(':')[0].toUpperCase(),
        port:
          ingress.service.split(':')[0].toUpperCase() == 'SSH'
            ? 22
            : ingress.service.split(':')[0].toUpperCase() == 'SMB'
            ? 445
            : parseInt(ingress.service.split(':')[2]),
      }));

    return hostnames;
  } catch (error) {
    console.error('An error occurred:', error);
    return null;
  }
}

module.exports = getPublicServers;
