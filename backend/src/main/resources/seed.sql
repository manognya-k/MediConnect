-- =============================================================
--  MediConnect - Database Seed File
--  Run directly:  mysql -u root -p mediconnect < seed.sql
--  Or via Maven:  cd backend && mvn exec:java -Pseed
--
--  Default password for ALL seed users: MediConnect@123
--  BCrypt hash stored below is for: MediConnect@123
-- =============================================================

-- ---------------------------------------------------------------
-- Step 1: Disable FK checks so TRUNCATE works in any order
-- ---------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE chatbot_logs;
TRUNCATE TABLE notifications;
TRUNCATE TABLE lab_reports;
TRUNCATE TABLE medical_records;
TRUNCATE TABLE appointments;
TRUNCATE TABLE beds;
TRUNCATE TABLE inventory;
TRUNCATE TABLE patients;
TRUNCATE TABLE doctors;
TRUNCATE TABLE departments;
TRUNCATE TABLE users;
TRUNCATE TABLE hospitals;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------
-- Step 2: hospitals  (2 records)
-- ---------------------------------------------------------------
INSERT INTO hospitals (hospital_id, hospital_name, address, city, phone, total_beds, available_beds) VALUES
(1, 'City General Hospital',   '12 MG Road, Sector 5',     'Chennai',   '044-22001100', 300, 85),
(2, 'Apollo Medical Centre',   '88 Anna Salai, T Nagar',   'Bangalore', '080-44002200', 200, 60);

-- ---------------------------------------------------------------
-- Step 3: users  (8 records)
--   Roles: ADMIN(2) | DOCTOR(4) | PATIENT(4) | RECEPTIONIST(1) | LAB(1)
--   Password hash = BCrypt("MediConnect@123")
-- ---------------------------------------------------------------
INSERT INTO users (user_id, name, email, password, phone, role, hospital_id,
                   specialization, availability_status,
                   date_of_birth, gender, blood_group, address, emergency_contact) VALUES

-- Admins
(1,  'Admin Rajan',       'admin.rajan@cgh.com',    '$2a$10$7QlvZjJq6yXAv.5KRXJeF.yWVdFBqJPAcITvUjj3Hj0jkXlB5rBcy',
     '9900001111', 'ADMIN',         1, NULL, NULL, '1980-03-15', 'MALE',   NULL,   '1 Admin Nagar, Chennai',   '9900001112'),
(2,  'Admin Priya',       'admin.priya@amc.com',    '$2a$10$7QlvZjJq6yXAv.5KRXJeF.yWVdFBqJPAcITvUjj3Hj0jkXlB5rBcy',
     '9900002222', 'ADMIN',         2, NULL, NULL, '1985-07-22', 'FEMALE', NULL,   '2 Admin Street, Bangalore','9900002223'),

-- Doctors (Hospital 1)
(3,  'Dr. Arun Kumar',    'arun.kumar@cgh.com',     '$2a$10$7QlvZjJq6yXAv.5KRXJeF.yWVdFBqJPAcITvUjj3Hj0jkXlB5rBcy',
     '9811001111', 'DOCTOR',        1, 'Cardiology',   'AVAILABLE', '1978-05-10', 'MALE',   'B+', '10 Doctors Colony, Chennai',    '9811001112'),
(4,  'Dr. Meena Reddy',   'meena.reddy@cgh.com',    '$2a$10$7QlvZjJq6yXAv.5KRXJeF.yWVdFBqJPAcITvUjj3Hj0jkXlB5rBcy',
     '9811002222', 'DOCTOR',        1, 'Neurology',    'AVAILABLE', '1982-11-18', 'FEMALE', 'A+', '20 Health Avenue, Chennai',     '9811002223'),

-- Doctors (Hospital 2)
(5,  'Dr. Vikram Singh',  'vikram.singh@amc.com',   '$2a$10$7QlvZjJq6yXAv.5KRXJeF.yWVdFBqJPAcITvUjj3Hj0jkXlB5rBcy',
     '9822003333', 'DOCTOR',        2, 'Orthopedics',  'AVAILABLE', '1975-08-25', 'MALE',   'O+', '15 Medical Lane, Bangalore',    '9822003334'),
(6,  'Dr. Lakshmi Nair',  'lakshmi.nair@amc.com',   '$2a$10$7QlvZjJq6yXAv.5KRXJeF.yWVdFBqJPAcITvUjj3Hj0jkXlB5rBcy',
     '9822004444', 'DOCTOR',        2, 'Pediatrics',   'NOT_AVAILABLE', '1988-02-14', 'FEMALE', 'AB+', '30 Care Street, Bangalore', '9822004445'),

