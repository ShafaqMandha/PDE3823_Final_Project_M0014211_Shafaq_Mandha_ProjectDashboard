import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import Papa from 'papaparse'
import type { Satellite, ConjunctionEvent, HistoricalDataPoint, RiskCategory } from '@/lib/types'

type CsvRow = Record<string, string>

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function toNumber(value: unknown): number | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function isNumericString(value: string | undefined): boolean {
  if (value == null) return false
  const trimmed = String(value).trim()
  if (!trimmed) return false
  const n = Number(trimmed)
  return Number.isFinite(n)
}

function riskCategoryFromScore(score: number): RiskCategory {
  if (score < 0.33) return 'Low'
  if (score < 0.66) return 'Medium'
  return 'High'
}

function computeRiskScoreFromLog10Probability(log10p: number): number {
  // Most rows have negative "risk" values that look like log10(Pc).
  // Map log10(P) in [-12, 0] -> score in [0, 1].
  return clamp01((log10p + 12) / 12)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limitParam = url.searchParams.get('limit')
  const limit = Math.max(100, Math.min(20000, limitParam ? Number(limitParam) : 3000))

  const csvPath = path.join(process.cwd(), 'data', 'train_data.csv')
  const csvText = await fs.readFile(csvPath, 'utf8')

  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  if (parsed.errors?.length) {
    return NextResponse.json(
      { error: 'Failed to parse CSV', details: parsed.errors.slice(0, 5) },
      { status: 500 }
    )
  }

  const rows = (parsed.data ?? []).slice(0, limit)

  // Match the training pipeline:
  // - target column is 'score' if present else 'risk' (here: risk)
  // - remove ID columns (anything containing 'id')
  // - factorize categorical columns (we handle known string column(s))
  const categoricalMappings: Record<string, Map<string, number>> = {
    c_object_type: new Map<string, number>(),
  }

  for (const row of rows) {
    const v = row['c_object_type']
    if (v == null) continue
    const key = String(v)
    if (!categoricalMappings.c_object_type.has(key)) {
      categoricalMappings.c_object_type.set(key, categoricalMappings.c_object_type.size)
    }
  }

  const satellitesById = new Map<string, Satellite>()
  const conjunctions: ConjunctionEvent[] = []
  const historicalData: HistoricalDataPoint[] = []

  const now = Date.now()

  rows.forEach((row, idx) => {
    const missionId = row['mission_id']?.trim()
    const eventId = row['event_id']?.trim() || String(idx)
    if (!missionId) return

    const satId = `sat-${missionId}`
    if (!satellitesById.has(satId)) {
      const inc = toNumber(row['t_j2k_inc']) ?? 0
      const ecc = toNumber(row['t_j2k_ecc']) ?? 0

      satellitesById.set(satId, {
        id: satId,
        name: `Mission ${missionId}`,
        noradId: missionId,
        orbitType: 'LEO',
        altitude: 0,
        velocity: 0,
        inclination: inc,
        eccentricity: ecc,
        raan: 0,
        argOfPerigee: 0,
        meanAnomaly: 0,
        epoch: new Date().toISOString(),
      })
    }

    const timeToTcaHours = toNumber(row['time_to_tca']) ?? 0
    const tca = new Date(now + timeToTcaHours * 3600_000).toISOString()

    const missDistance = toNumber(row['miss_distance']) ?? 0
    const relativeSpeed = toNumber(row['relative_speed']) ?? 0
    const log10pc = toNumber(row['risk']) ?? -12
    const collisionProbability = Math.pow(10, log10pc)
    const riskScore = computeRiskScoreFromLog10Probability(log10pc)
    const riskCategory = riskCategoryFromScore(riskScore)

    const features: Record<string, number> = {}
    const excludedFeatureKeys = new Set([
      // targets
      'risk',
      'score',
      // IDs / metadata (training drops anything with 'id' in the name)
      'event_id',
      'mission_id',
    ])

    for (const [k, v] of Object.entries(row)) {
      if (k.toLowerCase().includes('id')) continue
      if (excludedFeatureKeys.has(k)) continue

      if (k in categoricalMappings) {
        const map = categoricalMappings[k]
        const key = v == null ? '' : String(v)
        features[k] = map.get(key) ?? -1
        continue
      }

      if (isNumericString(v as any)) {
        const num = toNumber(v)
        if (num !== null) features[k] = num
      }
    }

    // Training pipeline includes these columns; they may be blank in the CSV.
    // Ensure they exist so the RF feature vector can be built deterministically.
    if (!('c_rcs_estimate' in features)) {
      features['c_rcs_estimate'] = 0
    }

    conjunctions.push({
      id: `evt-${eventId}-${idx}`,
      primarySatelliteId: satId,
      secondarySatelliteId: `obj-${row['c_object_type']?.trim() || 'unknown'}-${idx}`,
      secondaryObjectName: row['c_object_type']?.trim() || 'UNKNOWN',
      tca,
      missDistance,
      relativeVelocity: relativeSpeed,
      collisionProbability,
      riskScore,
      riskCategory,
      radialDistance: toNumber(row['relative_position_r']) ?? 0,
      inTrackDistance: toNumber(row['relative_position_t']) ?? 0,
      crossTrackDistance: toNumber(row['relative_position_n']) ?? 0,
      combinedSize: 0,
      dataSource: 'TRAIN_CSV',
      createdAt: new Date().toISOString(),
      features,
    })

    historicalData.push({
      timestamp: new Date(now - (rows.length - idx) * 60_000).toISOString(),
      satelliteId: satId,
      riskScore,
      collisionProbability,
      missDistance,
      altitude: 0,
    })
  })

  const satellites = Array.from(satellitesById.values())

  return NextResponse.json({
    satellites,
    conjunctions,
    historicalData,
  })
}

