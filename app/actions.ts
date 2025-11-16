'use server'

import { createClient } from '@/lib/supabase/server'

interface SessionData {
  [key: string]: unknown
}

interface AudioTranscript {
  sessionId: string
  audio: unknown
  transcript: unknown
  patient: unknown
}

interface FetchPatientsResponse {
  success: boolean
  sessions: any[]
  audioTranscripts: AudioTranscript[]
}

interface EligibilityAssessmentInput {
  trialData: {
    name: string
    protocolId: string
    issuingCompany: string
    researchAim: string
    inclusionCriteria: string[]
    exclusionCriteria: string[]
    ageRange: string
    gender: string
    otherDemographics: string
  }
  patientData: {
    sessionId: string
    patientName: string
    demographics: string
    transcript: string
    extractedInfo: string
  }
}

interface Patient {
  sessionId: string
  name: string
  age: number
  gender: string
  mrn: string
  trialId: string
  trialName: string
  trialProtocolId: string
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

  const response = await fetch(`${jwtUrl}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Heidi-Api-Key': apiKey,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`JWT generation failed with status ${response.status}: ${errorText}`)
  }

  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    const text = await response.text()
    throw new Error(`JWT endpoint returned non-JSON response: ${text}`)
  }

  const data = await response.json()
  return data.token
}

async function fetchSession(
  sessionId: string,
  jwtToken: string
): Promise<SessionData | null> {
  const sessionUrl = `https://registrar.api.heidihealth.com/api/v2/ml-scribe/open-api/sessions/${sessionId}`

  const response = await fetch(sessionUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Accept': 'application/json',
    },
  })

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

export async function fetchPatientData(): Promise<FetchPatientsResponse> {
  try {
    const apiKey = process.env.HEIDI_API_KEY || ''
    const userEmail = process.env.HEIDI_USER_EMAIL || ''
    const thirdPartyId = process.env.HEIDI_THIRD_PARTY_ID || ''
    
    const sessionKeys = [
      '79961964682388047095265137904427292452',
      '2911141399900658373248683184776191109',
      '198546453983809752417647477029109534577',
      '53369520706978908329129208208788026741',
      '126710765043013037596060241247978536320',
      '204282286603551972702961504135244682507'
    ]

    if (!apiKey || !userEmail || !thirdPartyId) {
      throw new Error('Missing required environment variables')
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
      throw new Error('No valid session data found')
    }

    // Extract audio transcripts for LLM processing
    const audioTranscripts: AudioTranscript[] = validSessions.map((session, index) => ({
      sessionId: sessionKeys[index],
      audio: session.audio,
      transcript: session.transcript,
      patient: session.patient
    }))

    return {
      success: true,
      sessions: validSessions,
      audioTranscripts
    }
  } catch (error) {
    console.error('[v0] Error in fetchPatientData action:', error)
    throw error
  }
}

