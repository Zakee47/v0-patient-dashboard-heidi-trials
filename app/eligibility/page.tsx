'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, XCircle, AlertCircle, User, Calendar, Activity, FileText, Loader2, Beaker, Building2, Sparkles, Clock, Database, UserPlus } from 'lucide-react'
import { fetchPatientData as fetchPatientDataAction, loadAssessmentsFromDatabase, prescreenPatient } from '../actions'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'

interface ClinicalTrial {
  id: string
  protocolId: string
  trialName: string
  issuingCompany: string
  researchAim: string
  phase: string
  therapeuticArea: string
  demographics: {
    ageRange: { min: number; max: number }
    gender: string[]
    conditions: string[]
    exclusions: string[]
  }
  enrollment: {
    current: number
    target: number
  }
}

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  mrn: string
  eligibilityScore: number | null // Changed to nullable to support '--' display
  lastVisit: string
  criteria: {
    name: string
    met: boolean
    weight: number
    rationale: string
  }[]
}

interface AudioTranscript {
  sessionId: string
  audio: unknown
  transcript: unknown
  patient: unknown
}

interface CachedAssessment {
  patientId: string
  trialId: string
  result: string
  eligibilityScore: number // Added eligibility score to cache
  timestamp: number
}

const mockClinicalTrials: ClinicalTrial[] = [
  {
    id: 'trial-1',
    protocolId: 'CT-2024-DM-001',
    trialName: 'Novel GLP-1 Agonist for Type 2 Diabetes',
    issuingCompany: 'NovoMed Pharmaceuticals',
    researchAim: 'Evaluate efficacy and safety of investigational GLP-1 receptor agonist in reducing HbA1c levels and promoting weight loss in adults with Type 2 diabetes inadequately controlled on metformin monotherapy.',
    phase: 'Phase 3',
    therapeuticArea: 'Endocrinology',
    demographics: {
      ageRange: { min: 18, max: 65 },
      gender: ['Male', 'Female'],
      conditions: ['Type 2 Diabetes Mellitus', 'HbA1c 7.0-10.5%', 'BMI 25-40 kg/m²'],
      exclusions: ['Type 1 Diabetes', 'eGFR <60 mL/min/1.73m²', 'Recent MI or Stroke', 'Pregnancy']
    },
    enrollment: {
      current: 247,
      target: 450
    }
  },
  {
    id: 'trial-2',
    protocolId: 'CT-2024-CV-018',
    trialName: 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention for Stress-Triggered Hazardous Drinking',
    issuingCompany: 'CardioGenix Therapeutics',
    researchAim: 'Evaluate the efficacy and safety of monthly extended-release naltrexone in combination with a brief, manualized CBT intervention (4 sessions) to reduce heavy drinking days and improve functioning in adults who engage in stress-triggered hazardous drinking with comorbid anxiety/depressive symptoms.',
    phase: 'Phase 2/3',
    therapeuticArea: 'Cardiovascular',
    demographics: {
      ageRange: { min: 20, max: 65 },
      gender: ['Male', 'Female'],
      conditions: [ 'Moderate Alcohol Use Disorder (DSM-5) or hazardous episodic heavy drinking (≥4 heavy drinking days in past 30 days)',
      'Self-reported stress-triggered drinking related to work/family stressors',
      'Clinically significant anxiety or depressive symptoms (subthreshold to mild-moderate severity)'],
      exclusions: ['Current opioid use or requirement for opioid analgesia (due to opioid antagonist risk)',
      'History of severe alcohol withdrawal requiring medically supervised detox in last 6 months',
      'Severe untreated major depressive disorder with active suicidal ideation or intent',
      'Current diagnosis of primary psychotic disorder or bipolar I disorder',
      'Severe hepatic impairment (ALT/AST >5x ULN) or other unstable medical illness',
      'Pregnancy or breastfeeding',
      'Use of disallowed investigational agents within 30 days prior to screening']
    },
    enrollment: {
      current: 89,
      target: 200
    }
  },
  {
    id: 'trial-3',
    protocolId: 'CT-2024-NASH-005',
    trialName: 'Oral Factor XIa Inhibitor (FXIaX) Versus Standard Direct Oral Anticoagulant Therapy for Acute Symptomatic Pulmonary Embolism',
    issuingCompany: 'Hepatica BioPharma',
    researchAim: 'Compare the efficacy and safety of an investigational oral Factor XIa inhibitor (FXIaX) to standard-of-care direct oral anticoagulant (DOAC) therapy for reduction of recurrent venous thromboembolism (VTE) and major bleeding in adults presenting with acute symptomatic pulmonary embolism (PE).',
    phase: 'Phase 2',
    therapeuticArea: 'Cardiology / Thrombosis',
    demographics: {
      ageRange: { min: 18, max: 70 },
      gender: ['Male', 'Female'],
      conditions: ['Confirmed acute symptomatic pulmonary embolism on imaging (CT pulmonary angiography or V/Q) within 72 hours of randomization',
      'May have concomitant symptomatic proximal deep vein thrombosis (DVT)',
      'Hemodynamically stable (submassive or low-risk PE; not requiring immediate thrombolysis or embolectomy)'],
      exclusions: [ 'Hemodynamically unstable PE requiring systemic thrombolysis or surgical embolectomy',
      'High bleeding risk: recent (within 30 days) major surgery, recent intracranial hemorrhage, active gastrointestinal bleeding, or known bleeding disorder',
      'Platelet count <100,000/µL',
      'Severe renal impairment (eGFR <30 mL/min/1.73 m²) or on dialysis',
      'Severe hepatic impairment (Child-Pugh C) or baseline ALT/AST >3x ULN',
      'Current use of strong CYP3A4 or P-gp inhibitors/inducers that would interact with the investigational drug',
      'Concomitant requirement for dual antiplatelet therapy that cannot be stopped',
      'Pregnancy or breastfeeding; unwillingness to use effective contraception if of childbearing potential',
      'Known active malignancy with anticipated life expectancy <6 months (this cohort to be considered in separate oncology-focused trials)',
      'Hypersensitivity to study drug or to comparator DOAC']
    },
    enrollment: {
      current: 34,
      target: 150
    }
  },
  {
    id: 'trial-4',
    protocolId: 'CT-2024-RA-042',
    trialName: 'Acute Positional Vertigo Evaluation and Management',
    issuingCompany: 'ImmunoThera Sciences',
    researchAim: 'Assess and document clinical features of sudden-onset positional vertigo and evaluate response to positional maneuvers such as the Epley maneuver.',
    phase: 'Phase 3',
    therapeuticArea: 'Neurology / Vestibular Disorders',
    demographics: {
      ageRange: { min: 18, max: 75 },
      gender: ['Male', 'Female'],
      conditions: ["Acute onset vertigo",
      "Positional dizziness triggered by head movement",
      "Nausea and vomiting",
      "Gait instability"],
      exclusions: ["Recent head trauma",
      "Known aneurysms",
      "Bleeding disorders",
      "Immunocompromised status",
      "Concurrent otologic infections"]
    },
    enrollment: {
      current: 312,
      target: 600
    }
  },
  {
    id: 'trial-5',
    protocolId: 'CT-2024-AD-029',
    trialName: 'Amyloid-Beta Monoclonal Antibody for Early Alzheimer\'s',
    issuingCompany: 'NeuroCog Research Group',
    researchAim: 'Determine whether monthly IV infusions of anti-amyloid-beta monoclonal antibody can slow cognitive decline measured by CDR-SB in patients with mild cognitive impairment or mild dementia due to Alzheimer\'s disease with confirmed amyloid pathology.',
    phase: 'Phase 3',
    therapeuticArea: 'Neurology',
    demographics: {
      ageRange: { min: 50, max: 85 },
      gender: ['Male', 'Female'],
      conditions: ['MCI or mild AD dementia', 'Positive amyloid PET scan', 'CDR 0.5 or 1.0', 'MMSE 22-30'],
      exclusions: ['Other neurological disorders', 'Recent stroke', 'MRI contraindications', 'Anticoagulation therapy']
    },
    enrollment: {
      current: 891,
      target: 1500
    }
  }
]

