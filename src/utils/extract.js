import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromFile(file){
  const type = file.type
  if(type === 'application/pdf'){
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    for(let i=1;i<=pdf.numPages;i++){
      const page = await pdf.getPage(i)
      const tc = await page.getTextContent()
      fullText += tc.items.map(it => it.str).join(' ') + '\n'
    }
    return fullText
  } else if(file.name.endsWith('.docx')){
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value || ''
  } else {
    // fallback: read as text
    return await file.text()
  }
}

export function parseContactInfo(text){
  const email = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i) || [null])[0]
  const phone = (text.match(/(\+?\d{1,3}[-.\s]?)?(\d{10}|\d{3}[-.\s]\d{3}[-.\s]\d{4})/i) || [null])[0]
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
  let name = null
  if(lines.length){
    const maybe = lines[0].replace(email||'', '').replace(phone||'', '').trim()
    if(maybe.split(' ').length <= 4 && /[A-Z][a-z]/.test(maybe)) name = maybe
  }
  return { name, email, phone }
}