-- Patients
(7,  'Rajesh Sharma',     'rajesh.sharma@gmail.com','$2a$10$7QlvZjJq6yXAv.5KRXJeF.yWVdFBqJPAcITvUjj3Hj0jkXlB5rBcy',
     '9733001111', 'PATIENT',       1, NULL, NULL, '1990-06-12', 'MALE',   'O+',  '45 Park Road, Chennai',      '9733001112'),
(8,  'Sneha Patel',       'sneha.patel@gmail.com',  '$2a$10$7QlvZjJq6yXAv.5KRXJeF.yWVdFBqJPAcITvUjj3Hj0jkXlB5rBcy',
     '9733002222', 'PATIENT',       1, NULL, NULL, '1995-09-30', 'FEMALE', 'B+',  '12 Lake View, Chennai',      '9733002223'),
(9,  'Mohan Das',         'mohan.das@gmail.com',    '$2a$10$7QlvZjJq6yXAv.5KRXJeF.yWVdFBqJPAcITvUjj3Hj0jkXlB5rBcy',
     '9744003333', 'PATIENT',       2, NULL, NULL, '1988-01-20', 'MALE',   'A-',  '77 Brigade Road, Bangalore', '9744003334'),
(10, 'Anitha Krishnan',   'anitha.k@gmail.com',     '$2a$10$7QlvZjJq6yXAv.5KRXJeF.yWVdFBqJPAcITvUjj3Hj0jkXlB5rBcy',
     '9744004444', 'PATIENT',       2, NULL, NULL, '2000-04-05', 'FEMALE', 'AB-', '33 MG Road, Bangalore',      '9744004445');

-- ---------------------------------------------------------------
-- Step 4: departments  (4 records)
-- ---------------------------------------------------------------
INSERT INTO departments (department_id, hospital_id, department_name) VALUES
(1, 1, 'Cardiology'),
(2, 1, 'Neurology'),
(3, 2, 'Orthopedics'),
(4, 2, 'Pediatrics');

-- ---------------------------------------------------------------
-- Step 5: patients  (4 records — linked to patient users 7–10)
-- ---------------------------------------------------------------
INSERT INTO patients (patient_id, user_id, date_of_birth, gender, blood_group, address, emergency_contact) VALUES
(1, 7,  '1990-06-12', 'MALE',   'O+',  '45 Park Road, Chennai',      '9733001112'),
(2, 8,  '1995-09-30', 'FEMALE', 'B+',  '12 Lake View, Chennai',      '9733002223'),
(3, 9,  '1988-01-20', 'MALE',   'A-',  '77 Brigade Road, Bangalore', '9744003334'),
(4, 10, '2000-04-05', 'FEMALE', 'AB-', '33 MG Road, Bangalore',      '9744004445');

-- ---------------------------------------------------------------
-- Step 6: doctors  (4 records — linked to doctor users 3–6)
-- ---------------------------------------------------------------
INSERT INTO doctors (doctor_id, user_id, department_id, hospital_id, specialization, availability_status) VALUES
(1, 3, 1, 1, 'Cardiology',  'AVAILABLE'),
(2, 4, 2, 1, 'Neurology',   'AVAILABLE'),
(3, 5, 3, 2, 'Orthopedics', 'AVAILABLE'),
(4, 6, 4, 2, 'Pediatrics',  'NOT_AVAILABLE');

-- ---------------------------------------------------------------
-- Step 7: appointments  (6 records)
-- ---------------------------------------------------------------
INSERT INTO appointments (appointment_id, patient_id, doctor_id, hospital_id,
                           appointment_date, appointment_time, status, appointment_type, session_url) VALUES
(1, 1, 1, 1, '2026-04-05', '10:00:00', 'SCHEDULED',  'IN_PERSON', NULL),
(2, 2, 2, 1, '2026-04-06', '11:30:00', 'SCHEDULED',  'ONLINE',    'https://meet.mediconnect.com/room/abc123'),
(3, 3, 3, 2, '2026-04-07', '09:00:00', 'SCHEDULED',  'IN_PERSON', NULL),
(4, 4, 4, 2, '2026-04-08', '14:00:00', 'SCHEDULED',  'ONLINE',    'https://meet.mediconnect.com/room/xyz456'),
(5, 1, 2, 1, '2026-03-20', '10:30:00', 'COMPLETED',  'IN_PERSON', NULL),
(6, 3, 3, 2, '2026-03-25', '16:00:00', 'CANCELLED',  'IN_PERSON', NULL);

