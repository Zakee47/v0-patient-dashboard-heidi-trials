import { NextRequest, NextResponse } from 'next/server'
interface SessionData {
  [key: string]: unknown
}
async function generateJWT(
  apiKey: string,
  userEmail: string,
  thirdPartyId: string
): Promise<string> {
  const jwtUrl = 'https://registrar.api.heidihealth.com/api/v2/ml-scribe/open-api/jwt'
  const params = new URLSearchParams({
    email: userEmail,
    third_party_internal_id: thirdPartyId,
  })
  console.log('[v0] JWT request URL:', `${jwtUrl}?${params.toString()}`)
  const response = await fetch(`${jwtUrl}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Heidi-Api-Key': apiKey,
    },
  })
  console.log('[v0] JWT response status:', response.status)
  console.log('[v0] JWT response content-type:', response.headers.get('content-type'))
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[v0] JWT error response:', errorText)
    throw new Error(`JWT generation failed with status ${response.status}: ${errorText}`)
  }
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    const text = await response.text()
    console.error('[v0] JWT response is not JSON:', text)
    throw new Error(`JWT endpoint returned non-JSON response: ${text}`)
  }
  const data = await response.json()
  console.log('[v0] JWT response data keys:', Object.keys(data))
  return data.token
}
async function fetchSession(
  sessionId: string,
  jwtToken: string
): Promise<SessionData | null> {
  const sessionUrl = `https://registrar.api.heidihealth.com/api/v2/ml-scribe/open-api/sessions/${sessionId}`
  console.log('[v0] Fetching session:', sessionId)
  console.log('[v0] Session URL:', sessionUrl)
  const response = await fetch(sessionUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Accept': 'application/json',
    },
  })
  console.log('[v0] Session response status:', response.status)
  console.log('[v0] Session response content-type:', response.headers.get('content-type'))
  if (response.status === 404) {
    console.warn(`[v0] Session not found: ${sessionId}`)
    return null
  }
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[v0] Session fetch error for ${sessionId}:`, errorText)
    return null
  }
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    const text = await response.text()
    console.error('[v0] Session response is not JSON:', text)
    return null
  }
  const data = await response.json()
  return data.session || null
}
function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const key in obj) {
    const value = obj[key]
    const newKey = prefix ? `${prefix}_${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, newKey, result)
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value)
    } else {
      result[newKey] = value
    }
  }
  return result
}
function normalizeSession(sessionData: SessionData): Record<string, unknown> {
  const flattened: Record<string, unknown> = {}
  // Extract patient data separately
  const patient = sessionData.patient as Record<string, unknown> | undefined
  delete sessionData.patient
  // Flatten main session data
  flattenObject(sessionData, '', flattened)
  // Flatten patient data with "patient_" prefix
  if (patient) {
    flattenObject(patient, 'patient', flattened)
  }
  return flattened
}
export async function POST(request: NextRequest) {
  try {
    const { apiKey, userEmail, thirdPartyId, sessionKeys } = await request.json()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      )
    }
    if (!thirdPartyId) {
      return NextResponse.json(
        { error: 'Third party internal ID is required' },
        { status: 400 }
      )
    }
    if (!sessionKeys || !Array.isArray(sessionKeys) || sessionKeys.length === 0) {
      return NextResponse.json(
        { error: 'At least one session key is required' },
        { status: 400 }
      )
    }
    console.log('[v0] Generating JWT token...')
    const jwtToken = await generateJWT(apiKey, userEmail, thirdPartyId)
    console.log('[v0] JWT token generated successfully')
    console.log('[v0] Fetching sessions:', sessionKeys)
    const sessionDataPromises = sessionKeys.map(sessionId =>
      fetchSession(sessionId, jwtToken)
    )
    const sessionDataResults = await Promise.all(sessionDataPromises)
    const validSessions = sessionDataResults.filter(
      (session): session is SessionData => session !== null
    )
    console.log('[v0] Valid sessions fetched:', validSessions.length)
    if (validSessions.length === 0) {
      return NextResponse.json(
        { error: 'No valid session data found' },
        { status: 404 }
      )
    }
    const normalized = validSessions.map(session => normalizeSession(session))

    return NextResponse.json({
      success: true,
      sessions: normalized,
      audioTranscripts: validSessions.map((session, index) => ({
        sessionId: sessionKeys[index],
        audio: session.audio || null,
        transcript: session.transcript || null,
        patient: session.patient || null
      }))
    })
  } catch (error) {
    console.error('[v0] Error in POST handler:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
