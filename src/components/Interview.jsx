import React, { useState, useEffect } from 'react'
import useCountdown from '../hooks/useCountdown'

function makeQuestions(){
  return [
    { id:'q1', text:'Tell me about a recent project you built.', difficulty:'easy', timeLimit:20 },
    { id:'q2', text:'Explain how you manage state in a React app.', difficulty:'easy', timeLimit:60 },
    { id:'q3', text:'Describe REST vs GraphQL.', difficulty:'medium', timeLimit:60 },
    { id:'q4', text:'How would you optimise a slow React list?', difficulty:'medium', timeLimit:90 },
    { id:'q5', text:'Design an API for a todo app; outline endpoints and data model.', difficulty:'hard', timeLimit:120 },
    { id:'q6', text:'How do you ensure your app is secure against XSS and CSRF?', difficulty:'hard', timeLimit:120 }
  ]
}

export default function Interview({ sessions, setSessions }){
  const [activeId, setActiveId] = useState(null)
  const [answer, setAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [autoInterval, setAutoInterval] = useState(null)

  useEffect(()=> {
    // if hash has session id to start
    const h = window.location.hash
    if(h.startsWith('#start-')){
      const id = h.replace('#start-','')
      setActiveId(id)
      window.location.hash = ''
    }
  },[])

  useEffect(()=> {
    if(!activeId) return
    const sess = sessions.find(s=>s.id===activeId)
    if(!sess) return
    if(sess.questions.length===0){
      // initialize questions
      const qs = makeQuestions().map(q=> ({...q, answer:'', score:null, feedback:'', timeRemaining:q.timeLimit}) )
      updateSession(activeId, { questions: qs, status:'in-progress', currentQuestionIndex:0 })
    } else {
      const qi = sess.currentQuestionIndex || 0
      setAnswer(sess.questions[qi]?.answer || '')
      setTimeLeft(sess.questions[qi]?.timeRemaining || sess.questions[qi]?.timeLimit || 0)
    }
  }, [activeId])

  useEffect(()=> {
    if(!activeId) return
    if(timeLeft<=0) return
    clearInterval(autoInterval)
    const id = setInterval(()=> {
      setTimeLeft(t=> {
        if(t<=1){
          clearInterval(id)
          handleAutoSubmit()
          return 0
        }
        // update in session
        updateQuestionTime(activeId, Math.max(0, t-1))
        return t-1
      })
    }, 1000)
    setAutoInterval(id)
    return ()=> clearInterval(id)
  }, [timeLeft, activeId])

  function updateSession(id, patch){
    setSessions(prev => prev.map(s => s.id===id ? {...s, ...patch} : s ))
  }
  function updateQuestionTime(id, newTime){
    setSessions(prev => prev.map(s => {
      if(s.id!==id) return s
      const qi = s.currentQuestionIndex || 0
      const qs = s.questions.map((q,idx)=> idx===qi? {...q, timeRemaining:newTime} : q)
      return {...s, questions: qs}
    }))
  }

  async function handleStart(id){
    setActiveId(id)
  }

  async function handleSubmitAnswer(){
    if(!activeId) return
    const sess = sessions.find(s=>s.id===activeId); if(!sess) return
    const qi = sess.currentQuestionIndex || 0
    const q = sess.questions[qi]
    // call serverless to score answer
    updateSession(activeId, {})
    try{
      const res = await fetch('/api/score', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ question: q.text, answer })
      })
      const j = await res.json()
      const score = j.score ?? 0
      const feedback = j.feedback ?? ''
      // save
      setSessions(prev => prev.map(s=>{
        if(s.id!==activeId) return s
        const qs = s.questions.map((qq,idx)=> idx===qi? {...qq, answer, score, feedback, timeRemaining: qq.timeRemaining} : qq)
        return {...s, questions: qs, currentQuestionIndex: qi+1}
      }))
      setAnswer('')
      // move to next or finish
      const updated = sessions.find(s=>s.id===activeId)
      const nextIndex = (updated?.currentQuestionIndex||0)+1
    }catch(err){
      console.error(err)
      // still save answer locally
      setSessions(prev => prev.map(s=>{
        if(s.id!==activeId) return s
        const qs = s.questions.map((qq,idx)=> idx===qi? {...qq, answer, score:0, feedback:'(scoring failed)'} : qq)
        return {...s, questions: qs, currentQuestionIndex: qi+1}
      }))
      setAnswer('')
    }
    // check finish
    const now = sessions.find(s=>s.id===activeId)
    const idx = now?.currentQuestionIndex || 0
    if(idx >= (now?.questions?.length||6)){
      // compute final score
      const avg = Math.round((now.questions.reduce((a,b)=> a + (b.score||0), 0) / now.questions.length) * 10)/10
      updateSession(activeId, { status:'finished', finalScore: avg })
      alert('Interview finished. Score: '+avg)
      setActiveId(null)
    } else {
      // set timer for next
      const next = now.questions[idx]
      setTimeLeft(next.timeRemaining || next.timeLimit || 60)
    }
  }

  async function handleAutoSubmit(){
    // submit current answer (may be empty)
    await handleSubmitAnswer()
  }

  if(!activeId) return (
    <div className="card">
      <h3>Start or Resume Interview</h3>
      <div className="small">Click start to begin on a session saved above.</div>
      {sessions.map(s=>(
        <div key={s.id} style={{marginTop:8}}>
          <strong>{s.name||'Unknown'}</strong>
          <div className="small">Status: {s.status}</div>
          <button onClick={()=> handleStart(s.id)}>Start / Resume</button>
        </div>
      ))}
    </div>
  )

  const sess = sessions.find(s=>s.id===activeId)
  if(!sess) return null
  const qi = sess.currentQuestionIndex || 0
  const q = sess.questions[qi]

  return (
    <div className="card" id={'start-'+sess.id}>
      <h3>Interview — {sess.name || 'Candidate'}</h3>
      <div className="small">Question {qi+1} of {sess.questions.length} — Time left: {timeLeft}s</div>
      <div style={{marginTop:8}}><strong>{q.text}</strong></div>
      <textarea rows={6} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Type your answer here..." />
      <div style={{display:'flex', gap:8}}>
        <button onClick={handleSubmitAnswer}>Submit</button>
        <button onClick={handleAutoSubmit}>Auto-submit (force)</button>
        <div style={{marginLeft:'auto'}} className="small">Difficulty: {q.difficulty}</div>
      </div>
    </div>
  )
}
