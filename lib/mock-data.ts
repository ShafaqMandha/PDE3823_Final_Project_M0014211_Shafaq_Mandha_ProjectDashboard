import type { 
  Satellite, 
  ConjunctionEvent, 
  HistoricalDataPoint, 
  RiskCategory,
  PredictionResult,
  OptimizationResult,
  ManeuverOption
} from './types'

// Real satellite data (simplified)
const SATELLITE_TEMPLATES = [
  { name: 'ISS (ZARYA)', noradId: '25544', orbitType: 'LEO' as const, altitude: 420, velocity: 7.66, inclination: 51.6 },
  { name: 'STARLINK-1234', noradId: '44713', orbitType: 'LEO' as const, altitude: 550, velocity: 7.59, inclination: 53.0 },
  { name: 'HUBBLE', noradId: '20580', orbitType: 'LEO' as const, altitude: 540, velocity: 7.59, inclination: 28.5 },
  { name: 'SENTINEL-2A', noradId: '40697', orbitType: 'LEO' as const, altitude: 786, velocity: 7.45, inclination: 98.6 },
  { name: 'TERRA', noradId: '25994', orbitType: 'LEO' as const, altitude: 705, velocity: 7.50, inclination: 98.2 },
  { name: 'GPS IIF-12', noradId: '40730', orbitType: 'MEO' as const, altitude: 20200, velocity: 3.87, inclination: 55.0 },
  { name: 'GALILEO-FOC1', noradId: '40128', orbitType: 'MEO' as const, altitude: 23222, velocity: 3.60, inclination: 56.0 },
  { name: 'EUTELSAT 36B', noradId: '40874', orbitType: 'GEO' as const, altitude: 35786, velocity: 3.07, inclination: 0.05 },
  { name: 'SES-15', noradId: '42709', orbitType: 'GEO' as const, altitude: 35786, velocity: 3.07, inclination: 0.02 },
  { name: 'MOLNIYA 1-91', noradId: '25485', orbitType: 'HEO' as const, altitude: 39354, velocity: 1.50, inclination: 63.4 },
]

const DEBRIS_OBJECTS = [
  'COSMOS 2251 DEB',
  'FENGYUN 1C DEB',
  'IRIDIUM 33 DEB',
  'BREEZE-M DEB',
  'SL-8 R/B',
  'DELTA 2 R/B',
  'ARIANE 5 DEB',
  'H-2A DEB',
  'CZ-4C DEB',
  'ATLAS 5 CENTAUR DEB'
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomRiskCategory(): RiskCategory {
  const rand = Math.random()
  if (rand < 0.4) return 'Low'
  if (rand < 0.7) return 'Medium'
  return 'High'
}

function getRiskScore(category: RiskCategory): number {
  switch (category) {
    case 'Low': return randomInRange(0, 0.33)
    case 'Medium': return randomInRange(0.33, 0.66)
    case 'High': return randomInRange(0.66, 1)
  }
}

function getCategoryFromScore(score: number): RiskCategory {
  if (score < 0.33) return 'Low'
  if (score < 0.66) return 'Medium'
  return 'High'
}

export function generateSatellites(): Satellite[] {
  return SATELLITE_TEMPLATES.map((template, index) => ({
    id: `sat-${index + 1}`,
    name: template.name,
    noradId: template.noradId,
    orbitType: template.orbitType,
    altitude: template.altitude + randomInRange(-10, 10),
    velocity: template.velocity + randomInRange(-0.05, 0.05),
    inclination: template.inclination + randomInRange(-0.5, 0.5),
    eccentricity: randomInRange(0.0001, 0.02),
    raan: randomInRange(0, 360),
    argOfPerigee: randomInRange(0, 360),
    meanAnomaly: randomInRange(0, 360),
    epoch: new Date().toISOString()
  }))
}

export function generateConjunctionEvents(satellites: Satellite[], count: number = 50): ConjunctionEvent[] {
  const events: ConjunctionEvent[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const satellite = satellites[Math.floor(Math.random() * satellites.length)]
    const riskCategory = randomRiskCategory()
    const riskScore = getRiskScore(riskCategory)
    
    // TCA is between now and 7 days from now
    const tcaOffset = randomInRange(0, 7 * 24 * 60 * 60 * 1000)
    const tca = new Date(now.getTime() + tcaOffset)

    // Miss distance inversely related to risk
    const missDistance = riskCategory === 'High'
      ? randomInRange(50, 1000)
      : riskCategory === 'Medium'
      ? randomInRange(1000, 5000)
      : randomInRange(5000, 25000)

    events.push({
      id: `conj-${generateId()}`,
      primarySatelliteId: satellite.id,
      secondarySatelliteId: `debris-${Math.floor(Math.random() * 100)}`,
      secondaryObjectName: DEBRIS_OBJECTS[Math.floor(Math.random() * DEBRIS_OBJECTS.length)],
      tca: tca.toISOString(),
      missDistance: missDistance,
      relativeVelocity: randomInRange(0.5, 15),
      collisionProbability: riskScore * randomInRange(0.00001, 0.01),
      riskScore: riskScore,
      riskCategory: riskCategory,
      radialDistance: randomInRange(10, missDistance * 0.5),
      inTrackDistance: randomInRange(10, missDistance * 0.8),
      crossTrackDistance: randomInRange(10, missDistance * 0.3),
      combinedSize: randomInRange(0.5, 50),
      dataSource: 'SIMULATION',
      createdAt: now.toISOString()
    })
  }

  // Sort by TCA
  return events.sort((a, b) => new Date(a.tca).getTime() - new Date(b.tca).getTime())
}

export function generateHistoricalData(satellites: Satellite[], days: number = 30): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = []
  const now = new Date()

  for (let day = days; day >= 0; day--) {
    for (const satellite of satellites.slice(0, 5)) { // First 5 satellites
      const timestamp = new Date(now.getTime() - day * 24 * 60 * 60 * 1000)
      const baseRisk = randomInRange(0.1, 0.5)
      // Add some variation and trend
      const variation = Math.sin(day / 5) * 0.2
      const riskScore = Math.max(0, Math.min(1, baseRisk + variation + randomInRange(-0.1, 0.1)))

      data.push({
        timestamp: timestamp.toISOString(),
        satelliteId: satellite.id,
        riskScore: riskScore,
        collisionProbability: riskScore * 0.0001,
        missDistance: (1 - riskScore) * 10000 + 500,
        altitude: satellite.altitude + randomInRange(-5, 5)
      })
    }
  }

  return data
}