const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    age: 45,
    gender: 'Female',
    mrn: 'MRN-2024-001',
    eligibilityScore: 0.92,
    lastVisit: '2024-11-10',
    criteria: [
      { name: 'Age Range (18-65)', met: true, weight: 0.15, rationale: 'Patient is 45 years old, within the required range of 18-65 years.' },
      { name: 'Diagnosis Confirmation', met: true, weight: 0.25, rationale: 'Type 2 diabetes mellitus confirmed via HbA1c >7.5% and clinical evaluation.' },
      { name: 'No Prior Treatment', met: true, weight: 0.20, rationale: 'Patient has not received any experimental diabetes medications in the past 6 months.' },
      { name: 'Renal Function', met: true, weight: 0.15, rationale: 'eGFR at 78 mL/min/1.73m², above the minimum threshold of 60 mL/min/1.73m².' },
      { name: 'Cardiovascular History', met: true, weight: 0.10, rationale: 'No history of myocardial infarction or stroke in the past 12 months.' },
      { name: 'Lab Values', met: false, weight: 0.15, rationale: 'LDL cholesterol at 195 mg/dL, exceeds maximum threshold of 190 mg/dL by 5 mg/dL.' }
    ]
  },
  {
    id: '2',
    name: 'Michael Chen',
    age: 58,
    gender: 'Female',
    mrn: 'MRN-2024-002',
    eligibilityScore: 0.78,
    lastVisit: '2024-11-12',
    criteria: [
      { name: 'Age Range (18-65)', met: true, weight: 0.15, rationale: 'Patient is 58 years old, within acceptable range.' },
      { name: 'Diagnosis Confirmation', met: true, weight: 0.25, rationale: 'Type 2 diabetes confirmed with HbA1c at 8.2%.' },
      { name: 'No Prior Treatment', met: false, weight: 0.20, rationale: 'Patient participated in a GLP-1 trial 4 months ago. Requires 6-month washout period.' },
      { name: 'Renal Function', met: true, weight: 0.15, rationale: 'eGFR at 72 mL/min/1.73m², meets minimum requirement.' },
      { name: 'Cardiovascular History', met: true, weight: 0.10, rationale: 'No significant cardiovascular events in medical history.' },
      { name: 'Lab Values', met: true, weight: 0.15, rationale: 'All laboratory values within acceptable ranges for trial participation.' }
    ]
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    age: 34,
    gender: 'Female',
    mrn: 'MRN-2024-003',
    eligibilityScore: 0.85,
    lastVisit: '2024-11-14',
    criteria: [
      { name: 'Age Range (18-65)', met: true, weight: 0.15, rationale: 'Patient is 34 years old, well within the trial age requirements.' },
      { name: 'Diagnosis Confirmation', met: true, weight: 0.25, rationale: 'Newly diagnosed Type 2 diabetes with HbA1c at 9.1%.' },
      { name: 'No Prior Treatment', met: true, weight: 0.20, rationale: 'No previous participation in clinical trials. Treatment naive.' },
      { name: 'Renal Function', met: true, weight: 0.15, rationale: 'eGFR at 92 mL/min/1.73m², excellent renal function.' },
      { name: 'Cardiovascular History', met: false, weight: 0.10, rationale: 'Hypertension stage 2, requires additional cardiovascular clearance.' },
      { name: 'Lab Values', met: true, weight: 0.15, rationale: 'Lipid panel and liver function tests within normal limits.' }
    ]
  },
  {
    id: '4',
    name: 'James Wilson',
    age: 52,
    gender: 'Female',
    mrn: 'MRN-2024-004',
    eligibilityScore: 0.65,
    lastVisit: '2024-11-13',
    criteria: [
      { name: 'Age Range (18-65)', met: true, weight: 0.15, rationale: 'Patient is 58 years old, meets age criteria.' },
      { name: 'Diagnosis Confirmation', met: true, weight: 0.25, rationale: 'Long-standing Type 2 diabetes, HbA1c at 7.8%.' },
      { name: 'No Prior Treatment', met: true, weight: 0.20, rationale: 'Has not participated in clinical research previously.' },
      { name: 'Renal Function', met: false, weight: 0.15, rationale: 'eGFR at 55 mL/min/1.73m², below required threshold of 60 mL/min/1.73m².' },
      { name: 'Cardiovascular History', met: false, weight: 0.10, rationale: 'History of angina, currently stable but requires cardiology consultation.' },
      { name: 'Lab Values', met: true, weight: 0.15, rationale: 'Metabolic panel acceptable aside from mild creatinine elevation.' }
    ]
  },
  {
    id: '5',
    name: 'Linda Martinez',
    age: 41,
    gender: 'Female',
    mrn: 'MRN-2024-005',
    eligibilityScore: 0.95,
    lastVisit: '2024-11-15',
    criteria: [
      { name: 'Age Range (18-65)', met: true, weight: 0.15, rationale: 'Patient is 41 years old, optimal age for trial participation.' },
      { name: 'Diagnosis Confirmation', met: true, weight: 0.25, rationale: 'Type 2 diabetes confirmed with HbA1c at 8.5%, meets inclusion criteria.' },
      { name: 'No Prior Treatment', met: true, weight: 0.20, rationale: 'No exposure to experimental medications. Currently on metformin only.' },
      { name: 'Renal Function', met: true, weight: 0.15, rationale: 'eGFR at 95 mL/min/1.73m², excellent renal function for trial safety.' },
      { name: 'Cardiovascular History', met: true, weight: 0.10, rationale: 'No cardiovascular disease. Normal ECG and stress test results.' },
      { name: 'Lab Values', met: true, weight: 0.15, rationale: 'Complete metabolic panel and lipid profile all within normal ranges.' }
    ]
  },
  {
    id: '6',
    name: 'Robert Thompson',
    age: 67,
    gender: 'Female',
    mrn: 'MRN-2024-006',
    eligibilityScore: 0.45,
    lastVisit: '2024-11-11',
    criteria: [
      { name: 'Age Range (18-65)', met: false, weight: 0.15, rationale: 'Patient is 67 years old, exceeds maximum age of 65 years by 2 years.' },
      { name: 'Diagnosis Confirmation', met: true, weight: 0.25, rationale: 'Type 2 diabetes diagnosis confirmed, HbA1c at 8.0%.' },
      { name: 'No Prior Treatment', met: true, weight: 0.20, rationale: 'No recent clinical trial participation documented.' },
      { name: 'Renal Function', met: false, weight: 0.15, rationale: 'eGFR at 48 mL/min/1.73m², stage 3 CKD, below trial requirement.' },
      { name: 'Cardiovascular History', met: true, weight: 0.10, rationale: 'Remote history of MI (>5 years), currently stable on therapy.' },
      { name: 'Lab Values', met: false, weight: 0.15, rationale: 'Elevated liver enzymes (ALT 78 U/L), requires further hepatology evaluation.' }
    ]
  }
]

