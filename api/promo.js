// Public: current deal/promo. Reads via the GitHub Contents API (authenticated,
// always fresh) so the admin's changes appear right away. Vercel edge caches 60s.
const REPO = 'Devignite25/uptown-pup';
const FILE = 'data/promo.json';

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
    if (r.status === 404) return res.status(200).json(null);
    if (!r.ok) throw new Error('github ' + r.status);
    const j = await r.json();
    const promo = JSON.parse(Buffer.from(j.content, 'base64').toString());
    res.status(200).json(promo && typeof promo === 'object' ? promo : null);
  } catch (e) {
    res.status(200).json(null);
  }
};
