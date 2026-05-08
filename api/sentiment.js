function norm(s = '') {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
}

const POS = { 'locked in': 1.15, 'on fire': 1.2, dominant: 0.85, elite: 0.82, great: 0.62, sharp: 0.54, healthy: 0.48, available: 0.35, 'deep bench': 0.45, 'hot shooting': 0.74 };
const NEG = { 'is cooked': -1.25, fraud: -1.08, washed: -0.95, awful: -0.78, bad: -0.58, shaky: -0.52, questionable: -0.46, 'out tonight': -0.9, injured: -0.72, 'turnover prone': -0.56, 'cold shooting': -0.68 };
const NEGATORS = new Set(['not', 'never', 'no', "isn't", 'dont', "don't", 'without']);

function scoreText(text) {
  const t = norm(text);
  if (!t) return 0;
  let s = 0;
  for (const [k, v] of Object.entries(POS)) if (t.includes(norm(k))) s += v;
  for (const [k, v] of Object.entries(NEG)) if (t.includes(norm(k))) s += v;
  const toks = t.split(' ');
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i];
    const neg = NEGATORS.has(toks[i - 1]);
    if (['good', 'great', 'elite', 'dominant', 'strong', 'healthy', 'available', 'hot'].includes(w)) s += neg ? -0.55 : 0.55;
    if (['bad', 'awful', 'weak', 'struggling', 'injured', 'questionable', 'cold'].includes(w)) s += neg ? 0.55 : -0.55;
  }
  return Math.tanh(s / 2.25);
}

function createdWithinHours(post, hours) {
  const created = Number(post.created_utc || 0) * 1000;
  return Boolean(created) && Date.now() - created <= hours * 60 * 60 * 1000;
}

async function fetchRedditCurrent(q) {
  const url = `https://www.reddit.com/r/CollegeBasketball/search.json?q=${encodeURIComponent(q)}&sort=new&limit=75&restrict_sr=1&t=week`;
  const r = await fetch(url, { headers: { 'User-Agent': 'ScoutAI/1.0' } });
  if (!r.ok) throw new Error(`reddit ${r.status}`);
  const js = await r.json();
  return (js.data?.children || [])
    .map(x => x.data)
    .filter(p => p && createdWithinHours(p, 48))
    .map(p => `${p.title || ''} ${p.selftext || ''}`)
    .filter(Boolean);
}

async function fetchPullPushFallback(q) {
  const since = Math.floor(Date.now() / 1000) - 48 * 60 * 60;
  const url = `https://api.pullpush.io/reddit/search/submission/?q=${encodeURIComponent(q)}&subreddit=CollegeBasketball&after=${since}&size=75`;
  const r = await fetch(url, { headers: { 'User-Agent': 'ScoutAI/1.0' } });
  if (!r.ok) throw new Error(`pullpush ${r.status}`);
  const js = await r.json();
  return (js.data || [])
    .filter(p => createdWithinHours(p, 48))
    .map(p => `${p.title || ''} ${p.selftext || ''}`)
    .filter(Boolean);
}

export default async function handler(req, res) {
  try {
    const { a, b } = req.query;
    if (!a || !b) return res.status(400).json({ error: 'a and b NCAA teams are required' });

    let posts = [];
    let source = 'reddit_48h';
    try {
      posts = await fetchRedditCurrent(`${a} ${b}`);
    } catch {
      source = 'pullpush_48h';
      posts = await fetchPullPushFallback(`${a} ${b}`);
    }

    const aScores = [];
    const bScores = [];
    for (const p of posts) {
      const n = norm(p);
      const s = scoreText(p);
      if (n.includes(norm(a))) aScores.push(s);
      if (n.includes(norm(b))) bScores.push(s);
    }
    const avg = arr => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : 0);
    return res.status(200).json({
      source,
      windowHours: 48,
      sport: 'ncaa_basketball',
      mentions: aScores.length + bScores.length,
      a: avg(aScores),
      b: avg(bScores),
      aMentions: aScores.length,
      bMentions: bScores.length
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'sentiment error' });
  }
}
