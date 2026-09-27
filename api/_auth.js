const crypto = require('crypto');

const COOKIE = 'up_admin';

function sign(payload, secret) {
  const b = Buffer.from(payload).toString('base64url');
  const s = crypto.createHmac('sha256', secret).update(b).digest('base64url');
  return b + '.' + s;
}

function verify(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [b, s] = parts;
  const exp = crypto.createHmac('sha256', secret).update(b).digest('base64url');
  let ok = false;
  try { ok = crypto.timingSafeEqual(Buffer.from(s), Buffer.from(exp)); } catch { return false; }
  if (!ok) return false;
  try {
    const p = JSON.parse(Buffer.from(b, 'base64url').toString());
    return p.exp > Date.now();
  } catch { return false; }
}

function getToken(req) {
  const c = req.headers.cookie || '';
  const m = c.match(/(?:^|;\s*)up_admin=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function authed(req) {
  return verify(getToken(req), process.env.ADMIN_SECRET);
}

module.exports = { sign, verify, getToken, authed, COOKIE };
