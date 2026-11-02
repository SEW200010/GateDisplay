const os = require('os');

function normalizeIp(ip) {
  if (!ip) return '';
  ip = String(ip).trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7); // IPv4-mapped IPv6
  return ip;
}

function isLoopback(ip) {
  return ip === '::1' || ip.startsWith('127.');
}

// This machine's own LAN IPv4 (SELF_IP wins when set)
function machineIp() {
  if (process.env.SELF_IP) return process.env.SELF_IP.trim();
  for (const list of Object.values(os.networkInterfaces())) {
    for (const nic of list || []) {
      if (nic.family === 'IPv4' && !nic.internal) return nic.address;
    }
  }
  return '127.0.0.1';
}

// The IP used to look up the display in tblGateDisplays
function resolveClientIp(req) {
  if (process.env.ALLOW_IP_OVERRIDE === 'true' && req.query.ip) {
    return normalizeIp(req.query.ip);
  }
  const ip = normalizeIp(req.ip);
  return isLoopback(ip) ? machineIp() : ip;
}

module.exports = { normalizeIp, isLoopback, machineIp, resolveClientIp };
