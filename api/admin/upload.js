const { authed } = require('../_auth');

const REPO = 'Devignite25/uptown-pup';
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
// ~4.5MB of binary after base64 decode; Vercel request bodies cap out near this.
const MAX_B64_LEN = 6_000_000;

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: 'Not logged in' });
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  try {
    const { filename, data } = req.body || {};
    if (typeof filename !== 'string' || typeof data !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing file' });
    }
    const ext = filename.toLowerCase().split('.').pop();
    if (!ALLOWED_EXT.includes(ext)) {
      return res.status(400).json({ ok: false, error: 'Only JPG, PNG, WebP, or GIF images' });
    }
    if (data.length > MAX_B64_LEN || !/^[A-Za-z0-9+/=\s]+$/.test(data)) {
      return res.status(400).json({ ok: false, error: 'Image is too large' });
    }
    const base = filename.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'photo';
    const path = `assets/${Date.now()}-${base}.${ext === 'jpeg' ? 'jpg' : ext}`;

    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'uptown-pup-admin',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: `Upload ${path} via admin dashboard`, content: data.replace(/\s/g, '') })
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error('github ' + r.status + ' ' + t.slice(0, 120));
    }
    return res.status(200).json({ ok: true, path });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Upload failed. Try again.' });
  }
};
