'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Navigation } from '@/components/navigation'
import { User, Calendar, Activity, Beaker, Users, CheckCircle2, Circle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { loadEnrolledPatients } from '../actions'

interface EnrolledPatient {
  id: string
  patientName: string
  age: number
  gender: string
  mrn: string
  trialId: string
  trialName: string
  enrolledDate: string
  lastVisit: string
  stage: 'Pre-Screening' | 'First Visit Scheduled' | 'Randomisation' | '30-Day Follow Up' | '60-Day Follow Up' | '90-Day Follow Up'
}

const stageInfo = [
  {
    name: 'Pre-Screening',
    description: 'Initial eligibility assessment and patient consent collection',
    order: 1,
    details: {
      activities: [
        'Review inclusion/exclusion criteria',
        'Obtain informed consent',
        'Medical history collection',
        'Initial screening questionnaire'
      ],
      notes: 'Patient expressed interest and meets preliminary criteria'
    }
  },
  {
    name: 'First Visit Scheduled',
    description: 'Baseline measurements, vital signs, and initial protocol procedures',
    order: 2,
    details: {
      activities: [
        'Physical examination',
        'Vital signs (BP, HR, temp)',
        'Blood and urine samples collected',
        'ECG performed',
        'Baseline assessments completed'
      ],
      notes: 'All baseline measurements within acceptable ranges'
    }
  },
  {
    name: 'Randomisation',
    description: 'Patient randomly assigned to treatment or control group',
    order: 3
  },
  {
    name: '30-Day Follow Up',
    description: 'First follow-up assessment and safety monitoring',
    order: 4,
    details: {
      activities: [
        'Safety assessment performed',
        'Adverse events reviewed',
        'Medication compliance checked',
        'Laboratory tests completed',
        'Patient-reported outcomes collected'
      ],
      notes: 'No adverse events reported, good compliance'
    }
  },
  {
    name: '60-Day Follow Up',
    description: 'Second follow-up with efficacy and safety evaluations',
    order: 5,
    details: {
      activities: [
        'Efficacy assessments completed',
        'Safety monitoring continued',
        'Physical examination',
        'Laboratory evaluations',
        'Quality of life questionnaires'
      ],
      notes: 'Positive response to treatment observed'
    }
  },
  {
    name: '90-Day Follow Up',
    description: 'Final follow-up assessment and study completion procedures',
    order: 6,
    details: {
      activities: [
        'Final efficacy evaluation',
        'Complete safety assessment',
        'End-of-study procedures',
        'Final laboratory tests',
        'Study completion documentation'
      ],
      notes: 'Study completed successfully, patient to continue standard care'
    }
  }
]

const clinicalTrials = [
  {
    id: 'trial-1',
    protocolId: 'CT-2025-AUD-012',
    trialName: 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention for Stress-Triggered Hazardous Drinking',
    issuingCompany: 'Harbor Neuroscience & Behavioral Health',
    phase: 'Phase 2b',
    therapeuticArea: 'Addiction / Psychiatry'
  },
  {
    id: 'trial-3',
    protocolId: 'CT-2025-VTE-007',
    trialName: 'Oral Factor XIa Inhibitor (FXIaX) Versus Standard Direct Oral Anticoagulant Therapy for Acute Symptomatic Pulmonary Embolism',
    issuingCompany: 'ThromboX Biotech',
    phase: 'Phase 3',
    therapeuticArea: 'Cardiology / Thrombosis'
  },
  {
    id: 'case-vertigo-1',
    protocolId: 'AC-2025-NEURO-002',
    trialName: 'Acute Positional Vertigo Evaluation and Management',
    issuingCompany: 'Primary Care Clinic — Neurology Screening',
    phase: 'Assessment',
    therapeuticArea: 'Neurology / Vestibular Disorders'
  }
]

const mockEnrolledPatients: EnrolledPatient[] = [
  {
    id: '1',
    patientName: 'Sarah Johnson',
    age: 45,
    gender: 'Female',
    mrn: 'MRN-2025-001',
    trialId: 'trial-1',
    trialName: 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention',
    enrolledDate: '2024-09-15',
    lastVisit: '2024-11-20',
    stage: 'Randomisation'
  },
  {
    id: '2',
    patientName: 'Michael Chen',
    age: 38,
    gender: 'Male',
    mrn: 'MRN-2025-002',
    trialId: 'trial-1',
    trialName: 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention',
    enrolledDate: '2024-10-02',
    lastVisit: '2024-11-18',
    stage: '30-Day Follow Up'
  },
  {
    id: '3',
    patientName: 'Emily Rodriguez',
    age: 52,
    gender: 'Female',
    mrn: 'MRN-2025-003',
    trialId: 'trial-1',
    trialName: 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention',
    enrolledDate: '2024-08-20',
    lastVisit: '2024-11-15',
    stage: '90-Day Follow Up'
  },
  {
    id: '4',
    patientName: 'James Wilson',
    age: 29,
    gender: 'Male',
    mrn: 'MRN-2025-004',
    trialId: 'trial-1',
    trialName: 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention',
    enrolledDate: '2024-07-10',
    lastVisit: '2024-11-10',
    stage: '60-Day Follow Up'
  },
  {
    id: '5',
    patientName: 'Linda Martinez',
    age: 61,
    gender: 'Female',
    mrn: 'MRN-2025-005',
    trialId: 'trial-3',
    trialName: 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism',
    enrolledDate: '2024-10-15',
    lastVisit: '2024-11-22',
    stage: 'Randomisation'
  },
  {
    id: '6',
    patientName: 'Robert Thompson',
    age: 54,
    gender: 'Male',
    mrn: 'MRN-2025-006',
    trialId: 'trial-3',
    trialName: 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism',
    enrolledDate: '2024-09-28',
    lastVisit: '2024-11-21',
    stage: '30-Day Follow Up'
  },
  {
    id: '7',
    patientName: 'Patricia Davis',
    age: 47,
    gender: 'Female',
    mrn: 'MRN-2025-007',
    trialId: 'trial-3',
    trialName: 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism',
    enrolledDate: '2024-11-01',
    lastVisit: '2024-11-19',
    stage: 'First Visit Scheduled'
  },
  {
    id: '8',
    patientName: 'David Brown',
    age: 70,
    gender: 'Male',
    mrn: 'MRN-2025-008',
    trialId: 'trial-3',
    trialName: 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism',
    enrolledDate: '2024-08-05',
    lastVisit: '2024-11-17',
    stage: '90-Day Follow Up'
  },
  {
    id: '9',
    patientName: 'Jennifer White',
    age: 42,
    gender: 'Female',
    mrn: 'MRN-2025-009',
    trialId: 'trial-3',
    trialName: 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism',
    enrolledDate: '2024-09-12',
    lastVisit: '2024-11-16',
    stage: 'Randomisation'
  },
  {
    id: '10',
    patientName: 'Christopher Lee',
    age: 55,
    gender: 'Male',
    mrn: 'MRN-2025-010',
    trialId: 'case-vertigo-1',
    trialName: 'Acute Positional Vertigo Evaluation and Management',
    enrolledDate: '2024-11-05',
    lastVisit: '2024-11-23',
    stage: 'Pre-Screening'
  },
  {
    id: '11',
    patientName: 'Amanda Garcia',
    age: 33,
    gender: 'Female',
    mrn: 'MRN-2025-011',
    trialId: 'trial-1',
    trialName: 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention',
    enrolledDate: '2024-10-20',
    lastVisit: '2024-11-14',
    stage: 'First Visit Scheduled'
  },
  {
    id: '12',
    patientName: 'Thomas Anderson',
    age: 48,
    gender: 'Male',
    mrn: 'MRN-2025-012',
    trialId: 'trial-3',
    trialName: 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism',
    enrolledDate: '2024-10-08',
    lastVisit: '2024-11-20',
    stage: '60-Day Follow Up'
  }
]

const getStageBadge = (stage: EnrolledPatient['stage']) => {
  const styles = {
    'Pre-Screening': 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    'First Visit Scheduled': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20',
    'Randomisation': 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
    '30-Day Follow Up': 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20',
    '60-Day Follow Up': 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
    '90-Day Follow Up': 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
  }
  return styles[stage]
}

export default function EnrollmentDashboard() {
  const [selectedPatient, setSelectedPatient] = useState<EnrolledPatient | null>(null)
  const [selectedTrial, setSelectedTrial] = useState<string | 'all'>('all')
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [enrolledPatients, setEnrolledPatients] = useState<EnrolledPatient[]>(mockEnrolledPatients)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true)
      try {
        const result = await loadEnrolledPatients()
        if (result.success) {
          const dbPatients = result.patients as EnrolledPatient[]
          if (dbPatients.length > 0) {
            setEnrolledPatients(dbPatients)
          }
        } else {
          setError(result.error || 'Failed to load enrolled patients')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load enrolled patients')
      } finally {
        setLoading(false)
      }
    }
    loadPatients()
  }, [])

  const toggleStageExpansion = (stageName: string) => {
    const newExpanded = new Set(expandedStages)
    if (newExpanded.has(stageName)) {
      newExpanded.delete(stageName)
    } else {
      newExpanded.add(stageName)
    }
    setExpandedStages(newExpanded)
  }

  const filteredPatients = selectedTrial === 'all' 
    ? enrolledPatients 
    : enrolledPatients.filter(p => {
        // Find the selected trial object
        const trial = clinicalTrials.find(t => t.id === selectedTrial)
        if (!trial) return false
        
        // Match patient's trialId against both trial.id and trial.protocolId
        // since database stores protocol IDs but UI uses trial IDs
        return p.trialId === trial.id || p.trialId === trial.protocolId
      })

  const totalEnrolled = enrolledPatients.length
  
  const trialCounts = clinicalTrials.map(trial => ({
    ...trial,
    enrolledCount: enrolledPatients.filter(p => 
      p.trialId === trial.id || p.trialId === trial.protocolId
    ).length
  }))

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className={`min-h-screen transition-[margin-left] duration-300 ease-in-out ml-64`}>
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Clinical Trials Enrollment Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Track patients currently enrolled in active clinical trials
                </p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Users className="h-5 w-5" />
                    <span className="text-2xl font-bold text-foreground">{totalEnrolled}</span>
                    <span className="text-sm">Total Enrolled</span>
                  </>
                )}
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
                {clinicalTrials.length} trials with active patient enrollment
                {selectedTrial === 'all' && ' • Showing all patients'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trialCounts.map((trial) => (
                <Card 
                  key={trial.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTrial === trial.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedTrial(selectedTrial === trial.id ? 'all' : trial.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline">{trial.phase}</Badge>
                      <Badge className="bg-primary text-primary-foreground">
                        {trial.enrolledCount} enrolled
                      </Badge>
                    </div>
                    <CardTitle className="text-base leading-tight text-pretty mt-2">
                      {trial.trialName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Protocol:</span>{' '}
                        <span className="font-mono text-foreground">{trial.protocolId}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sponsor:</span>{' '}
                        <span className="text-foreground">{trial.issuingCompany}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Area:</span>{' '}
                        <span className="text-foreground">{trial.therapeuticArea}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Enrolled Patients
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {console.log('[v0] Filtering patients - selectedTrial:', selectedTrial, 'filteredCount:', filteredPatients.length, 'totalCount:', enrolledPatients.length)}
                      {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} 
                      {selectedTrial !== 'all' ? ' in selected trial' : ' across all trials'}
                    </p>
                  </div>
                  {selectedTrial !== 'all' && (
                    <button
                      onClick={() => setSelectedTrial('all')}
                      className="text-sm text-primary hover:underline"
                    >
                      View all trials
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No patients enrolled yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Prescreen patients from the Eligibility Dashboard to add them here
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Patient Name</TableHead>
                          <TableHead>MRN</TableHead>
                          <TableHead>Trial Name</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Enrolled Date</TableHead>
                          <TableHead>Last Visit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPatients.map((patient) => (
                          <TableRow 
                            key={patient.id}
                            className="cursor-pointer hover:bg-accent/50"
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <TableCell className="font-medium text-foreground">
                              {patient.patientName}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {patient.mrn}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="text-sm text-foreground text-pretty line-clamp-2">
                                {patient.trialName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getStageBadge(patient.stage as EnrolledPatient['stage'])}>
                                {patient.stage}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(patient.enrolledDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(patient.lastVisit).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedPatient && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Demographics</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Patient Name</p>
                        <p className="text-sm font-medium text-foreground">{selectedPatient.patientName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Medical Record Number</p>
                        <p className="text-sm font-mono text-foreground">{selectedPatient.mrn}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Age</p>
                          <p className="text-sm font-medium text-foreground">{selectedPatient.age} years</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Gender</p>
                          <p className="text-sm font-medium text-foreground">{selectedPatient.gender}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Visit</p>
                        <p className="text-sm font-medium text-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(selectedPatient.lastVisit).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Enrollment Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Clinical Trial</p>
                        <p className="text-sm font-medium text-foreground text-pretty">{selectedPatient.trialName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Current Stage</p>
                        <Badge variant="outline" className={getStageBadge(selectedPatient.stage as EnrolledPatient['stage'])}>
                          {selectedPatient.stage}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Enrolled Date</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(selectedPatient.enrolledDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Enrolled</span>
                          <span className="font-medium text-foreground">
                            {Math.floor((new Date().getTime() - new Date(selectedPatient.enrolledDate).getTime()) / (1000 * 60 * 60 * 24))}
                          </span>
                          <span>days ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Trial Progress Timeline</h3>
                  <div className="relative pl-8">
                    {stageInfo.map((stage, index) => {
                      const currentStageOrder = stageInfo.find(s => s.name === selectedPatient.stage)?.order || 0
                      const isCompleted = stage.order <= currentStageOrder
                      const isCurrent = stage.name === selectedPatient.stage
                      const canExpand = isCompleted && stage.details && stage.name !== 'Randomisation'
                      const isExpanded = expandedStages.has(stage.name)
                      
                      return (
                        <div key={stage.name} className="relative pb-8 last:pb-0">
                          {index < stageInfo.length - 1 && (
                            <div 
                              className={`absolute left-[-1.5rem] top-6 w-0.5 h-full -z-10 ${
                                isCompleted && !isCurrent ? 'bg-primary' : 'bg-muted'
                              }`}
                            />
                          )}
                          
                          <div className="absolute left-[-2rem] top-1 z-10 bg-background">
                            {isCompleted ? (
                              <CheckCircle2 className={`h-5 w-5 ${
                                isCurrent ? 'text-primary' : 'text-primary/60'
                              }`} />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className={`${isCurrent ? 'bg-primary/5 -ml-4 pl-4 pr-4 py-3 rounded-lg' : ''}`}>
                            <div 
                              className={`flex items-center justify-between gap-2 mb-1 ${
                                canExpand ? 'cursor-pointer hover:opacity-80' : ''
                              }`}
                              onClick={() => canExpand && toggleStageExpansion(stage.name)}
                            >
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-semibold ${
                                  isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                  {stage.name}
                                </h4>
                                {isCurrent && (
                                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              {canExpand && (
                                <div className={`${
                                  isCurrent ? 'text-primary' : 'text-muted-foreground'
                                }`}>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </div>
                              )}
                            </div>
                            <p className={`text-xs ${
                              isCurrent ? 'text-foreground' : isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/60'
                            }`}>
                              {stage.description}
                            </p>
                            
                            {canExpand && isExpanded && stage.details && (
                              <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                                <div>
                                  <p className="text-xs font-semibold text-foreground mb-2">Activities Completed:</p>
                                  <ul className="space-y-1">
                                    {stage.details.activities.map((activity, i) => (
                                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                        <span>{activity}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-foreground mb-1">Notes:</p>
                                  <p className="text-xs text-muted-foreground italic">{stage.details.notes}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
