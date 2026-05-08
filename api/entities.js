export default async function handler(req, res) {
  try {
    const sport = String(req.query.sport || 'ncaa').toLowerCase();
    if (sport !== 'ncaa') {
      return res.status(400).json({ error: 'ScoutAI is limited to NCAA basketball only.' });
    }

    const endpoint = 'basketball/mens-college-basketball';
    const url = `https://site.api.espn.com/apis/site/v2/sports/${endpoint}/teams`;
    const r = await fetch(url, { headers: { 'User-Agent': 'ScoutAI/1.0' } });
    if (!r.ok) return res.status(502).json({ error: `espn ${r.status}` });

    const js = await r.json();
    const teams = (js.sports?.[0]?.leagues?.[0]?.teams || [])
      .map(t => t.team)
      .filter(t => t?.displayName)
      .map(t => ({
        id: t.id,
        name: t.displayName,
        abbreviation: t.abbreviation,
        rosterUrl: `https://www.espn.com/mens-college-basketball/team/roster/_/id/${t.id}`
      }));
    const deduped = [...new Map(teams.map(team => [team.name, team])).values()]
      .sort((a, b) => a.name.localeCompare(b.name));
    return res.status(200).json({
      sport: 'ncaa',
      source: 'ESPN NCAA basketball teams and roster IDs',
      entities: deduped.map(team => team.name),
      teams: deduped
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'server error' });
  }
}
