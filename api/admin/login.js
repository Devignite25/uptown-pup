const crypto = require('crypto');
const { sign, COOKIE } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const password = (req.body && req.body.password) || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  const h = s => crypto.createHash('sha256').update(String(s)).digest();
  let ok = false;
  try { ok = password.length > 0 && crypto.timingSafeEqual(h(password), h(expected)); } catch { ok = false; }

  if (!ok) return res.status(401).json({ ok: false, error: 'Wrong password' });

  const payload = JSON.stringify({ exp: Date.now() + 30 * 24 * 3600 * 1000 });
  const token = sign(payload, process.env.ADMIN_SECRET);
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
  res.status(200).json({ ok: true });
};
