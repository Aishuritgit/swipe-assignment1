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

  // Initialize questions if not already
  useEffect(() => {
    if (!activeId) return
    setSessions(prev =>
      prev.map(s => {
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
    )
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

  // Timer countdown
  useEffect(() => {
    if (!activeId || finished) return
    if (timeLeft <= 0) {
      handleSubmitAnswer()
      return
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [activeId, timeLeft, finished])

  // Submit answer and move to next question
  async function handleSubmitAnswer() {
    if (!activeId) return
    const currentAnswer = answer
    setAnswer('')

    try {
      const sess = sessions.find(s => s.id === activeId)
      const qi = sess?.currentQuestionIndex || 0
      const q = sess.questions[qi]

      // Call scoring API
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.text, answer: currentAnswer })
      })
      const j = await res.json()
      const score = Math.round((j.score ?? 0) * 100) // 1-100 scale
      const feedback = j.feedback ?? ''

      // Update session correctly
      setSessions(prev =>
        prev.map(sess => {
          if (sess.id !== activeId) return sess

          const updatedQuestions = sess.questions.map((qq, idx) =>
            idx === qi ? { ...qq, answer: currentAnswer, score, feedback } : qq
          )

          const nextIndex = qi + 1
          const isFinished = nextIndex >= updatedQuestions.length
          const finalScore = isFinished
            ? Math.round(updatedQuestions.reduce((a, b) => a + (b.score ?? 0), 0) / updatedQuestions.length)
            : sess.finalScore

          if (isFinished) setFinished(true)

          return {
            ...sess,
            questions: updatedQuestions,
            currentQuestionIndex: nextIndex,
            status: isFinished ? 'finished' : 'in-progress',
            finalScore
          }
        })
      )
    } catch (err) {
      console.error(err)
    }
  }

  // Session list = “dashboard view”
  if (!activeId) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <h3>Start or Resume Interview</h3>
        {sessions.map(s => (
          <div key={s.id} style={{ marginTop: 8, padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
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
      <div className="card" style={{ padding: 16 }}>
        <h3>Interview Finished — {sess.name || 'Candidate'}</h3>
        <p><strong>Final Score: </strong>{sess.finalScore}</p>
        <h4>Answer Summary:</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {sess.questions.map((q, idx) => (
            <li key={idx} style={{ marginBottom: 12, padding: 8, border: '1px solid #ddd', borderRadius: 8, backgroundColor: '#f9f9f9' }}>
              <div><strong>Q{idx + 1}:</strong> {q.text}</div>
              <div><strong>Answer:</strong> {q.answer || '-'}</div>
              <div><strong>Score:</strong> {q.score}</div>
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
