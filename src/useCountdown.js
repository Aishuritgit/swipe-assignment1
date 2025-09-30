import { useState, useEffect } from 'react'

export default function useCountdown(initial, running=true){
  const [sec, setSec] = useState(initial)
  useEffect(()=> {
    if(!running) return
    const id = setInterval(()=> setSec(s=> s>0 ? s-1 : 0), 1000)
    return ()=> clearInterval(id)
  }, [running])
  return [sec, setSec]
}
