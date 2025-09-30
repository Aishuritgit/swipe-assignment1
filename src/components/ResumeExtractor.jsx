import React, { useState } from 'react'
import { extractTextFromFile, parseContactInfo } from '../utils/extract'

export default function ResumeExtractor({ onCreateSession }){
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleUpload(e){
    const f = e.target.files[0]
    if(!f) return
    setFile(f); setLoading(true); setMessage('Extracting text...')
    try{
      const text = await extractTextFromFile(f)
      const info = parseContactInfo(text)
      const session = {
        id: 's_'+Date.now(),
        name: info.name || '',
        email: info.email || '',
        phone: info.phone || '',
        resumeText: text,
        questions: [],
        currentQuestionIndex: 0,
        status: 'created',
        finalScore: null,
        createdAt: new Date().toISOString()
      }
      onCreateSession(session)
      setMessage('Session created — scroll down to start interview.')
    }catch(err){
      console.error(err); setMessage('Failed to extract text. Try PDF or DOCX.')
    }finally{ setLoading(false) }
  }

  return (
    <div className="card">
      <h3>Upload Resume</h3>
      <input type="file" accept=".pdf,.docx" onChange={handleUpload} />
      {loading && <div className="small">Working...</div>}
      {message && <div className="small">{message}</div>}
      <div className="small" style={{marginTop:8}}>
        After upload, a session is created. Then use the Interview section below to start.
      </div>
    </div>
  )
}
