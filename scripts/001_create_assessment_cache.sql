-- Create assessment cache table for storing AI eligibility results
CREATE TABLE IF NOT EXISTS assessment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_session_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  trial_protocol_id TEXT NOT NULL,
  trial_name TEXT NOT NULL,
  eligibility_percentage INTEGER CHECK (eligibility_percentage >= 0 AND eligibility_percentage <= 100),
  eligibility_status TEXT CHECK (eligibility_status IN ('ELIGIBLE', 'INELIGIBLE', 'UNKNOWN')),
  assessment_result TEXT,
  assessed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(patient_session_id, trial_protocol_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_assessment_patient ON assessment_cache(patient_session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_trial ON assessment_cache(trial_protocol_id);
CREATE INDEX IF NOT EXISTS idx_assessment_composite ON assessment_cache(patient_session_id, trial_protocol_id);

-- Enable RLS (Row Level Security)
ALTER TABLE assessment_cache ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for public access (since this is demo data without user auth)
-- In production, you would restrict this to authenticated users only
CREATE POLICY "Allow public read access" ON assessment_cache FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON assessment_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON assessment_cache FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON assessment_cache FOR DELETE USING (true);
