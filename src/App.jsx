import React, { useState, useEffect } from 'react'
import ResumeExtractor from './components/ResumeExtractor'
import Interview from './components/Interview'

export default function App(){
  const [tab, setTab] = useState('candidate')
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sessions')||'[]') } catch(e){ return [] }
  })
  useEffect(()=> localStorage.setItem('sessions', JSON.stringify(sessions)), [sessions])

  return (
    <div className="container">
      <div className="header">
        <h2>Swipe — AI Interview (basic)</h2>
        <div className="small">Mobile-friendly starter</div>
      </div>
      <div className="tabs">
        <div className={"tab "+(tab==='candidate'?'active':'')} onClick={()=>setTab('candidate')}>Interviewee</div>
        <div className={"tab "+(tab==='dashboard'?'active':'')} onClick={()=>setTab('dashboard')}>Interviewer</div>
      </div>

      {tab==='candidate' ? (
        <div>
          <ResumeExtractor onCreateSession={(s)=> setSessions([s, ...sessions])} />
          <hr />
          <h3>Resume Sessions</h3>
          {sessions.length===0 && <div className="small">No sessions yet — upload a resume to start.</div>}
          {sessions.map(s => (
            <div key={s.id} className="card">
              <strong>{s.name||'Unknown'}</strong> <div className="small">{s.email||''} {s.phone||''}</div>
              <div style={{marginTop:8}}>
                <button onClick={()=> window.location.href = '#start-'+s.id}>Resume interview</button>
              </div>
            </div>
          ))}
          <div id="start-placeholder" />
          <Interview sessions={sessions} setSessions={setSessions} />
        </div>
      ) : (
        <div>
          <h3>Interviewer Dashboard</h3>
          <div className="small">Shows stored sessions from localStorage (client-side).</div>
          {sessions.length===0 && <div className="small">No candidates yet.</div>}
          {sessions.sort((a,b)=> (b.finalScore||0)-(a.finalScore||0)).map(s=>(
            <div key={s.id} className="card">
              <strong>{s.name||'Unknown'}</strong>
              <div className="small">Score: {s.finalScore!=null? s.finalScore : 'Not finished'}</div>
              <details>
                <summary>View details</summary>
                <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(s, null, 2)}</pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
