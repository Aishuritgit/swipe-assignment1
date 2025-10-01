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

  // Initialize questions
  useEffect(() => {
    if (!activeId) return
    setSessions(prev => {
      return prev.map(s => {
        if (s.id !== activeId) return s
        if (!s.questions || s.questions.length === 0) {
          const qs = makeQuestions().map(q => ({
            ...q,
            answer: '',
            score: null,
            feedback: '',
            timeRemaining: q.timeLimit
          }))
          return { ...s, questions: qs, status: 'in-progress', currentQuestionIndex: 0 }
        }
        return s
      })
    })
  }, [activeId, setSessions])

  // Load current question and timer
  useEffect(() => {
    if (!activeId) return
    const sess = sessions.find(s => s.id === activeId)
    if (!sess) return
    const qi = sess.currentQuestionIndex || 0
    setAnswer(sess.questions?.[qi]?.answer || '')
    setTimeLeft(sess.questions?.[qi]?.timeRemaining || sess.questions?.[qi]?.timeLimit || 0)
    if (sess.status === 'finished') setFinished(true)
  }, [activeId, sessions])

  // Timer effect
  useEffect(() => {
    if (!activeId || finished) return
    if (timeLeft <= 0) {
      handleSubmitAnswer()
      return
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [activeId, timeLeft, finished])

  // Submit answer and update score
  async function handleSubmitAnswer() {
    if (!activeId) return

    // Update answer and score asynchronously
    setSessions(prev => {
      return prev.map(sess => {
        if (sess.id !== activeId) return sess
        const qi = sess.currentQuestionIndex || 0
        if (qi >= sess.questions.length) return sess // already finished

        const updatedQuestions = sess.questions.map((q, idx) => {
          if (idx !== qi) return q
          return { ...q, answer, score: null, feedback: '' }
        })

        const nextIndex = qi + 1
        let status = sess.status
        let finalScore = sess.finalScore

        if (nextIndex >= updatedQuestions.length) {
          // Calculate final score
          const sum = updatedQuestions.reduce((a, b) => a + (b.score || 0), 0)
          finalScore = Math.round((sum / updatedQuestions.length) * 10) / 10
          status = 'finished'
          setFinished(true)
        }

        return { ...sess, questions: updatedQuestions, currentQuestionIndex: nextIndex, status, finalScore }
      })
    })

    setAnswer('')

    // Call scoring API
    try {
      const sess = sessions.find(s => s.id === activeId)
      if (!sess) return
      const qi = sess.currentQuestionIndex || 0
      const prevQ = sess.questions[qi - 1]
      if (!prevQ) return

      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prevQ.text, answer: prevQ.answer })
      })
      const j = await res.json()
      const score = Number(j.score ?? 0)
      const feedback = j.feedback ?? ''

      // Update question score and recalc final score
      setSessions(prev => prev.map(sess => {
        if (sess.id !== activeId) return sess
        const qs = sess.questions.map((q, idx) => idx === qi - 1 ? { ...q, score, feedback } : q)
        let finalScore = sess.finalScore
        if (sess.currentQuestionIndex >= qs.length) {
          const sum = qs.reduce((a, b) => a + (b.score || 0), 0)
          finalScore = Math.round((sum / qs.length) * 10) / 10
        }
        return { ...sess, questions: qs, finalScore }
      }))
    } catch (err) {
      console.error(err)
    }
  }

  // Show session list
  if (!activeId) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <h3>Start or Resume Interview</h3>
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
    const getScoreColor = (score) => score >= 8 ? 'green' : score >= 5 ? 'orange' : 'red'
    return (
      <div className="card" style={{ padding: 16 }}>
        <h3>Interview Finished — {sess.name || 'Candidate'}</h3>
        <p>
          <strong>Final Score: </strong>
          <span style={{ color: 'white', backgroundColor: getScoreColor(sess.finalScore), padding: '4px 8px', borderRadius: 6 }}>
            {sess.finalScore}
          </span>
        </p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {sess.questions.map((q, idx) => (
            <li key={idx} style={{ marginBottom: 12, padding: 8, border: '1px solid #ddd', borderRadius: 8, backgroundColor: '#f9f9f9' }}>
              <div><strong>Q{idx + 1}:</strong> {q.text}</div>
              <div><strong>Answer:</strong> {q.answer || '-'}</div>
              <div><strong>Score:</strong> <span style={{ color: 'white', backgroundColor: getScoreColor(q.score), padding: '2px 6px', borderRadius: 4 }}>{q.score}</span></div>
              <div style={{ fontStyle: 'italic', color: '#555' }}><strong>Feedback:</strong> {q.feedback || '-'}</div>
            </li>
          ))}
        </ul>
        <button onClick={() => { setActiveId(null); setFinished(false) }}>Close</button>
      </div>
    )
  }

  // Current question
  const qi = sess.currentQuestionIndex || 0
  const q = sess.questions[qi]
  if (!q) return <div className="card">Loading question...</div>

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3>Interview — {sess.name || 'Candidate'}</h3>
      <div className="small">Question {qi + 1} of {sess.questions.length} — Time left: {timeLeft}s</div>
      <div style={{ marginTop: 8, marginBottom: 8 }}><strong>{q.text}</strong></div>
      <textarea
        rows={6}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={handleSubmitAnswer} style={{ padding: '6px 12px', cursor: 'pointer' }}>Submit</button>
        <div style={{ marginLeft: 'auto' }} className="small">Difficulty: {q.difficulty}</div>
      </div>
    </div>
  )
}
