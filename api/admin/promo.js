const { authed } = require('../_auth');

const REPO = 'Devignite25/uptown-pup';
const FILE = 'data/promo.json';
const GH = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

function ghHeaders() {
  return {
    'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'uptown-pup-admin'
  };
}

function cleanStr(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\x00-\x1f]/g, '').trim().slice(0, max);
}

function cleanPromo(p) {
  if (!p || typeof p !== 'object') return null;
  const id = cleanStr(p.id, 80).toLowerCase().replace(/[^a-z0-9-]/g, '') || 'promo';
  const dateOk = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : '';
  return {
    id,
    active: !!p.active,
    title: cleanStr(p.title, 80),
    message: cleanStr(p.message, 200),
    code: cleanStr(p.code, 40),
    ctaText: cleanStr(p.ctaText, 40) || 'Shop now',
    link: cleanStr(p.link, 300),
    startsAt: dateOk(p.startsAt),
    endsAt: dateOk(p.endsAt),
    updatedAt: cleanStr(p.updatedAt, 40)
  };
}

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: 'Not logged in' });

  try {
    if (req.method === 'GET') {
      const r = await fetch(GH, { headers: ghHeaders() });
      if (r.status === 404) return res.status(200).json(null);
      if (!r.ok) throw new Error('read failed ' + r.status);
      const j = await r.json();
      return res.status(200).json(JSON.parse(Buffer.from(j.content, 'base64').toString()));
    }

    if (req.method === 'PUT') {
      const promo = cleanPromo(req.body && req.body.promo);
      if (!promo) return res.status(400).json({ ok: false, error: 'Invalid promo' });
      const r = await fetch(GH, { headers: ghHeaders() });
      const sha = r.ok ? (await r.json()).sha : null;
      const content = Buffer.from(JSON.stringify(promo, null, 2)).toString('base64');
      const body = { message: 'Update promo via admin dashboard', content };
      if (sha) body.sha = sha;
      const w = await fetch(GH, {
        method: 'PUT',
        headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!w.ok) throw new Error('write failed ' + w.status);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Something went wrong saving. Try again.' });
  }
};
