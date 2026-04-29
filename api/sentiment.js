function norm(s=''){return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s']/g,' ').replace(/\s+/g,' ').trim()}
const POS={"locked in":1.1,"on fire":1.2,"dominant":0.8,"elite":0.8,"great":0.6,"sharp":0.5};
const NEG={"is cooked":-1.3,"fraud":-1.1,"washed":-1.0,"awful":-0.8,"bad":-0.6,"shaky":-0.5};
const NEGATORS=new Set(["not","never","no","isn't","dont","don't"]);
function scoreText(text){const t=norm(text);if(!t)return 0;let s=0;for(const[k,v]of Object.entries(POS))if(t.includes(norm(k)))s+=v;for(const[k,v]of Object.entries(NEG))if(t.includes(norm(k)))s+=v;const toks=t.split(' ');for(let i=0;i<toks.length;i++){const w=toks[i],neg=NEGATORS.has(toks[i-1]);if(['good','great','elite','dominant','strong'].includes(w))s+=neg?-0.55:0.55;if(['bad','awful','weak','struggling'].includes(w))s+=neg?0.55:-0.55;}return Math.tanh(s/2.2)}

async function fetchRedditCurrent(q,sub){
  const url=`https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(q)}&sort=new&limit=40&restrict_sr=1&t=month`;
  const r=await fetch(url,{headers:{'User-Agent':'ScoutAI/1.0'}});
  if(!r.ok) throw new Error(`reddit ${r.status}`);
  const js=await r.json();
  return (js.data?.children||[]).map(x=>x.data?.title+' '+(x.data?.selftext||'')).filter(Boolean);
}
async function fetchHistorical(q,sub){
  const url=`https://api.pullpush.io/reddit/search/submission/?q=${encodeURIComponent(q)}&subreddit=${encodeURIComponent(sub)}&size=40`;
  const r=await fetch(url,{headers:{'User-Agent':'ScoutAI/1.0'}});
  if(!r.ok) throw new Error(`historical ${r.status}`);
  const js=await r.json();
  return (js.data||[]).map(x=>(x.title||'')+' '+(x.selftext||'')).filter(Boolean);
}

export default async function handler(req,res){
  try{
    const {a,b,sub='nba'} = req.query;
    if(!a||!b) return res.status(400).json({error:'a and b required'});
    let posts=[],source='reddit';
    try{ posts=await fetchRedditCurrent(`${a} ${b}`,sub); }
    catch{ source='historical'; posts=await fetchHistorical(`${a} ${b}`,sub); }
    let aScores=[],bScores=[];
    for(const p of posts){ const n=norm(p),s=scoreText(p); if(n.includes(norm(a)))aScores.push(s); if(n.includes(norm(b)))bScores.push(s); }
    const avg=(arr)=>arr.length?arr.reduce((x,y)=>x+y,0)/arr.length:0;
    return res.status(200).json({source,mentions:aScores.length+bScores.length,a:avg(aScores),b:avg(bScores),aMentions:aScores.length,bMentions:bScores.length});
  }catch(e){ return res.status(500).json({error:e.message||'sentiment error'}); }
}