-- ---------------------------------------------------------------
-- Step 8: medical_records  (5 records)
-- ---------------------------------------------------------------
INSERT INTO medical_records (record_id, patient_id, doctor_id, hospital_id,
                              record_date, diagnosis, treatment, prescription, notes) VALUES
(1, 1, 1, 1, '2026-03-20',
   'Hypertension Stage 1',
   'Lifestyle modification and medication',
   'Amlodipine 5mg once daily; Telmisartan 40mg once daily',
   'Patient advised to reduce sodium intake and exercise daily'),

(2, 2, 2, 1, '2026-02-15',
   'Migraine with Aura',
   'Preventive therapy initiated',
   'Topiramate 25mg twice daily; Sumatriptan 50mg as needed',
   'Patient reports 4-5 episodes per month. MRI scheduled.'),

(3, 3, 3, 2, '2026-03-01',
   'Right Knee Ligament Sprain (Grade 2)',
   'Physiotherapy and rest',
   'Diclofenac 75mg twice daily; Physiotherapy 3x/week',
   'X-ray clear. Patient to avoid weight-bearing sports for 6 weeks.'),

(4, 4, 4, 2, '2026-01-10',
   'Acute Tonsillitis',
   'Antibiotic course',
   'Amoxicillin 250mg three times daily for 7 days',
   'Child presented with fever and sore throat. Follow-up in 1 week.'),

(5, 1, 1, 1, '2026-03-25',
   'Hypertension - Follow-up',
   'Medication adjusted',
   'Amlodipine 10mg once daily; Telmisartan 40mg once daily',
   'BP readings improved. Dosage of Amlodipine increased.');

-- ---------------------------------------------------------------
-- Step 9: lab_reports  (6 records)
-- ---------------------------------------------------------------
INSERT INTO lab_reports (report_id, patient_id, doctor_id, hospital_id,
                          test_name, result, report_url, report_date) VALUES
(1, 1, 1, 1, 'Complete Blood Count (CBC)',
   'Hb: 14.2 g/dL, WBC: 7200/µL, Platelets: 230000/µL — Normal',
   'https://reports.mediconnect.com/lab/1001.pdf', '2026-03-18'),

(2, 1, 1, 1, 'Lipid Profile',
   'Total Cholesterol: 215 mg/dL, LDL: 140 mg/dL, HDL: 45 mg/dL — Borderline High',
   'https://reports.mediconnect.com/lab/1002.pdf', '2026-03-18'),

(3, 2, 2, 1, 'MRI Brain',
   'No acute intracranial abnormality. Mild cortical atrophy noted.',
   'https://reports.mediconnect.com/lab/1003.pdf', '2026-02-20'),

(4, 3, 3, 2, 'X-Ray Right Knee',
   'No fracture detected. Mild soft tissue swelling around knee joint.',
   'https://reports.mediconnect.com/lab/1004.pdf', '2026-03-01'),

(5, 4, 4, 2, 'Throat Swab Culture',
   'Group A Streptococcus detected. Sensitive to Amoxicillin.',
   'https://reports.mediconnect.com/lab/1005.pdf', '2026-01-10'),

(6, 3, 3, 2, 'Blood Glucose Fasting',
   'Fasting Glucose: 98 mg/dL — Normal Range',
   'https://reports.mediconnect.com/lab/1006.pdf', '2026-03-02');

-- ---------------------------------------------------------------
-- Step 10: beds  (8 records)
-- ---------------------------------------------------------------
INSERT INTO beds (bed_id, hospital_id, ward, bed_number, status, patient_id) VALUES
(1,  1, 'General Ward',  101, 'OCCUPIED',  1),
(2,  1, 'General Ward',  102, 'AVAILABLE', NULL),
(3,  1, 'General Ward',  103, 'AVAILABLE', NULL),
(4,  1, 'ICU',           201, 'OCCUPIED',  2),
(5,  1, 'ICU',           202, 'AVAILABLE', NULL),
(6,  2, 'General Ward',  101, 'OCCUPIED',  3),
(7,  2, 'General Ward',  102, 'AVAILABLE', NULL),
(8,  2, 'Pediatric Ward',301, 'OCCUPIED',  4);

