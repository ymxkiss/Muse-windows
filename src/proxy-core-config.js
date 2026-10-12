const yaml = require('js-yaml');

function makeMihomoConfig(node, port) {
  const profile = node.profile && typeof node.profile === 'object' ? node.profile : {};
  const selectedName = node.name === 'GLOBAL' ? `Muse-Node-${node.id}` : node.name;
  const proxies = (Array.isArray(profile.proxies) ? profile.proxies : []).map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const copy = { ...entry };
    if (String(entry.name || '').trim() === node.name && selectedName !== node.name) copy.name = selectedName;
    if (copy['dialer-proxy'] === node.name && selectedName !== node.name) copy['dialer-proxy'] = selectedName;
    return copy;
  });
  if (!proxies.some((proxy) => String(proxy?.name || '').trim() === selectedName)) {
    proxies.push({ ...node.proxyEntry, name: selectedName });
  }
  const groups = Array.isArray(profile['proxy-groups'])
    ? profile['proxy-groups'].filter((group) => group && group.name !== 'GLOBAL').map((group) => ({
        ...group,
        ...(Array.isArray(group.proxies) && selectedName !== node.name
          ? { proxies: group.proxies.map((name) => name === node.name ? selectedName : name) }
          : {})
      }))
    : [];
  groups.push({ name: 'GLOBAL', type: 'select', proxies: [selectedName] });
  const config = {
    'mixed-port': port,
    'allow-lan': false,
    'bind-address': '127.0.0.1',
    mode: 'global',
    'log-level': 'warning',
    proxies,
    'proxy-groups': groups
  };
  if (profile['proxy-providers'] && typeof profile['proxy-providers'] === 'object') {
    config['proxy-providers'] = profile['proxy-providers'];
  }
  return yaml.dump(config, { noRefs: true, lineWidth: -1, sortKeys: false });
}

function proxyConfiguration(port) {
  const endpoint = `127.0.0.1:${port}`;
  return { mode: 'fixed_servers', proxyRules: `http=${endpoint};https=${endpoint}` };
}

module.exports = { makeMihomoConfig, proxyConfiguration };
