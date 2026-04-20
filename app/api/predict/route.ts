import { NextResponse } from 'next/server'
import path from 'node:path'
import { spawn } from 'node:child_process'

type PredictRequestBody = {
  features: Record<string, number>
}

function runPythonPredict(payload: PredictRequestBody): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'predict.py')

    const child = spawn('python', [scriptPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')

    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))

    child.on('error', (err) => reject(err))
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `python exited with code ${code}`))
        return
      }
      try {
        resolve(JSON.parse(stdout))
      } catch (e) {
        reject(new Error(`Invalid JSON from python: ${String(e)}\n${stdout}`))
      }
    })

    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
  })
}

export async function POST(req: Request) {
  let body: PredictRequestBody
  try {
    body = (await req.json()) as PredictRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.features || typeof body.features !== 'object') {
    return NextResponse.json({ error: "Body must include 'features' object" }, { status: 400 })
  }

  try {
    const prediction = await runPythonPredict(body)
    return NextResponse.json(prediction)
  } catch (err) {
    return NextResponse.json(
      { error: 'Prediction failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

