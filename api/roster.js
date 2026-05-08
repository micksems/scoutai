export default async function handler(req, res) {
  try {
    const id = String(req.query.id || '').trim();
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'valid ESPN NCAA team id required' });

    const season = new Date().getUTCFullYear();
    const url = `https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/${season}/teams/${id}/athletes?limit=200`;
    const r = await fetch(url, { headers: { 'User-Agent': 'ScoutAI/1.0' } });
    if (!r.ok) return res.status(502).json({ error: `espn roster ${r.status}` });

    const js = await r.json();
    const athleteRefs = js.items || [];
    const athletes = athleteRefs.map(item => ({ ref: item.$ref })).filter(item => item.ref);
    return res.status(200).json({
      sport: 'ncaa_basketball',
      source: 'ESPN NCAA basketball roster API',
      teamId: id,
      season,
      rosterCount: athletes.length,
      athletes,
      rosterUrl: `https://www.espn.com/mens-college-basketball/team/roster/_/id/${id}`
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'roster error' });
  }
}
