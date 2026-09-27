const { authed } = require('../_auth');

const REPO = 'Devignite25/uptown-pup';
const FILE = 'data/events.json';
const GH = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

function ghHeaders() {
  return {
    'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'uptown-pup-admin'
  };
}

async function readEvents() {
  const r = await fetch(GH, { headers: ghHeaders() });
  if (r.status === 404) return { sha: null, events: [] };
  if (!r.ok) throw new Error('read failed ' + r.status);
  const j = await r.json();
  return { sha: j.sha, events: JSON.parse(Buffer.from(j.content, 'base64').toString()) };
}

async function writeEvents(events, sha) {
  const content = Buffer.from(JSON.stringify(events, null, 2)).toString('base64');
  const body = { message: 'Update events via admin dashboard', content };
  if (sha) body.sha = sha;
  const r = await fetch(GH, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('write failed ' + r.status);
}

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: 'Not logged in' });

  try {
    if (req.method === 'GET') {
      const { events } = await readEvents();
      return res.status(200).json(events.sort((a, b) => (a.date < b.date ? -1 : 1)));
    }

    if (req.method === 'POST') {
      const { title, date, location, notes } = req.body || {};
      if (!title || !date || !location) return res.status(400).json({ ok: false, error: 'Title, date, and location are required' });
      const { sha, events } = await readEvents();
      events.push({ id: Date.now().toString(36), title, date, location, notes: notes || '' });
      await writeEvents(events, sha);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || '';
      const { sha, events } = await readEvents();
      const kept = events.filter(e => e.id !== id);
      if (kept.length === events.length) return res.status(404).json({ ok: false, error: 'Not found' });
      await writeEvents(kept, sha);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Something went wrong saving. Try again.' });
  }
};