export function generateMockData() {
  const satellites = generateSatellites()
  const conjunctions = generateConjunctionEvents(satellites, 50)
  const historicalData = generateHistoricalData(satellites, 30)

  return {
    satellites,
    conjunctions,
    historicalData
  }
}

// Generate a mock prediction result
export function generateMockPrediction(riskScore?: number): PredictionResult {
  const score = riskScore ?? randomInRange(0, 1)
  
  return {
    riskScore: score,
    riskCategory: getCategoryFromScore(score),
    collisionProbability: score * randomInRange(0.00001, 0.001),
    confidence: randomInRange(0.85, 0.99),
    featureImportance: {
      'Miss Distance': randomInRange(0.15, 0.3),
      'Relative Velocity': randomInRange(0.1, 0.2),
      'Time to TCA': randomInRange(0.08, 0.15),
      'Radial Distance': randomInRange(0.05, 0.12),
      'Combined Size': randomInRange(0.05, 0.1),
      'Inclination Delta': randomInRange(0.03, 0.08),
      'Eccentricity': randomInRange(0.02, 0.06),
      'Altitude': randomInRange(0.02, 0.05)
    },
    modelVersion: 'v2.1.0-hybrid',
    timestamp: new Date().toISOString()
  }
}

// Generate a mock optimization result
export function generateMockOptimization(
  conjunctionId: string, 
  originalRiskScore: number
): OptimizationResult {
  const maneuverTypes = ['Prograde', 'Retrograde', 'Radial-In', 'Radial-Out', 'Normal', 'Anti-Normal'] as const
  
  const generateManeuver = (index: number): ManeuverOption => {
    const type = maneuverTypes[index % maneuverTypes.length]
    const deltaV = randomInRange(0.1, 2.5)
    const riskReduction = randomInRange(0.3, 0.9)
    const newRiskScore = Math.max(0, originalRiskScore * (1 - riskReduction))
    
    return {
      id: `man-${generateId()}`,
      type,
      deltaV,
      burnDuration: deltaV * randomInRange(30, 60),
      executionTime: new Date(Date.now() + randomInRange(1, 24) * 60 * 60 * 1000).toISOString(),
      newMissDistance: randomInRange(5000, 50000),
      newRiskScore,
      riskReduction: riskReduction * 100,
      fuelCost: deltaV * randomInRange(0.5, 1.5),
      confidence: randomInRange(0.8, 0.98)
    }
  }

  const maneuvers = Array.from({ length: 4 }, (_, i) => generateManeuver(i))
    .sort((a, b) => b.riskReduction - a.riskReduction)

  return {
    success: true,
    conjunctionId,
    originalRiskScore,
    bestManeuver: maneuvers[0],
    alternativeManeuvers: maneuvers.slice(1),
    quboEnergy: randomInRange(-100, -10),
    solverIterations: Math.floor(randomInRange(100, 1000)),
    computeTime: randomInRange(50, 500),
    message: 'Optimization completed successfully',
    timestamp: new Date().toISOString()
  }
}

// Simulate updating a single conjunction with new data (for real-time simulation)
export function simulateConjunctionUpdate(conjunction: ConjunctionEvent): ConjunctionEvent {
  // Small random variations to simulate real-time updates
  const missDistanceChange = randomInRange(-100, 100)
  const newMissDistance = Math.max(10, conjunction.missDistance + missDistanceChange)
  
  const velocityChange = randomInRange(-0.1, 0.1)
  const newVelocity = Math.max(0.1, conjunction.relativeVelocity + velocityChange)
  
  // Recalculate risk based on new values
  const normalizedMissDistance = Math.min(1, newMissDistance / 25000)
  const normalizedVelocity = Math.min(1, newVelocity / 15)
  
  const newRiskScore = Math.max(0, Math.min(1, 
    0.4 * (1 - normalizedMissDistance) + 
    0.3 * normalizedVelocity + 
    0.3 * conjunction.riskScore + 
    randomInRange(-0.05, 0.05)
  ))

  return {
    ...conjunction,
    missDistance: newMissDistance,
    relativeVelocity: newVelocity,
    riskScore: newRiskScore,
    riskCategory: getCategoryFromScore(newRiskScore),
    collisionProbability: newRiskScore * randomInRange(0.00001, 0.001)
  }
}
