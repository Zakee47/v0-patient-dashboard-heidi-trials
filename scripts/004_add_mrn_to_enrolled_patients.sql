-- Add MRN column to enrolled_patients table
ALTER TABLE public.enrolled_patients 
ADD COLUMN IF NOT EXISTS patient_mrn TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_enrolled_patients_mrn ON public.enrolled_patients(patient_mrn);
