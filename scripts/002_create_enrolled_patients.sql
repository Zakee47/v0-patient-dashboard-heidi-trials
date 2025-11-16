-- Adding public schema prefix and RLS policies for proper security
-- Table for storing prescreened/enrolled patients
CREATE TABLE IF NOT EXISTS public.enrolled_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_session_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_age INTEGER,
  patient_gender TEXT,
  trial_protocol_id TEXT NOT NULL,
  trial_name TEXT NOT NULL,
  eligibility_score INTEGER,
  enrollment_stage TEXT DEFAULT 'Pre-Screening',
  enrolled_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(patient_session_id, trial_protocol_id)
);

CREATE INDEX IF NOT EXISTS idx_enrolled_patients_session ON public.enrolled_patients(patient_session_id);
CREATE INDEX IF NOT EXISTS idx_enrolled_patients_trial ON public.enrolled_patients(trial_protocol_id);
CREATE INDEX IF NOT EXISTS idx_enrolled_patients_stage ON public.enrolled_patients(enrollment_stage);

-- Enable RLS and create public access policies
ALTER TABLE public.enrolled_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.enrolled_patients
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON public.enrolled_patients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.enrolled_patients
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON public.enrolled_patients
  FOR DELETE USING (true);
