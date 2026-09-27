const { authed } = require('../_auth');

const REPO = 'Devignite25/uptown-pup';
const FILE = 'data/gallery.json';
const GH = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

function ghHeaders() {
  return {
    'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'uptown-pup-admin'
  };
}

async function readGallery() {
  const r = await fetch(GH, { headers: ghHeaders() });
  if (r.status === 404) return { sha: null, photos: [] };
  if (!r.ok) throw new Error('read failed ' + r.status);
  const j = await r.json();
  return { sha: j.sha, photos: JSON.parse(Buffer.from(j.content, 'base64').toString()) };
}

async function writeGallery(photos, sha) {
  const content = Buffer.from(JSON.stringify(photos, null, 2)).toString('base64');
  const body = { message: 'Update gallery via admin dashboard', content };
  if (sha) body.sha = sha;
  const r = await fetch(GH, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('write failed ' + r.status);
}

function cleanStr(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
}

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: 'Not logged in' });

  try {
    if (req.method === 'GET') {
      const { photos } = await readGallery();
      photos.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return res.status(200).json(photos);
    }

    if (req.method === 'POST') {
      const { image, caption } = req.body || {};
      if (!/^assets\/[A-Za-z0-9._-]+$/.test(cleanStr(image, 200)))
        return res.status(400).json({ ok: false, error: 'Upload a photo first' });
      const { sha, photos } = await readGallery();
      photos.push({
        id: Date.now().toString(36),
        image: cleanStr(image, 200),
        caption: cleanStr(caption, 120),
        createdAt: new Date().toISOString()
      });
      await writeGallery(photos, sha);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const { id, caption } = req.body || {};
      const { sha, photos } = await readGallery();
      const p = photos.find(x => x.id === id);
      if (!p) return res.status(404).json({ ok: false, error: 'Not found' });
      p.caption = cleanStr(caption, 120);
      await writeGallery(photos, sha);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || '';
      const { sha, photos } = await readGallery();
      const kept = photos.filter(p => p.id !== id);
      if (kept.length === photos.length) return res.status(404).json({ ok: false, error: 'Not found' });
      await writeGallery(kept, sha);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Something went wrong saving. Try again.' });
  }
};
