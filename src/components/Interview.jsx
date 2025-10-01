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

    const sess = sessions.find(s => s.id === activeId)
    if (!sess) return
    const qi = sess.currentQuestionIndex || 0
    setAnswer(sess.questions?.[qi]?.answer || '')
    setTimeLeft(sess.questions?.[qi]?.timeRemaining || sess.questions?.[qi]?.timeLimit || 0)
    if (sess.status === 'finished') setFinished(true)
  }, [activeId, sessions, setSessions])

  // Timer effect for auto-submit
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

  // Submit answer
  async function handleSubmitAnswer() {
    if (!activeId) return

    let currentAnswer = answer

    // Update session immediately
    setSessions(prev => {
      const sess = prev.find(s => s.id === activeId)
      if (!sess) return prev

      const qi = sess.currentQuestionIndex || 0
      const q = sess.questions[qi]

      const updatedQuestions = sess.questions.map((qq, idx) =>
        idx === qi ? { ...qq, answer: currentAnswer, score: qq.score ?? 0, feedback: qq.feedback ?? '' } : qq
      )

      return prev.map(s => s.id === activeId ? { ...s, questions: updatedQuestions, currentQuestionIndex: qi + 1 } : s)
    })

    setAnswer('')

    // Fetch score asynchronously
    try {
      const sess = sessions.find(s => s.id === activeId)
      if (!sess) return
      const qi = sess.currentQuestionIndex || 0
      const prevQ = sess.questions[qi - 1]

      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prevQ.text, answer: prevQ.answer })
      })
      const j = await res.json()
      const score = Number(j.score ?? 0)
      const feedback = j.feedback ?? ''

      setSessions(prev => {
        return prev.map(s => {
          if (s.id !== activeId) return s
          const qs = s.questions.map((qq, idx) =>
            idx === qi - 1 ? { ...qq, score, feedback } : qq
          )

          let updatedSess = { ...s, questions: qs }

          if ((s.currentQuestionIndex || 0) >= qs.length) {
            const avg = Math.round(
              (qs.reduce((a, b) => a + Number(b.score || 0), 0) / qs.length) * 10
            ) / 10
            updatedSess = { ...updatedSess, status: 'finished', finalScore: avg }
            setFinished(true)
          } else {
            const nextQ = qs[s.currentQuestionIndex || 0]
            setTimeLeft(nextQ.timeRemaining || nextQ.timeLimit || 60)
          }

          return updatedSess
        })
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Session list
  if (!activeId) {
    return (
      <div className="card" style={{ padding: 16 }}>
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
    const getScoreColor = (score) => {
      if (score >= 8) return 'green'
      if (score >= 5) return 'orange'
      return 'red'
    }

    return (
      <div className="card" style={{ padding: 16 }}>
        <h3>Interview Finished — {sess.name || 'Candidate'}</h3>
        <p>
          <strong>Final Score: </strong>
          <span style={{
            color: 'white',
            backgroundColor: getScoreColor(sess.finalScore),
            padding: '4px 8px',
            borderRadius: 6
          }}>
            {sess.finalScore}
          </span>
        </p>

        <h4>Answer Summary:</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {sess.questions.map((q, idx) => (
            <li key={idx} style={{
              marginBottom: 12,
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 8,
              backgroundColor: '#f9f9f9'
            }}>
              <div><strong>Q{idx + 1}:</strong> {q.text}</div>
              <div><strong>Answer:</strong> {q.answer || '-'}</div>
              <div>
                <strong>Score:</strong>
                <span style={{
                  color: 'white',
                  backgroundColor: getScoreColor(q.score),
                  padding: '2px 6px',
                  borderRadius: 4,
                  marginLeft: 4
                }}>{q.score}</span>
              </div>
              <div style={{ fontStyle: 'italic', color: '#555' }}>
                <strong>Feedback:</strong> {q.feedback || '-'}
              </div>
            </li>
          ))}
        </ul>

        <button
          onClick={() => { setActiveId(null); setFinished(false) }}
          style={{ marginTop: 12, padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    )
  }

  // Current question
  const qi = sess.currentQuestionIndex || 0
  const q = sess.questions?.[qi]
  if (!q) return <div className="card">Loading question...</div>

  return (
    <div className="card" id={'start-' + sess.id} style={{ padding: 16 }}>
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
