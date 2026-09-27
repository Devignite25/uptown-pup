const crypto = require('crypto');
const { sign, COOKIE } = require('../_auth');

// Lightweight brute-force protection. Module state persists on warm
// serverless instances; not a hard distributed limit, but it makes
// online password guessing impractical.
const fails = new Map();
function tooMany(ip) {
  const now = Date.now();
  let e = fails.get(ip);
  if (!e || now > e.reset) { e = { n: 0, reset: now + 10 * 60 * 1000 }; fails.set(ip, e); }
  return e.n >= 8;
}
function recordFail(ip) {
  const now = Date.now();
  let e = fails.get(ip);
  if (!e || now > e.reset) { e = { n: 0, reset: now + 10 * 60 * 1000 }; fails.set(ip, e); }
  e.n++;
  if (fails.size > 5000) fails.clear();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const ip = String((req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim() || 'unknown';
  if (tooMany(ip)) return res.status(429).json({ ok: false, error: 'Too many attempts. Try again in a few minutes.' });

  const password = (req.body && req.body.password) || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  const h = s => crypto.createHash('sha256').update(String(s)).digest();
  let ok = false;
  try { ok = password.length > 0 && crypto.timingSafeEqual(h(password), h(expected)); } catch { ok = false; }

  if (!ok) { recordFail(ip); return res.status(401).json({ ok: false, error: 'Wrong password' }); }
  fails.delete(ip);

  const payload = JSON.stringify({ exp: Date.now() + 30 * 24 * 3600 * 1000 });
  const token = sign(payload, process.env.ADMIN_SECRET);
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
  res.status(200).json({ ok: true });
};
