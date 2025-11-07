// MAKE CRUD app for controling the public hostnames - IMPORTANT: ADD AUTHORIZATION HERE AT THE START
// ALSO ADD EDIT FUNCTION

const axios = require('axios');

const apiUrl = `https://api.cloudflare.com/client/v4/`;
const getUrl = (path) => apiUrl + path;

const API_KEY = process.env.CF_API_TKN,
  ZONE_ID = process.env.CF_ZONE_ID,
  TUNNEL_ID = process.env.CF_TUNNEL_ID,
  ACCOUNT_ID = process.env.CF_ACCOUNT_ID;

async function createDNSrecord(subdomainName) {
  try {
    const response = await axios.post(
      getUrl(`zones/${ZONE_ID}/dns_records`),
      {
        type: 'CNAME',
        name: subdomainName,
        content: `${TUNNEL_ID}.cfargotunnel.com`,
        ttl: 1,
        proxied: true,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`CF API: ${subdomainName} záznam úspětně založen`);
    return response.data.result;
  } catch (error) {
    console.error(
      `CF API: Chyba při vytváření DNS záznamu: ${error.response.data}`
    );
    return null;
  }
}

async function deleteDnsRecord(subdomainName) {
  try {
    const searchResponse = await axios.get(
      getUrl(`zones/${ZONE_ID}/dns_records?name=${subdomainName}`),
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    const record = searchResponse.data.result[0];

    if (!record || record == undefined) {
      console.log(`CF API: DNS Záznam pro ${subdomainName} nebyl nalezen`);
      return null;
    }

    const recordId = record.id;

    await axios.delete(getUrl(`zones/${ZONE_ID}/dns_records/${recordId}`), {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    console.log(`CF API: DNS záznam pro ${subdomainName} úspěšně odstraněn`);
    return true;
  } catch (error) {
    console.error(
      `CF API: Chyba při odstraňování DNS záznamu ${subdomainName}: ${error.response.data}`
    );
    return false;
  }
}

async function getCurrentTunnelConfig() {
  try {
    const response = await axios.get(
      getUrl(`accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations`),
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );
    return response.data.result.config;
  } catch (error) {
    console.error(
      `CF API: Chyba při získávání Ingress konfigurace: ${error.response.data}`
    );
    return null;
  }
}

async function addNewIngressRule(subdomainName, localPort) {
  let currentConfig = await getCurrentTunnelConfig();
  if (!currentConfig || currentConfig == null)
    throw new Error('Cannot get current config of tunnel');

  const newRule = {
    hostname: subdomainName,
    service: `http://localhost:${localPort}`,
  };

  currentConfig.ingress.unshift(newRule);

  try {
    await axios.put(
      getUrl(`accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations`),
      { config: currentConfig },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': `application/json`,
        },
      }
    );
    console.log(`CF API: Pravidlo pro ${subdomainName} úspěšně přidáno`);
    return true;
  } catch (error) {
    console.error(
      `CF API: Chyba při aktualizaci konfigurace tunelu: ${error.response.data}`
    );
    return false;
  }
}

async function removeIngressRule(subdomainName) {
  let currentConfig = await getCurrentTunnelConfig();
  if (!currentConfig || currentConfig == null)
    throw new Error('Cannot get current config of tunnel');

  const newIngressRules = currentConfig.ingress.filter(
    (r) => r.hostname != subdomainName
  );

  if (newIngressRules.length === currentConfig.ingress.length) {
    console.log(
      `CF API: Pravidlo pro ${subdomainName} nebylo nalezeno. Žádná změna neprovedena.`
    );
    return null;
  }

  currentConfig.ingress = newIngressRules;

  try {
    await axios.put(
      getUrl(`accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations`),
      { config: currentConfig },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': `application/json`,
        },
      }
    );
    console.log(`CF API: Pravidlo pro ${subdomainName} úspěšně odstraněno`);
    return true;
  } catch (error) {
    console.error(
      `CF API: Chyba při aktualizaci konfigurace tunelu: ${error.response.data}`
    );
    return false;
  }
}

module.exports = {
  createDNSrecord,
  deleteDNSRecord: deleteDnsRecord,
  getIngressRules: getCurrentTunnelConfig,
  addNewIngressRule,
  removeIngressRule,
};
