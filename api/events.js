// Public: list upcoming events. Reads via the GitHub Contents API (authenticated,
// always fresh) so the admin's changes appear right away. Vercel edge caches 60s.
const REPO = 'Devignite25/uptown-pup';
const FILE = 'data/events.json';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      headers: {
        'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'uptown-pup-site'
      }
    });
    if (!r.ok) throw new Error('github ' + r.status);
    const j = await r.json();
    const evts = JSON.parse(Buffer.from(j.content, 'base64').toString());
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = evts.filter(e => e && e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
    res.status(200).json(upcoming);
  } catch (e) {
    res.status(200).json([]);
  }
};
