import { NextResponse } from 'next/server'
import path from 'node:path'
import { spawn } from 'node:child_process'

type OptimizeRequestBody = {
  conjunctionId: string
  // Use Pc0 if you have it; otherwise riskScore is accepted by the script.
  Pc0?: number
  riskScore?: number
  missDistance?: number
  maxDeltaV?: number
  axes?: string[]
  dvLevels?: number[]
  pcReductionScale?: number
  wPc?: number
  wDv?: number
  solver?: 'SA' | 'Exact' | 'Greedy'
  saReads?: number
}

function runPythonOptimize(payload: OptimizeRequestBody): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'qubo_optimize.py')

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
  let body: OptimizeRequestBody
  try {
    body = (await req.json()) as OptimizeRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.conjunctionId) {
    return NextResponse.json({ error: "Body must include 'conjunctionId'" }, { status: 400 })
  }

  try {
    const result = await runPythonOptimize(body)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: 'Optimization failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

