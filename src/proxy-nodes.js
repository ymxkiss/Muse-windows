const crypto = require('node:crypto');
const yaml = require('js-yaml');

const MIHOMO_PROXY_TYPES = new Set([
  'http', 'socks4', 'socks5', 'ss', 'ssr', 'snell', 'vmess', 'vless', 'trojan',
  'hysteria', 'hysteria2', 'tuic', 'anytls', 'mieru', 'wireguard', 'ssh',
  'masque', 'trust-tunnel', 'openvpn', 'easytier', 'tailscale', 'zerotier'
]);

function decodeSubscriptionText(rawContent) {
  const text = Buffer.isBuffer(rawContent) ? rawContent.toString('utf8') : String(rawContent || '');
  const clean = text.replace(/^\uFEFF/, '').trim();
  const compact = clean.replace(/\s+/g, '');
  if (!compact || !/^[A-Za-z0-9+/_=-]+$/.test(compact)) return clean;
  try {
    const decoded = Buffer.from(compact.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
      .toString('utf8').replace(/^\uFEFF/, '').trim();
    if (decoded && /(?:https?:\/\/|socks5?:\/\/|^proxies\s*:|vmess:\/\/|vless:\/\/|ss:\/\/|trojan:\/\/)/im.test(decoded)) return decoded;
  } catch {}
  return clean;
}

function makeNode(subscription, profile, proxy, index) {
  if (!proxy || typeof proxy !== 'object' || Array.isArray(proxy)) return null;
  const name = String(proxy.name || '').trim();
  const type = String(proxy.type || '').toLowerCase();
  if (!name || !MIHOMO_PROXY_TYPES.has(type)) return null;
  const server = String(proxy.server || proxy.servername || '').trim();
  const port = Number(proxy.port || 0);
  const id = crypto.createHash('sha256')
    .update(JSON.stringify([subscription.id, index, name, type, server, port]))
    .digest('hex').slice(0, 24);
  return {
    id,
    name,
    type,
    server,
    port,
    sourceId: String(subscription.id),
    sourceName: String(subscription.name || '订阅'),
    proxyEntry: proxy,
    profile
  };
}

function parseUriLines(text, subscription) {
  const nodes = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const value = line.trim();
    if (!/^(?:https?|socks5?):\/\//i.test(value)) continue;
    try {
      const url = new URL(value);
      const type = url.protocol.slice(0, -1).toLowerCase();
      if (!['http', 'socks5'].includes(type)) continue;
      const name = url.hash ? decodeURIComponent(url.hash.slice(1)) : `${subscription.name || '订阅'} 节点 ${index + 1}`;
      const proxy = {
        name,
        type,
        server: url.hostname,
        port: Number(url.port),
        ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
        ...(url.password ? { password: decodeURIComponent(url.password) } : {})
      };
      if (!proxy.port) continue;
      const profile = { proxies: [proxy] };
      const node = makeNode(subscription, profile, proxy, index);
      if (node) nodes.push(node);
    } catch {}
  }
  return nodes;
}

function parseSubscriptionNodes(subscription, rawContent) {
  const text = decodeSubscriptionText(rawContent);
  let profile = null;
  try { profile = yaml.load(text); } catch {}
  if (profile && typeof profile === 'object' && Array.isArray(profile.proxies)) {
    return profile.proxies.map((proxy, index) => makeNode(subscription, profile, proxy, index)).filter(Boolean);
  }
  return parseUriLines(text, subscription);
}

module.exports = { parseSubscriptionNodes };
