const { authed } = require('../_auth');

const REPO = 'Devignite25/uptown-pup';
const FILE = 'data/products.json';
const GH = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
const CATS = ['everyday', 'halloween', 'christmas', 'seasonal'];

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

function cleanProduct(p) {
  if (!p || typeof p !== 'object') return null;
  const id = cleanStr(p.id, 80).toLowerCase().replace(/[^a-z0-9-]/g, '');
  const name = cleanStr(p.name, 80);
  const category = CATS.includes(p.category) ? p.category : 'everyday';
  const blurb = cleanStr(p.blurb, 160);
  let priceFrom = Number(p.priceFrom);
  if (!isFinite(priceFrom) || priceFrom < 0) priceFrom = 25;
  priceFrom = Math.round(priceFrom);
  const etsy = cleanStr(p.etsy, 300);
  const stripe = cleanStr(p.stripe, 300);
  const image = cleanStr(p.image, 200);
  const gallery = Array.isArray(p.gallery)
    ? p.gallery.map(g => cleanStr(g, 200)).filter(g => /^assets\/[A-Za-z0-9._-]+$/.test(g)).slice(0, 12)
    : [];
  if (!id || !name || !/^assets\/[A-Za-z0-9._-]+$/.test(image)) return null;
  return { id, name, category, blurb, priceFrom, etsy: etsy || null, stripe: stripe || null, image, gallery };
}

async function readProducts() {
  const r = await fetch(GH, { headers: ghHeaders() });
  if (r.status === 404) return { sha: null, products: [] };
  if (!r.ok) throw new Error('read failed ' + r.status);
  const j = await r.json();
  const products = JSON.parse(Buffer.from(j.content, 'base64').toString());
  return { sha: j.sha, products: Array.isArray(products) ? products : [] };
}

async function writeProducts(products, sha) {
  const content = Buffer.from(JSON.stringify(products, null, 2)).toString('base64');
  const body = { message: 'Update products via admin dashboard', content };
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
      const { products } = await readProducts();
      return res.status(200).json(products);
    }

    if (req.method === 'PUT') {
      const list = req.body && req.body.products;
      if (!Array.isArray(list)) return res.status(400).json({ ok: false, error: 'Invalid product list' });
      if (list.length > 200) return res.status(400).json({ ok: false, error: 'Too many products' });
      const cleaned = [];
      const seen = new Set();
      for (const p of list) {
        const c = cleanProduct(p);
        if (!c || seen.has(c.id)) continue;
        seen.add(c.id);
        cleaned.push(c);
      }
      const { sha } = await readProducts();
      await writeProducts(cleaned, sha);
      return res.status(200).json({ ok: true, count: cleaned.length });
    }

    return res.status(405).json({ ok: false });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Something went wrong saving. Try again.' });
  }
};
