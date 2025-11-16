-- Insert 12 mock enrolled patients into the database
-- This provides holding data for the enrollment dashboard

INSERT INTO public.enrolled_patients (patient_session_id, patient_name, patient_age, patient_gender, trial_protocol_id, trial_name, eligibility_score, enrollment_stage, enrolled_date) VALUES
  ('MRN-2025-001', 'Sarah Johnson', 45, 'Female', 'CT-2024-DM-001', 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention', 92, 'Randomisation', '2024-09-15'),
  ('MRN-2025-002', 'Michael Chen', 38, 'Male', 'CT-2024-DM-001', 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention', 85, '30-Day Follow Up', '2024-10-02'),
  ('MRN-2025-003', 'Emily Rodriguez', 52, 'Female', 'CT-2024-DM-001', 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention', 88, '90-Day Follow Up', '2024-08-20'),
  ('MRN-2025-004', 'James Wilson', 29, 'Male', 'CT-2024-DM-001', 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention', 78, '60-Day Follow Up', '2024-07-10'),
  ('MRN-2025-005', 'Linda Martinez', 61, 'Female', 'CT-2024-CV-018', 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism', 90, 'Randomisation', '2024-10-15'),
  ('MRN-2025-006', 'Robert Thompson', 54, 'Male', 'CT-2024-CV-018', 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism', 82, '30-Day Follow Up', '2024-09-28'),
  ('MRN-2025-007', 'Patricia Davis', 47, 'Female', 'CT-2024-CV-018', 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism', 75, 'First Visit Scheduled', '2024-11-01'),
  ('MRN-2025-008', 'David Brown', 70, 'Male', 'CT-2024-CV-018', 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism', 88, '90-Day Follow Up', '2024-08-05'),
  ('MRN-2025-009', 'Jennifer White', 42, 'Female', 'CT-2024-CV-018', 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism', 91, 'Randomisation', '2024-09-12'),
  ('MRN-2025-010', 'Christopher Lee', 55, 'Male', 'CT-2024-RA-042', 'Acute Positional Vertigo Evaluation and Management', 65, 'Pre-Screening', '2024-11-05'),
  ('MRN-2025-011', 'Amanda Garcia', 33, 'Female', 'CT-2024-DM-001', 'Extended-Release Naltrexone Plus Brief Cognitive Behavioral Intervention', 80, 'First Visit Scheduled', '2024-10-20'),
  ('MRN-2025-012', 'Thomas Anderson', 48, 'Male', 'CT-2024-CV-018', 'Oral Factor XIa Inhibitor (FXIaX) for Acute Symptomatic Pulmonary Embolism', 86, '60-Day Follow Up', '2024-10-08')
ON CONFLICT (patient_session_id, trial_protocol_id) DO NOTHING;
