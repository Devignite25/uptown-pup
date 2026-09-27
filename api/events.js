// Public: list upcoming events (reads events.json straight from the GitHub repo,
// so the admin's changes go live without a redeploy).
const REPO = 'Devignite25/uptown-pup';
const BRANCH = 'main';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/data/events.json`);
    if (!r.ok) throw new Error('github ' + r.status);
    const evts = await r.json();
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = evts.filter(e => e && e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
    res.status(200).json(upcoming);
  } catch (e) {
    res.status(200).json([]);
  }
};
