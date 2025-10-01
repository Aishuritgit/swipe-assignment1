import React, { useState, useEffect } from 'react'

function makeQuestions() {
  return [
    { id: 'q1', text: 'Tell me about a recent project you built.', difficulty: 'easy', timeLimit: 20 },
    { id: 'q2', text: 'Explain how you manage state in a React app.', difficulty: 'easy', timeLimit: 60 },
    { id: 'q3', text: 'Describe REST vs GraphQL.', difficulty: 'medium', timeLimit: 60 },
    { id: 'q4', text: 'How would you optimise a slow React list?', difficulty: 'medium', timeLimit: 90 },
    { id: 'q5', text: 'Design an API for a todo app; outline endpoints and data model.', difficulty: 'hard', timeLimit: 120 },
    { id: 'q6', text: 'How do you ensure your app is secure against XSS and CSRF?', difficulty: 'hard', timeLimit: 120 }
  ]
}

export default function Interview({ sessions, setSessions }) {
  const [activeId, setActiveId] = useState(null)
  const [answer, setAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [finished, setFinished] = useState(false)

  // Start/resume via URL hash
  useEffect(() => {
    const h = window.location.hash
    if (h.startsWith('#start-')) {
      const id = h.replace('#start-', '')
      setActiveId(id)
      window.location.hash = ''
    }
  }, [])

  // Initialize session questions or load current question
  useEffect(() => {
    if (!activeId) return

    setSessions(prev => {
      const sess = prev.find(s => s.id === activeId)
      if (!sess) return prev

      // Initialize questions if empty
      if (!sess.questions || sess.questions.length === 0) {
        const qs = makeQuestions().map(q => ({
          ...q,
          answer: '',
          score: null,
          feedback: '',
          timeRemaining: q.timeLimit
        }))
        return prev.map(s => s.id === activeId ? { ...s, questions: qs, status: 'in-progress', currentQuestionIndex: 0 } : s)
      }

      return prev
    })

    // Load current question & timer
    const sess = sessions.find(s => s.id === activeId)
    if (!sess) return
    const qi = sess.currentQuestionIndex || 0
    setAnswer(sess.questions?.[qi]?.answer || '')
    setTimeLeft(sess.questions?.[qi]?.timeRemaining || sess.questions?.[qi]?.timeLimit || 0)
    if (sess.status === 'finished') setFinished(true)
  }, [activeId, sessions, setSessions])

  // Timer effect for auto-submission
  useEffect(() => {
    if (!activeId || finished) return
    if (timeLeft <= 0) {
      handleSubmitAnswer()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmitAnswer()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [activeId, timeLeft, finished])

  // Update session helper
  function updateSession(id, patch) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  // Submit answer
  async function handleSubmitAnswer() {
    if (!activeId) return
    const sess = sessions.find(s => s.id === activeId)
    if (!sess) return
    const qi = sess.currentQuestionIndex || 0
    const q = sess.questions[qi]

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.text, answer })
      })
      const j = await res.json()
      const score = j.score ?? 0
      const feedback = j.feedback ?? ''

      setSessions(prev => prev.map(s => {
        if (s.id !== activeId) return s
        const qs = s.questions.map((qq, idx) =>
          idx === qi ? { ...qq, answer, score, feedback, timeRemaining: qq.timeRemaining } : qq
        )
        return { ...s, questions: qs, currentQuestionIndex: qi + 1 }
      }))
      setAnswer('')
    } catch (err) {
      console.error(err)
      setSessions(prev => prev.map(s => {
        if (s.id !== activeId) return s
        const qs = s.questions.map((qq, idx) =>
          idx === qi ? { ...qq, answer, score: 0, feedback: '(scoring failed)' } : qq
        )
        return { ...s, questions: qs, currentQuestionIndex: qi + 1 }
      }))
      setAnswer('')
    }

    // Check if finished
    const now = sessions.find(s => s.id === activeId)
    const idx = now?.currentQuestionIndex || 0
    if (idx >= (now?.questions?.length || 6)) {
      const avg = Math.round((now.questions.reduce((a, b) => a + (b.score || 0), 0) / now.questions.length) * 10) / 10
      updateSession(activeId, { status: 'finished', finalScore: avg })
      setFinished(true)
    } else {
      const next = now.questions[idx]
      setTimeLeft(next.timeRemaining || next.timeLimit || 60)
    }
  }

  // Show list of sessions if no active session
  if (!activeId) {
    return (
      <div className="card">
        <h3>Start or Resume Interview</h3>
        <div className="small">Click start to begin on a session saved above.</div>
        {sessions.map(s => (
          <div key={s.id} style={{ marginTop: 8 }}>
            <strong>{s.name || 'Unknown'}</strong>
            <div className="small">Status: {s.status}</div>
            {s.status === 'finished' && <div className="small">Final Score: {s.finalScore}</div>}
            <button onClick={() => { setActiveId(s.id); setFinished(false) }}>Start / Resume</button>
          </div>
        ))}
      </div>
    )
  }

  const sess = sessions.find(s => s.id === activeId)
  if (!sess) return <div className="card">Loading session...</div>

  // Results screen
  if (finished) {
    return (
      <div className="card">
        <h3>Interview Finished — {sess.name || 'Candidate'}</h3>
        <p><strong>Final Score:</strong> {sess.finalScore}</p>
        <h4>Answer Summary:</h4>
        <ul>
          {sess.questions.map((q, idx) => (
            <li key={idx} style={{ marginBottom: 8 }}>
              <strong>Q{idx + 1}:</strong> {q.text} <br />
              <strong>Answer:</strong> {q.answer} <br />
              <strong>Score:</strong> {q.score} <br />
              <strong>Feedback:</strong> {q.feedback}
            </li>
          ))}
        </ul>
        <button onClick={() => { setActiveId(null); setFinished(false) }}>Close</button>
      </div>
    )
  }

  // Current question
  const qi = sess.currentQuestionIndex || 0
  const q = sess.questions?.[qi]
  if (!q) return <div className="card">Loading question...</div>

  return (
    <div className="card" id={'start-' + sess.id}>
      <h3>Interview — {sess.name || 'Candidate'}</h3>
      <div className="small">Question {qi + 1} of {sess.questions.length} — Time left: {timeLeft}s</div>
      <div style={{ marginTop: 8 }}><strong>{q.text}</strong></div>
      <textarea
        rows={6}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSubmitAnswer}>Submit</button>
        <div style={{ marginLeft: 'auto' }} className="small">Difficulty: {q.difficulty}</div>
      </div>
    </div>
  )
}    const idx = now?.currentQuestionIndex || 0
    if (idx >= (now?.questions?.length || 6)) {
      const avg = Math.round((now.questions.reduce((a, b) => a + (b.score || 0), 0) / now.questions.length) * 10) / 10
      updateSession(activeId, { status: 'finished', finalScore: avg })
      setFinished(true) // show results screen
    } else {
      const next = now.questions[idx]
      setTimeLeft(next.timeRemaining || next.timeLimit || 60)
    }
  }

  if (!activeId) {
    return (
      <div className="card">
        <h3>Start or Resume Interview</h3>
        <div className="small">Click start to begin on a session saved above.</div>
        {sessions.map(s => (
          <div key={s.id} style={{ marginTop: 8 }}>
            <strong>{s.name || 'Unknown'}</strong>
            <div className="small">Status: {s.status}</div>
            {s.status === 'finished' && <div className="small">Final Score: {s.finalScore}</div>}
            <button onClick={() => { setActiveId(s.id); setFinished(false) }}>Start / Resume</button>
          </div>
        ))}
      </div>
    )
  }

  const sess = sessions.find(s => s.id === activeId)
  if (!sess) return <div className="card">Session not found.</div>

  if (finished) {
    return (
      <div className="card">
        <h3>Interview Finished — {sess.name || 'Candidate'}</h3>
        <p><strong>Final Score:</strong> {sess.finalScore}</p>
        <h4>Answer Summary:</h4>
        <ul>
          {sess.questions.map((q, idx) => (
            <li key={idx}>
              <strong>Q{idx + 1}:</strong> {q.text} <br />
              <strong>Answer:</strong> {q.answer} <br />
              <strong>Score:</strong> {q.score} <br />
              <strong>Feedback:</strong> {q.feedback}
            </li>
          ))}
        </ul>
        <button onClick={() => { setActiveId(null); setFinished(false) }}>Close</button>
      </div>
    )
  }

  const qi = sess.currentQuestionIndex || 0
  const q = sess.questions?.[qi]

  return (
    <div className="card" id={'start-' + sess.id}>
      <h3>Interview — {sess.name || 'Candidate'}</h3>
      <div className="small">Question {qi + 1} of {sess.questions.length} — Time left: {timeLeft}s</div>
      <div style={{ marginTop: 8 }}><strong>{q.text}</strong></div>
      <textarea
        rows={6}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSubmitAnswer}>Submit</button>
        <div style={{ marginLeft: 'auto' }} className="small">Difficulty: {q.difficulty}</div>
      </div>
    </div>
  )
}