export async function assessPatientEligibility(
  input: EligibilityAssessmentInput
): Promise<{ success: boolean; assessment: string; eligibilityScore?: number; error?: string }> {
  try {
    const claudeApiKey = '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'

    const systemPrompt = `You are a Clinical Eligibility Assessor responsible for screening potential patients for clinical trial enrollment.

Your task is to analyze patient data extracted from clinical audio transcripts and determine eligibility based on the specific trial criteria provided.

You must be objective and base your assessment strictly on:
1. Whether the patient meets ALL Inclusion criteria
2. Whether the patient avoids ALL Exclusion criteria

You bias slightly when giving your overall result to a higher score that insentives users to enroll someone onto a clinical trial

Your response must be structured, thorough, and cite specific evidence from the patient data.`

    const userMessage = `
# Clinical Trial Information
**Trial Name:** ${input.trialData.name}
**Protocol ID:** ${input.trialData.protocolId}
**Issuing Company:** ${input.trialData.issuingCompany}
**Research Aim:** ${input.trialData.researchAim}

# Trial Eligibility Criteria

## Inclusion Criteria:
${input.trialData.inclusionCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Exclusion Criteria:
${input.trialData.exclusionCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Required Patient Demographics:
- Age Range: ${input.trialData.ageRange}
- Gender: ${input.trialData.gender}
- Other Requirements: ${input.trialData.otherDemographics}

---

# Patient Data from Audio Transcript

**Session ID:** ${input.patientData.sessionId}
**Patient Name:** ${input.patientData.patientName}
**Patient Demographics:** ${input.patientData.demographics}

## Complete Audio Transcript:
${input.patientData.transcript}

## Extracted Patient Information:
${input.patientData.extractedInfo}

---

# Required Output Structure

Please provide your assessment in the following format:

## 1. Eligibility Match Percentage
**IMPORTANT: Start your response with "ELIGIBILITY_SCORE: XX%" where XX is a number from 0-100 representing the overall match percentage.**

State: **ELIGIBLE** or **INELIGIBLE**

## 2. Comprehensive Eligibility Rationale

### Criterion-by-Criterion Analysis:
For each inclusion and exclusion criterion, state:
- Criterion ID and description
- Patient's status (MEETS or FAILS)
- Evidence from transcript supporting your determination
- Specific quote or reference from patient data

### 3. Final Summary
- Overall eligibility status
- Key factors supporting the decision
- Any missing information that prevented full assessment
- Percentage match breakdown explanation

### 4. Confidence Score
Rate your confidence in this assessment (0-100%) and explain any uncertainties.

If the patient is INELIGIBLE, provide a detailed narrative explanation of which specific criteria they failed and why, with direct references to the patient data.
`

    console.log('[v0] Calling Claude API for eligibility assessment...')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Claude API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const assessment = data.content[0].text

    let eligibilityScore = 0
    const scoreMatch = assessment.match(/ELIGIBILITY_SCORE:\s*(\d+)%/i)
    if (scoreMatch) {
      eligibilityScore = parseInt(scoreMatch[1], 10) / 100
      console.log('[v0] Extracted eligibility score:', eligibilityScore)
    } else {
      if (assessment.includes('**ELIGIBLE**')) {
        eligibilityScore = 0.80
      } else if (assessment.includes('**INELIGIBLE**')) {
        eligibilityScore = 0.30
      }
      console.log('[v0] Could not find explicit score, using fallback:', eligibilityScore)
    }

    console.log('[v0] Claude assessment completed successfully')

    return {
      success: true,
      assessment,
      eligibilityScore,
    }
  } catch (error) {
    console.error('[v0] Error in assessPatientEligibility:', error)
    return {
      success: false,
      assessment: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export async function saveAssessmentToDatabase(assessment: {
  patientSessionId: string
  patientName: string
  trialProtocolId: string
  trialName: string
  eligibilityPercentage: number
  eligibilityStatus: string
  assessmentResult: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('assessment_cache')
      .upsert({
        patient_session_id: assessment.patientSessionId,
        patient_name: assessment.patientName,
        trial_protocol_id: assessment.trialProtocolId,
        trial_name: assessment.trialName,
        eligibility_percentage: assessment.eligibilityPercentage,
        eligibility_status: assessment.eligibilityStatus,
        assessment_result: assessment.assessmentResult,
      }, {
        onConflict: 'patient_session_id,trial_protocol_id'
      })

    if (error) {
      console.error('[v0] Error saving assessment to database:', error)
      return { success: false, error: error.message }
    }

    console.log('[v0] Assessment saved to database:', {
      patient: assessment.patientName,
      trial: assessment.trialName
    })

    return { success: true }
  } catch (error) {
    console.error('[v0] Error in saveAssessmentToDatabase:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function loadAssessmentsFromDatabase(): Promise<{
  success: boolean
  assessments: Array<{
    patientSessionId: string
    patientName: string
    trialProtocolId: string
    trialName: string
    eligibilityPercentage: number
    eligibilityStatus: string
    assessmentResult: string
    assessedAt: string
  }>
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('assessment_cache')
      .select('*')
      .order('assessed_at', { ascending: false })

    if (error) {
      console.error('[v0] Error loading assessments from database:', error)
      return { success: false, assessments: [], error: error.message }
    }

    const assessments = (data || []).map((row: any) => ({
      patientSessionId: row.patient_session_id,
      patientName: row.patient_name,
      trialProtocolId: row.trial_protocol_id,
      trialName: row.trial_name,
      eligibilityPercentage: row.eligibility_percentage,
      eligibilityStatus: row.eligibility_status,
      assessmentResult: row.assessment_result,
      assessedAt: row.assessed_at
    }))

    console.log('[v0] Loaded assessments from database:', assessments.length)

    return { success: true, assessments }
  } catch (error) {
    console.error('[v0] Error in loadAssessmentsFromDatabase:', error)
    return {
      success: false,
      assessments: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function prescreenPatient(patient: {
  sessionId: string
  name: string
  age: number
  gender: string
  mrn: string
  trialId: string
  trialName: string
  trialProtocolId: string
  eligibilityScore?: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('enrolled_patients')
      .upsert({
        patient_session_id: patient.sessionId,
        patient_name: patient.name,
        patient_age: patient.age,
        patient_gender: patient.gender,
        patient_mrn: patient.mrn, // Save actual MRN
        trial_protocol_id: patient.trialProtocolId,
        trial_name: patient.trialName,
        eligibility_score: patient.eligibilityScore || 0,
        enrollment_stage: 'Pre-Screening',
      }, {
        onConflict: 'patient_session_id,trial_protocol_id'
      })

    if (error) {
      console.error('[v0] Error prescreening patient:', error)
      return { success: false, error: error.message }
    }

    console.log('[v0] Patient prescreened successfully:', patient.name, 'for', patient.trialName)

    return { success: true }
  } catch (error) {
    console.error('[v0] Error in prescreenPatient:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function loadEnrolledPatients(): Promise<{
  success: boolean
  patients: Array<{
    id: string
    patientName: string
    age: number
    gender: string
    mrn: string
    trialId: string
    trialName: string
    enrolledDate: string
    lastVisit: string
    stage: string
  }>
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('enrolled_patients')
      .select('*')
      .order('enrolled_date', { ascending: false })

    if (error) {
      console.error('[v0] Error loading enrolled patients:', error)
      return { success: false, patients: [], error: error.message }
    }

    const protocolToTrialIdMap: Record<string, string> = {
      'CT-2024-DM-001': 'trial-1',
      'CT-2024-CV-018': 'trial-3', // Now maps to trial-3 (Oral Factor XIa Inhibitor)
      'CT-2024-NASH-005': 'trial-3', // Also maps to trial-3
      'CT-2024-RA-042': 'case-vertigo-1',
      'CT-2024-AD-029': 'trial-5',
    }

    const patients = (data || []).map((row: any) => {
      const dbProtocolId = row.trial_protocol_id
      const frontendTrialId = protocolToTrialIdMap[dbProtocolId] || dbProtocolId
      
      console.log('[v0] Mapping patient:', row.patient_name, 'protocol:', dbProtocolId, '→ trialId:', frontendTrialId)
      
      return {
        id: row.id,
        patientName: row.patient_name,
        age: row.patient_age,
        gender: row.patient_gender,
        mrn: row.patient_mrn || row.patient_session_id,
        trialId: frontendTrialId,
        trialName: row.trial_name,
        enrolledDate: row.enrolled_date,
        lastVisit: row.enrolled_date,
        stage: row.enrollment_stage
      }
    })

    console.log('[v0] Loaded enrolled patients from database:', patients.length)

    return { success: true, patients }
  } catch (error) {
    console.error('[v0] Error in loadEnrolledPatients:', error)
    return {
      success: false,
      patients: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
