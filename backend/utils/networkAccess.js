const os = require('os');

function stripTrailingSlash(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

function hostnameFromUrl(value = '') {
  try {
    return new URL(value).hostname;
  } catch (_) {
    return '';
  }
}

function isLoopbackHost(hostname = '') {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  return ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host);
}

function isPrivateIpv4(address = '') {
  if (/^10\./.test(address)) return true;
  if (/^192\.168\./.test(address)) return true;
  const match = String(address).match(/^172\.(\d{1,3})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function isLikelyVirtualInterface(interfaceName = '') {
  return /virtual|vmware|virtualbox|vethernet|wsl|docker|hyper-v|tailscale|vpn|hamachi|loopback/i.test(String(interfaceName || ''));
}

function interfaceScore(interfaceName = '', address = '') {
  const name = String(interfaceName || '').toLowerCase();
  let score = 0;

  // Prefer actual wireless adapters because mobile QR use normally means the
  // phone is on the same Wi-Fi/hotspot as the development computer.
  if (/wi-?fi|wlan|wireless|hotspot/.test(name)) score += 300;
  else if (/ethernet|local area connection|^eth|^en/.test(name)) score += 180;

  if (/192\.168\./.test(address)) score += 80;
  else if (/^10\./.test(address)) score += 60;
  else if (isPrivateIpv4(address)) score += 40;

  // Windows/WSL machines often expose several private virtual adapters. They
  // look like valid LAN addresses but cannot be reached by the phone.
  if (isLikelyVirtualInterface(name)) score -= 500;

  // 172.16/12 is very commonly used by WSL/Hyper-V/Docker on Windows. Keep it
  // as a fallback, but prefer 192.168/16 or 10/8 when a real LAN adapter exists.
  if (/^172\./.test(address)) score -= 90;

  return score;
}

function listLanIpv4Candidates() {
  const candidates = [];
  for (const [interfaceName, entries] of Object.entries(os.networkInterfaces())) {
    for (const item of entries || []) {
      const family = typeof item.family === 'string' ? item.family : item.family === 4 ? 'IPv4' : '';
      if (family !== 'IPv4' || item.internal || !item.address || !isPrivateIpv4(item.address)) continue;
      candidates.push({
        address: item.address,
        interfaceName,
        score: interfaceScore(interfaceName, item.address),
      });
    }
  }

  const deduped = new Map();
  for (const candidate of candidates) {
    const current = deduped.get(candidate.address);
    if (!current || candidate.score > current.score) deduped.set(candidate.address, candidate);
  }

  return [...deduped.values()].sort((a, b) => b.score - a.score || a.address.localeCompare(b.address));
}

function requestBaseUrl(req) {
  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = req.get('host');
  return host ? `${protocol}://${host}` : '';
}

function candidateForPrivateHost(hostname = '', candidates = listLanIpv4Candidates()) {
  const host = String(hostname || '').replace(/^\[|\]$/g, '');
  if (!isPrivateIpv4(host)) return null;
  return candidates.find((candidate) => candidate.address === host) || null;
}

function isPublicHostname(hostname = '') {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || isLoopbackHost(host)) return false;
  if (isPrivateIpv4(host)) return false;
  return true;
}

function phoneAccessibleBases(req, configuredValues = []) {
  const lanCandidates = listLanIpv4Candidates();
  const results = [];
  const seen = new Set();
  const add = (baseUrl, source, priority = 0, extra = {}) => {
    const clean = stripTrailingSlash(baseUrl);
    if (!clean || seen.has(clean)) return;
    const hostname = hostnameFromUrl(clean);
    const privateCandidate = candidateForPrivateHost(hostname, lanCandidates);
    const reachableFromPhone = isPublicHostname(hostname) || Boolean(privateCandidate);
    seen.add(clean);
    results.push({ baseUrl: clean, source, reachableFromPhone, priority, ...extra });
  };

  // A public configured URL (tunnel/domain) is the strongest option. A private
  // configured URL is accepted only when that IP is currently assigned to this
  // machine; this prevents stale MOBILE_PREVIEW_BASE_URL values from generating
  // dead QR codes such as old WSL/Hyper-V addresses.
  for (const rawValue of configuredValues) {
    const configured = stripTrailingSlash(rawValue);
    if (!configured) continue;
    const host = hostnameFromUrl(configured);
    if (isPublicHostname(host)) {
      add(configured, 'configured-public', 2000);
      continue;
    }
    const matched = candidateForPrivateHost(host, lanCandidates);
    if (matched) {
      add(configured, 'configured-lan', 1000 + matched.score, {
        lanIp: matched.address,
        interfaceName: matched.interfaceName,
        score: matched.score,
      });
    }
  }

  const requestBase = stripTrailingSlash(requestBaseUrl(req));
  if (requestBase) {
    const requestHost = hostnameFromUrl(requestBase);
    if (isPublicHostname(requestHost)) add(requestBase, 'request-public', 1900);
    else {
      const matched = candidateForPrivateHost(requestHost, lanCandidates);
      if (matched) add(requestBase, 'request-lan', 950 + matched.score, {
        lanIp: matched.address,
        interfaceName: matched.interfaceName,
        score: matched.score,
      });
    }
  }

  const port = Number(req.socket?.localPort || process.env.PORT || 5000);
  for (const candidate of lanCandidates) {
    add(`http://${candidate.address}:${port}`, 'lan', 900 + candidate.score, {
      lanIp: candidate.address,
      interfaceName: candidate.interfaceName,
      score: candidate.score,
    });
  }

  // Keep loopback only as a browser fallback; never call it phone reachable.
  if (!results.length && requestBase) {
    results.push({ baseUrl: requestBase, source: 'loopback', reachableFromPhone: false, priority: -1000 });
  }

  return results.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

function bestPhoneAccessibleBase(req, configuredValues = []) {
  const candidates = phoneAccessibleBases(req, configuredValues);
  return candidates.find((item) => item.reachableFromPhone) || candidates[0] || {
    baseUrl: '',
    source: 'unavailable',
    reachableFromPhone: false,
  };
}

module.exports = {
  stripTrailingSlash,
  hostnameFromUrl,
  isLoopbackHost,
  isPrivateIpv4,
  isLikelyVirtualInterface,
  interfaceScore,
  listLanIpv4Candidates,
  requestBaseUrl,
  phoneAccessibleBases,
  bestPhoneAccessibleBase,
};
