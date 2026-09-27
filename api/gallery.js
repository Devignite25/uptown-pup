// Public: list gallery photos, newest first. Reads via the GitHub Contents API
// (authenticated, always fresh) so the admin's changes appear right away.
// Vercel edge caches 60s.
const REPO = 'Devignite25/uptown-pup';
const FILE = 'data/gallery.json';

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
    const photos = JSON.parse(Buffer.from(j.content, 'base64').toString());
    photos.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    res.status(200).json(photos);
  } catch (e) {
    res.status(200).json([]);
  }
};