-- ---------------------------------------------------------------
-- Step 11: inventory  (10 records)
-- ---------------------------------------------------------------
INSERT INTO inventory (item_id, hospital_id, item_name, category, quantity, reorder_level) VALUES
(1,  1, 'Surgical Gloves (Box)',          'Consumables',  500, 100),
(2,  1, 'Syringes 5ml',                   'Consumables',  1200, 200),
(3,  1, 'Paracetamol 500mg Tablets',      'Medicine',     3000, 500),
(4,  1, 'IV Drip Saline 500ml',           'Medicine',     400,  80),
(5,  1, 'Digital Thermometer',            'Equipment',    50,   10),
(6,  2, 'Surgical Gloves (Box)',          'Consumables',  300,  80),
(7,  2, 'Syringes 10ml',                  'Consumables',  800,  150),
(8,  2, 'Amoxicillin 500mg Capsules',     'Medicine',     2000, 300),
(9,  2, 'Bandage Roll (10cm)',            'Consumables',  600,  100),
(10, 2, 'Blood Pressure Monitor',        'Equipment',    20,   5);

-- ---------------------------------------------------------------
-- Step 12: notifications  (8 records)
-- ---------------------------------------------------------------
INSERT INTO notifications (notification_id, user_id, notification_type, message, is_read, created_at) VALUES
(1, 7,  'APPOINTMENT', 'Your appointment with Dr. Arun Kumar is confirmed for Apr 5, 2026 at 10:00 AM.',  false, '2026-04-01 09:00:00'),
(2, 8,  'APPOINTMENT', 'Your online appointment with Dr. Meena Reddy is confirmed for Apr 6, 2026.',       false, '2026-04-01 09:05:00'),
(3, 9,  'APPOINTMENT', 'Your appointment with Dr. Vikram Singh is confirmed for Apr 7, 2026 at 9:00 AM.', false, '2026-04-01 09:10:00'),
(4, 10, 'APPOINTMENT', 'Your appointment with Dr. Lakshmi Nair is confirmed for Apr 8, 2026 at 2:00 PM.', false, '2026-04-01 09:15:00'),
(5, 7,  'LAB_REPORT',  'Your Lipid Profile report is now available. Please review it.',                    true,  '2026-03-18 14:00:00'),
(6, 7,  'REMINDER',    'Reminder: Please take your Amlodipine dose today.',                                true,  '2026-03-25 08:00:00'),
(7, 3,  'REMINDER',    'You have 2 appointments scheduled today.',                                         false, '2026-04-05 07:00:00'),
(8, 9,  'LAB_REPORT',  'Your X-Ray Right Knee report is now available.',                                   true,  '2026-03-01 15:00:00');

-- ---------------------------------------------------------------
-- Step 13: chatbot_logs  (6 records)
-- ---------------------------------------------------------------
INSERT INTO chatbot_logs (log_id, user_id, query, response, created_at) VALUES
(1, 7,  'What are the symptoms of hypertension?',
        'Common symptoms include headaches, shortness of breath, nosebleeds, and in severe cases chest pain. However, hypertension is often called the silent killer as it may have no symptoms.',
        '2026-03-10 10:30:00'),

(2, 7,  'Is Amlodipine safe for long-term use?',
        'Amlodipine is generally safe for long-term use when prescribed by your doctor. Regular monitoring of blood pressure and periodic blood tests are recommended.',
        '2026-03-10 10:32:00'),

(3, 8,  'How long does a migraine last?',
        'Migraines typically last between 4 to 72 hours. With proper treatment, the duration can be reduced. Keeping a migraine diary can help identify triggers.',
        '2026-02-10 14:00:00'),

(4, 9,  'How do I recover from a knee sprain?',
        'Recovery includes RICE therapy (Rest, Ice, Compression, Elevation), physiotherapy exercises, and avoiding strenuous activities for 4-6 weeks depending on severity.',
        '2026-03-05 11:00:00'),

(5, 10, 'What to do for a child with tonsillitis?',
        'Ensure the child completes the full antibiotic course, encourage warm fluids, rest, and saltwater gargles. Consult the doctor if fever persists beyond 2 days of medication.',
        '2026-01-12 09:00:00'),

(6, 7,  'What foods should I avoid with high blood pressure?',
        'Avoid high-sodium foods like pickles, chips, processed meats, and canned soups. Limit caffeine and alcohol. A DASH diet rich in fruits, vegetables, and whole grains is recommended.',
        '2026-03-28 16:00:00');
