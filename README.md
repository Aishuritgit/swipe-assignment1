# Swipe — AI Interview (Starter)

This is a minimal mobile-first React + Vite starter for the Swipe Internship assignment.
Features:
- Upload resume (PDF/DOCX) in-browser and extract text (pdf.js + mammoth).
- Create interview session stored in localStorage.
- Timed 6-question interview flow with auto-submit.
- Serverless proxy to OpenAI (score & generate). Add OPENAI_API_KEY in your deployment environment.

## How to run locally (recommended: use StackBlitz / Replit / Vercel)
1. Install dependencies:
   ```
   npm install
   ```
2. Run dev server:
   ```
   npm run dev
   ```
3. For the OpenAI serverless endpoint, deploy to Vercel or Replit and set `OPENAI_API_KEY` in env vars.
   - The file `api/openai.js` is a simple Node serverless handler you can place under `/api` when deploying to Vercel.

## Deployment (Vercel)
1. Push this repo to GitHub.
2. Import project in Vercel.
3. Add environment variable `OPENAI_API_KEY` in Project Settings -> Environment Variables.
4. Deploy.

## Important
- Do NOT commit your OpenAI key to the repo. Use environment variables in your host.
- The serverless handler expects requests at `/api/score` and `/api/generate`. Adjust if your host uses different routing.

