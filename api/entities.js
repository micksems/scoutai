export default async function handler(req, res) {
  try {
    const sport = String(req.query.sport || '');
    const map = {
      ncaa: 'basketball/mens-college-basketball',
      nfl: 'football/nfl',
      nba: 'basketball/nba',
      ufc: 'mma/ufc'
    };
    const endpoint = map[sport];
    if (!endpoint) return res.status(400).json({ error: 'invalid sport' });

    const url = `https://site.api.espn.com/apis/site/v2/sports/${endpoint}/teams`;
    const r = await fetch(url, { headers: { 'User-Agent': 'ScoutAI/1.0' } });
    if (!r.ok) return res.status(502).json({ error: `espn ${r.status}` });
    const js = await r.json();
    const teams = (js.sports?.[0]?.leagues?.[0]?.teams || []).map(t => t.team?.displayName).filter(Boolean);
    const entities = [...new Set(teams)].sort();
    return res.status(200).json({ sport, entities });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'server error' });
  }
}
