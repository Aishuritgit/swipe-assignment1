/*
Serverless proxy for OpenAI.
Deploy this file under /api/openai.js for Vercel (or adapt for Netlify).
It expects OPENAI_API_KEY set in environment variables.
It supports two endpoints:
  POST /api/score  { question, answer } -> { score, feedback }
  POST /api/generate { topic, difficulty } -> { question }
*/
const handler = async (req, res) => {
  if(req.method !== 'POST') return res.status(405).end()
  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname || ''

  try{
    const body = await new Promise(resolve=>{
      let data=''; req.on('data', c=> data+=c); req.on('end', ()=> resolve(JSON.parse(data||'{}')))
    })
    const key = process.env.OPENAI_API_KEY
    if(!key) return res.status(500).json({ error: 'OPENAI_API_KEY not set' })

    if(pathname.endsWith('/api/score') || pathname.endsWith('/api/openai/score')){
      const { question, answer } = body
      const prompt = `You are a helpful evaluator. Rate the candidate answer on scale 0-10 and give a one-sentence feedback. Return JSON exactly like: {"score": <int>, "feedback":"..."}.
Question: ${question}
Answer: ${answer}`
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer '+key },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // change as needed
          messages: [{ role:'user', content: prompt }],
          max_tokens: 200
        })
      })
      const js = await resp.json()
      const txt = js?.choices?.[0]?.message?.content || ''
      // try to parse JSON from model
      try{
        const parsed = JSON.parse(txt)
        return res.setHeader('Content-Type','application/json').status(200).end(JSON.stringify(parsed))
      }catch(e){
        // fallback: attempt to extract numbers
        const scoreMatch = txt.match(/\d+/)
        const score = scoreMatch? parseInt(scoreMatch[0],10): 0
        const feedback = txt.replace(/\n/g,' ').slice(0,200)
        return res.status(200).json({ score, feedback })
      }
    } else if(pathname.endsWith('/api/generate') || pathname.endsWith('/api/openai/generate')){
      const { topic='general', difficulty='medium' } = body
      const prompt = `Generate a single ${difficulty} interview question about ${topic}. Respond with exact JSON: {"question":"..."}`
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer '+key },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role:'user', content: prompt }],
          max_tokens: 150
        })
      })
      const js = await resp.json()
      const txt = js?.choices?.[0]?.message?.content || ''
      try{
        const parsed = JSON.parse(txt)
        return res.status(200).json(parsed)
      }catch(e){
        return res.status(200).json({ question: txt })
      }
    } else {
      return res.status(404).json({ error: 'unknown endpoint' })
    }
  }catch(err){
    console.error(err)
    return res.status(500).json({ error: String(err) })
  }
}

module.exports = handler