function getScoreColor(score: number | null) {
  if (score === null) return 'text-muted-foreground'
  if (score >= 0.85) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 0.70) return 'text-blue-600 dark:text-blue-400'
  if (score >= 0.50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getScoreBadgeVariant(score: number | null) {
  if (score === null) return 'outline'
  if (score >= 0.85) return 'default'
  if (score >= 0.70) return 'secondary'
  if (score >= 0.50) return 'outline'
  return 'destructive'
}

function getScoreLabel(score: number | null) {
  if (score === null) return 'Not Assessed'
  if (score >= 0.85) return 'High Eligibility'
  if (score >= 0.70) return 'Moderate Eligibility'
  if (score >= 0.50) return 'Low Eligibility'
  return 'Not Eligible'
}

function seededRandom(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const x = Math.sin(Math.abs(hash)) * 10000
  return x - Math.floor(x)
}

function getSeededAge(patientName: string): number {
  const random = seededRandom(patientName)
  return Math.floor(random * (65 - 18 + 1)) + 18
}

function getGenderForPatient(patientName: string): string {
  return 'Female'
}

export default function ClinicalTrialDashboard() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(mockPatients[0])
  const [patients, setPatients] = useState<Patient[]>(mockPatients)
  const [audioTranscripts, setAudioTranscripts] = useState<AudioTranscript[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clinicalTrials] = useState<ClinicalTrial[]>(mockClinicalTrials)
  const [selectedTrial, setSelectedTrial] = useState<ClinicalTrial | null>(mockClinicalTrials[0])
  const [assessmentResult, setAssessmentResult] = useState<string | null>(null)
  const [assessmentCache, setAssessmentCache] = useState<Map<string, CachedAssessment>>(new Map())
  const [eligibilityScores, setEligibilityScores] = useState<Map<string, number>>(new Map())
  const [prescreening, setPrescreening] = useState(false)
  const [prescreenSuccess, setPrescreenSuccess] = useState(false)
  const [sortByEligibility, setSortByEligibility] = useState(false)

  useEffect(() => {
    const initializeData = async () => {
      await loadCachedAssessments()
      await fetchPatientData()
    }
    initializeData()
  }, []) // Empty dependency array ensures this only runs once

  useEffect(() => {
    if (assessmentCache.size > 0 && patients.length > 0 && selectedTrial) {
      const updatedPatients = patients.map((patient) => {
        const cacheKey = `${patient.id}_${selectedTrial.id}`
        const cached = assessmentCache.get(cacheKey)
        
        if (cached) {
          return { ...patient, eligibilityScore: cached.eligibilityScore }
        }
        return patient
      })
      
      setPatients(updatedPatients)
      
      // Also update selected patient if it exists
      if (selectedPatient) {
        const cacheKey = `${selectedPatient.id}_${selectedTrial.id}`
        const cached = assessmentCache.get(cacheKey)
        if (cached) {
          setSelectedPatient({ ...selectedPatient, eligibilityScore: cached.eligibilityScore })
        }
      }
    }
  }, [assessmentCache, selectedTrial])

  useEffect(() => {
    if (selectedPatient && selectedTrial) {
      const cacheKey = `${selectedPatient.id}_${selectedTrial.id}`
      const cached = assessmentCache.get(cacheKey)
      
      if (cached) {
        console.log('[v0] Auto-displaying cached assessment for', selectedPatient.name, '-', selectedTrial.trialName)
        setAssessmentResult(cached.result)
      } else {
        console.log('[v0] No cached assessment found for', selectedPatient.name, '-', selectedTrial.trialName)
        setAssessmentResult(null)
      }
    }
  }, [selectedPatient?.id, selectedTrial, assessmentCache]) // Only depend on selectedPatient.id to avoid infinite loop

  const loadCachedAssessments = async () => {
    console.log('[v0] Loading cached assessments from database...')
    const result = await loadAssessmentsFromDatabase()
    
    if (result.success) {
      const newCache = new Map<string, CachedAssessment>()
      const newScores = new Map<string, number>()
      
      result.assessments.forEach((assessment) => {
        const patientId = assessment.patientSessionId
        const trialProtocolId = assessment.trialProtocolId
        
        const matchingTrial = clinicalTrials.find(t => t.protocolId === trialProtocolId)
        if (!matchingTrial) {
          console.warn('[v0] No matching trial found for protocol:', trialProtocolId)
          return
        }
        
        const cacheKey = `${patientId}_${matchingTrial.id}`
        console.log('[v0] Loading cache entry:', cacheKey, 'for patient:', assessment.patientName)
        
        newCache.set(cacheKey, {
          patientId,
          trialId: matchingTrial.id,
          result: assessment.assessmentResult,
          eligibilityScore: assessment.eligibilityPercentage / 100,
          timestamp: new Date(assessment.assessedAt).getTime()
        })
        
        newScores.set(cacheKey, assessment.eligibilityPercentage / 100)
      })
      
      setAssessmentCache(newCache)
      setEligibilityScores(newScores)
      console.log('[v0] Loaded', newCache.size, 'cached assessments from database')
    } else {
      console.error('[v0] Failed to load cached assessments:', result.error)
    }
  }

  const fetchPatientData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchPatientDataAction()
      
      const processedTranscripts = (data.audioTranscripts || []).map((item: any) => {
        let transcriptText = ''
        if (Array.isArray(item.audio)) {
          transcriptText = item.audio
            .map((audioItem: any) => audioItem.transcript)
            .filter(Boolean)
            .join('\n\n')
        }
        
        return {
          ...item,
          transcript: transcriptText || item.transcript
        }
      })
      
      setAudioTranscripts(processedTranscripts)
      
      const transformedPatients = data.sessions.map((session: any, index: number) => {
        const patientName = session.patient_name || 
                           session.patient?.name || 
                           (session.patient && typeof session.patient === 'object' 
                             ? Object.values(session.patient).find(v => typeof v === 'string' && v.length > 0) 
                             : null) ||
                           `Patient ${index + 1}`
        
        const age = getSeededAge(patientName)
        const gender = getGenderForPatient(patientName)
        const patientId = session.session_id || session.id || `patient-${index}`
        
        const scoreKey = `${patientId}_${selectedTrial?.id || ''}`
        const cachedScore = eligibilityScores.get(scoreKey) || null
        
        console.log(`[v0] Patient ${patientName}: age=${age}, gender=${gender}`)
        
        return {
          id: patientId,
          name: patientName,
          age: age,
          gender: gender,
          mrn: session.patient_mrn || session.patient_id || `MRN-${index}`,
          eligibilityScore: cachedScore,
          lastVisit: session.created_at || new Date().toISOString(),
          criteria: mockPatients[0].criteria
        }
      })

      if (transformedPatients.length > 0) {
        setPatients(transformedPatients)
        setSelectedPatient(transformedPatients[0])
      }
      
      console.log('[v0] Audio transcripts processed:', processedTranscripts.length, 'with text extracted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient data')
      console.error('[v0] Error fetching patient data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrescreenPatient = async () => {
    if (!selectedPatient || !selectedTrial) {
      return
    }

    setPrescreening(true)
    setPrescreenSuccess(false)
    
    try {
      const result = await prescreenPatient({
        sessionId: selectedPatient.id,
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        mrn: selectedPatient.mrn,
        trialId: selectedTrial.id,
        trialName: selectedTrial.trialName,
        trialProtocolId: selectedTrial.protocolId,
        eligibilityScore: selectedPatient.eligibilityScore ? Math.round(selectedPatient.eligibilityScore * 100) : 0
      })

      if (result.success) {
        setPrescreenSuccess(true)
        setTimeout(() => setPrescreenSuccess(false), 3000)
      } else {
        setError(result.error || 'Failed to prescreen patient')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prescreen patient')
    } finally {
      setPrescreening(false)
    }
  }

  const filteredPatients = (() => {
    let filtered = selectedTrial
      ? patients.filter((patient) => {
          const ageMatch = patient.age >= selectedTrial.demographics.ageRange.min && 
                          patient.age <= selectedTrial.demographics.ageRange.max
          const genderMatch = selectedTrial.demographics.gender.includes(patient.gender)
          return ageMatch && genderMatch
        })
      : patients

    // Sort by eligibility score if enabled
    if (sortByEligibility) {
      filtered = [...filtered].sort((a, b) => {
        // Null scores go to the bottom
        if (a.eligibilityScore === null && b.eligibilityScore === null) return 0
        if (a.eligibilityScore === null) return 1
        if (b.eligibilityScore === null) return -1
        // Sort in descending order (highest first)
        return b.eligibilityScore - a.eligibilityScore
      })
    }

    return filtered
  })()

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className={`min-h-screen transition-[margin-left] duration-300 ease-in-out ml-64`}>
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Clinical Trial Eligibility Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">Matching patients to clinical trials using AI-powered analysis</p>
              </div>
              <div className="flex items-center gap-3">
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading patient data...</span>
                  </div>
                ) : assessmentCache.size > 0 ? (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-2">
                    <Database className="h-4 w-4" />
                    <span>{assessmentCache.size} assessments loaded from database</span>
                  </Badge>
                ) : null}
              </div>
            </div>
            {error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
              </div>
            )}
          </div>
        </header>

        <div className="container mx-auto p-6 space-y-6">
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Active Clinical Trials
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {clinicalTrials.length} trials available for patient matching • {selectedTrial ? `Selected: ${selectedTrial.trialName}` : 'Click to select a trial'}
              </p>
            </div>
            
            <div className="w-full overflow-x-auto">
              <div className="flex gap-4 pb-4 min-w-max">
                {clinicalTrials.map((trial) => (
                  <Card 
                    key={trial.id} 
                    className={`flex-shrink-0 w-[400px] cursor-pointer transition-all hover:shadow-lg ${
                      selectedTrial?.id === trial.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedTrial(trial)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2">
                            {trial.phase}
                          </Badge>
                          <CardTitle className="text-base leading-tight text-foreground">
                            {trial.trialName}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <Building2 className="h-3 w-3" />
                        <span>{trial.issuingCompany}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Protocol ID</p>
                        <p className="text-sm font-mono text-foreground">{trial.protocolId}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Research Aim</p>
                        <p className="text-sm text-foreground leading-relaxed text-pretty line-clamp-3">
                          {trial.researchAim}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Demographics</p>
                        <div className="space-y-1">
                          <p className="text-xs text-foreground">
                            <span className="font-medium">Age:</span> {trial.demographics.ageRange.min}-{trial.demographics.ageRange.max} years
                          </p>
                          <p className="text-xs text-foreground">
                            <span className="font-medium">Gender:</span> {trial.demographics.gender.join(', ')}
                          </p>
                          <p className="text-xs text-foreground">
                            <span className="font-medium">Key Conditions:</span> {trial.demographics.conditions.slice(0, 2).join(', ')}
                            {trial.demographics.conditions.length > 2 && '...'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Enrollment</span>
                          <span className="font-medium text-foreground">
                            {trial.enrollment.current} / {trial.enrollment.target}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${(trial.enrollment.current / trial.enrollment.target) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Patient Roster
                  </CardTitle>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-muted-foreground">
                      {filteredPatients.length} of {patients.length} patients match trial criteria
                    </p>
                    <Button
                      variant={sortByEligibility ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortByEligibility(!sortByEligibility)}
                      className="ml-2"
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      {sortByEligibility ? 'Sorted' : 'Sort'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-520px)]">
                    <div className="space-y-1 p-4">
                      {filteredPatients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => setSelectedPatient(patient)}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            selectedPatient?.id === patient.id
                              ? 'bg-accent border-primary shadow-sm'
                              : 'bg-card hover:bg-accent/50 border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-medium text-foreground">{patient.name}</h3>
                              <p className="text-xs text-muted-foreground">{patient.mrn}</p>
                            </div>
                            <Badge variant={getScoreBadgeVariant(patient.eligibilityScore)} className="ml-2">
                              {patient.eligibilityScore === null ? '--' : `${(patient.eligibilityScore * 100).toFixed(0)}%`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{patient.age}y • {patient.gender}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(patient.lastVisit).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {selectedPatient ? (
                <div className="space-y-6">
                  {/* Patient Header */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-semibold text-foreground">{selectedPatient.name}</h2>
                          <p className="text-muted-foreground">{selectedPatient.mrn}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-4xl font-bold ${getScoreColor(selectedPatient.eligibilityScore)}`}>
                            {selectedPatient.eligibilityScore === null ? '--' : `${(selectedPatient.eligibilityScore * 100).toFixed(0)}%`}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getScoreLabel(selectedPatient.eligibilityScore)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                        <div>
                          <p className="text-xs text-muted-foreground">Age</p>
                          <p className="text-sm font-medium text-foreground">{selectedPatient.age} years</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Gender</p>
                          <p className="text-sm font-medium text-foreground">{selectedPatient.gender}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Visit</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(selectedPatient.lastVisit).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {selectedTrial && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <Button 
                            onClick={handlePrescreenPatient}
                            disabled={prescreening || prescreenSuccess}
                            className="w-full"
                            size="lg"
                          >
                            {prescreening ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Prescreening Patient...
                              </>
                            ) : prescreenSuccess ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Patient Prescreened Successfully
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Pre Screen Patient for this trial
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Add this patient to the enrollment pipeline
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>


                  {assessmentResult ? (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-primary" />
                              AI Eligibility Assessment
                              <Badge variant="secondary" className="ml-2">
                                <Database className="h-3 w-3 mr-1" />
                                From Database
                              </Badge>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Analysis for {selectedPatient?.name} • {selectedTrial?.trialName}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[600px]">
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground bg-muted/30 p-4 rounded-lg">
                              {assessmentResult}
                            </pre>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ) : selectedTrial ? (
                    <Card className="bg-muted/30">
                      <CardContent className="pt-6 text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">
                          No assessment available for this patient-trial combination
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Select a different trial or patient to view cached assessments
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-muted/30">
                      <CardContent className="pt-6 text-center">
                        <Beaker className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">
                          Select a clinical trial above to view AI eligibility assessment
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent>
                    <p className="text-muted-foreground">Select a patient to view details and assessment</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
