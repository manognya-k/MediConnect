package com.cts.mfrp.seed;

import com.cts.mfrp.entity.*;
import com.cts.mfrp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Executes only when the "seed" profile is active.
 * Uses JPA repositories to:
 *   Phase 1 → Delete all records (child tables first to respect FK constraints)
 *   Phase 2 → Insert fresh dummy data (parent tables first)
 *
 * Date strategy: anchored around 2026-05-11 so doctor/patient dashboards
 * always have meaningful "today" and "upcoming" data after a fresh seed.
 */
@Slf4j
@Component
@org.springframework.core.annotation.Order(1)
@RequiredArgsConstructor
public class DataSeederRunner implements CommandLineRunner {

    // ── Dependencies ─────────────────────────────────────────────
    private final PasswordEncoder              passwordEncoder;

    // ── Repositories ─────────────────────────────────────────────
    private final HospitalRepository          hospitalRepository;
    private final UserRepository              userRepository;
    private final DepartmentRepository        departmentRepository;
    private final PatientRepository           patientRepository;
    private final DoctorRepository            doctorRepository;
    private final AppointmentRepository       appointmentRepository;
    private final MedicalRecordRepository     medicalRecordRepository;
    private final LabReportRepository         labReportRepository;
    private final BedRepository               bedRepository;
    private final InventoryRepository         inventoryRepository;
    private final NotificationRepository      notificationRepository;
    private final ChatbotLogRepository        chatbotLogRepository;
    private final PrescriptionRepository      prescriptionRepository;
    private final MedicineRepository          medicineRepository;
    private final VitalsRepository            vitalsRepository;
    private final RescheduleRequestRepository rescheduleRequestRepository;
    private final BillRepository              billRepository;
    private final VideoSessionRepository      videoSessionRepository;

    // All seed users share the same plain-text password: MediConnect@123
    private static final String DEFAULT_PASSWORD = "MediConnect@123";

    // ─────────────────────────────────────────────────────────────
    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already has data — skipping seed.");
            return;
        }

        log.info("");
        log.info("╔══════════════════════════════════════════════╗");
        log.info("║     MediConnect — JPA Database Seeder        ║");
        log.info("╚══════════════════════════════════════════════╝");
        log.info("");

        truncateAll();
        seedAll();

        log.info("");
        log.info("✔  Seeding complete! Database is ready.");
        log.info("   Login password for all seeded users: MediConnect@123");
        log.info("");
    }

    // =========================================================
    //  PHASE 1 — DELETE (child → parent order)
    // =========================================================
    private void truncateAll() {
        log.info("► Phase 1: Clearing all tables...");

        chatbotLogRepository.deleteAllInBatch();
        log.info("  deleted → chatbot_logs");

        notificationRepository.deleteAllInBatch();
        log.info("  deleted → notifications");

        prescriptionRepository.deleteAllInBatch();
        log.info("  deleted → prescriptions");

        labReportRepository.deleteAllInBatch();
        log.info("  deleted → lab_reports");

        medicalRecordRepository.deleteAllInBatch();
        log.info("  deleted → medical_records");

        rescheduleRequestRepository.deleteAllInBatch();
        log.info("  deleted → reschedule_requests");

        videoSessionRepository.deleteAllInBatch();
        log.info("  deleted → video_sessions");

        billRepository.deleteAllInBatch();
        log.info("  deleted → bills");

        appointmentRepository.deleteAllInBatch();
        log.info("  deleted → appointments");

        bedRepository.deleteAllInBatch();
        log.info("  deleted → beds");

        inventoryRepository.deleteAllInBatch();
        log.info("  deleted → inventory");

        medicineRepository.deleteAllInBatch();
        log.info("  deleted → medicines");

        vitalsRepository.deleteAllInBatch();
        log.info("  deleted → vitals");

        patientRepository.deleteAllInBatch();
        log.info("  deleted → patients");

        doctorRepository.deleteAllInBatch();
        log.info("  deleted → doctors");

        departmentRepository.deleteAllInBatch();
        log.info("  deleted → departments");

        userRepository.deleteAllInBatch();
        log.info("  deleted → users");

        hospitalRepository.deleteAllInBatch();
        log.info("  deleted → hospitals");

        log.info("  All tables cleared.");
        log.info("");
    }

    // =========================================================
    //  PHASE 2 — INSERT (parent → child order)
    // =========================================================
    private void seedAll() {
        log.info("► Phase 2: Inserting dummy data...");

        String pwd = DEFAULT_PASSWORD;

        // ── 1. Hospitals ──────────────────────────────────────
        Hospital h1 = new Hospital();
        h1.setHospitalName("City General Hospital");
        h1.setAddress("12 MG Road, Sector 5");
        h1.setCity("Chennai");
        h1.setPhone("044-22001100");
        h1.setTotalBeds(300);
        h1.setAvailableBeds(85);
        h1.setEmailCode("CGH");
        h1 = hospitalRepository.save(h1);

        Hospital h2 = new Hospital();
        h2.setHospitalName("Apollo Medical Centre");
        h2.setAddress("88 Anna Salai, T Nagar");
        h2.setCity("Bangalore");
        h2.setPhone("080-44002200");
        h2.setTotalBeds(200);
        h2.setAvailableBeds(60);
        h2.setEmailCode("AMC");
        h2 = hospitalRepository.save(h2);

        log.info("  inserted → hospitals (2)");

        // ── 2. Users ──────────────────────────────────────────
        // Admin users
        userRepository.save(buildUser("Admin Rajan",   "admin.rajan@cgh.com",   pwd, "9900001111",
                "ADMIN", h1, null, null,
                LocalDate.of(1980, 3, 15), "MALE", null, "9900001112"));

        userRepository.save(buildUser("Admin Priya",   "admin.priya@amc.com",   pwd, "9900002222",
                "ADMIN", h2, null, null,
                LocalDate.of(1985, 7, 22), "FEMALE", null, "9900002223"));

        // Doctor users — Hospital 1
        User drArunUser = buildUser("Dr. Arun Kumar",  "arun.kumar@cgh.com",  pwd, "9811001111",
                "DOCTOR", h1, "Cardiology", "AVAILABLE",
                LocalDate.of(1978, 5, 10), "MALE", "B+", "9811001112");
        drArunUser = userRepository.save(drArunUser);

        User drMeenaUser = buildUser("Dr. Meena Reddy", "meena.reddy@cgh.com", pwd, "9811002222",
                "DOCTOR", h1, "Neurology", "AVAILABLE",
                LocalDate.of(1982, 11, 18), "FEMALE", "A+", "9811002223");
        drMeenaUser = userRepository.save(drMeenaUser);

        // Doctor users — Hospital 2
        User drVikramUser = buildUser("Dr. Vikram Singh", "vikram.singh@amc.com", pwd, "9822003333",
                "DOCTOR", h2, "Orthopedics", "AVAILABLE",
                LocalDate.of(1975, 8, 25), "MALE", "O+", "9822003334");
        drVikramUser = userRepository.save(drVikramUser);

        User drLakshmiUser = buildUser("Dr. Lakshmi Nair", "lakshmi.nair@amc.com", pwd, "9822004444",
                "DOCTOR", h2, "Pediatrics", "NOT_AVAILABLE",
                LocalDate.of(1988, 2, 14), "FEMALE", "AB+", "9822004445");
        drLakshmiUser = userRepository.save(drLakshmiUser);

        // Patient users
        User patRajeshUser = buildUser("Rajesh Sharma",  "rajesh.sharma@gmail.com", pwd, "9733001111",
                "PATIENT", h1, null, null,
                LocalDate.of(1990, 6, 12), "MALE", "O+", "9733001112");
        patRajeshUser = userRepository.save(patRajeshUser);

        User patSnehaUser = buildUser("Sneha Patel",    "sneha.patel@gmail.com",   pwd, "9733002222",
                "PATIENT", h1, null, null,
                LocalDate.of(1995, 9, 30), "FEMALE", "B+", "9733002223");
        patSnehaUser = userRepository.save(patSnehaUser);

        User patMohanUser = buildUser("Mohan Das",      "mohan.das@gmail.com",     pwd, "9744003333",
                "PATIENT", h2, null, null,
                LocalDate.of(1988, 1, 20), "MALE", "A-", "9744003334");
        patMohanUser = userRepository.save(patMohanUser);

        User patAnithaUser = buildUser("Anitha Krishnan", "anitha.k@gmail.com",    pwd, "9744004444",
                "PATIENT", h2, null, null,
                LocalDate.of(2000, 4, 5), "FEMALE", "AB-", "9744004445");
        patAnithaUser = userRepository.save(patAnithaUser);

        log.info("  inserted → users (10)");

        // ── 3. Departments ────────────────────────────────────
        Department deptCardio    = departmentRepository.save(buildDepartment("Cardiology",  h1));
        Department deptNeuro     = departmentRepository.save(buildDepartment("Neurology",   h1));
        Department deptOrtho     = departmentRepository.save(buildDepartment("Orthopedics", h2));
        Department deptPediatric = departmentRepository.save(buildDepartment("Pediatrics",  h2));

        log.info("  inserted → departments (4)");

        // ── 4. Patients ───────────────────────────────────────
        Patient rajesh = patientRepository.save(buildPatient(patRajeshUser,
                LocalDate.of(1990, 6, 12), "MALE",   "O+",  "9733001112"));
        Patient sneha  = patientRepository.save(buildPatient(patSnehaUser,
                LocalDate.of(1995, 9, 30), "FEMALE", "B+",  "9733002223"));
        Patient mohan  = patientRepository.save(buildPatient(patMohanUser,
                LocalDate.of(1988, 1, 20), "MALE",   "A-",  "9744003334"));
        Patient anitha = patientRepository.save(buildPatient(patAnithaUser,
                LocalDate.of(2000, 4, 5),  "FEMALE", "AB-", "9744004445"));

        log.info("  inserted → patients (4)");

        // ── 5. Doctors ────────────────────────────────────────
        Doctor drArun    = doctorRepository.save(buildDoctor(drArunUser,    deptCardio,    h1, "Cardiology",  "AVAILABLE"));
        Doctor drMeena   = doctorRepository.save(buildDoctor(drMeenaUser,   deptNeuro,     h1, "Neurology",   "AVAILABLE"));
        Doctor drVikram  = doctorRepository.save(buildDoctor(drVikramUser,  deptOrtho,     h2, "Orthopedics", "AVAILABLE"));
        Doctor drLakshmi = doctorRepository.save(buildDoctor(drLakshmiUser, deptPediatric, h2, "Pediatrics",  "NOT_AVAILABLE"));

        log.info("  inserted → doctors (4)");

        // ── 6. Appointments ───────────────────────────────────
        // Past — completed/cancelled
        Appointment a1 = appointmentRepository.save(buildAppointment(rajesh, drArun, h1,
                LocalDate.of(2026, 4, 15), LocalTime.of(10, 0),
                "COMPLETED", "IN_PERSON", null));

        Appointment a2 = appointmentRepository.save(buildAppointment(sneha, drMeena, h1,
                LocalDate.of(2026, 4, 22), LocalTime.of(11, 30),
                "COMPLETED", "ONLINE", "https://meet.mediconnect.com/room/abc123"));

        appointmentRepository.save(buildAppointment(mohan, drVikram, h2,
                LocalDate.of(2026, 4, 30), LocalTime.of(9, 0),
                "CANCELLED", "IN_PERSON", null));

        Appointment a4 = appointmentRepository.save(buildAppointment(anitha, drLakshmi, h2,
                LocalDate.of(2026, 5, 2), LocalTime.of(14, 0),
                "COMPLETED", "ONLINE", "https://meet.mediconnect.com/room/xyz456"));

        Appointment a5 = appointmentRepository.save(buildAppointment(rajesh, drArun, h1,
                LocalDate.of(2026, 5, 8), LocalTime.of(10, 30),
                "COMPLETED", "IN_PERSON", null));

        // Today (2026-05-11) — scheduled
        Appointment a6 = appointmentRepository.save(buildAppointment(rajesh, drArun, h1,
                LocalDate.of(2026, 5, 11), LocalTime.of(10, 0),
                "SCHEDULED", "IN_PERSON", null));

        Appointment a7 = appointmentRepository.save(buildAppointment(sneha, drMeena, h1,
                LocalDate.of(2026, 5, 11), LocalTime.of(14, 0),
                "SCHEDULED", "ONLINE", "https://meet.mediconnect.com/room/today1"));

        Appointment a8 = appointmentRepository.save(buildAppointment(mohan, drVikram, h2,
                LocalDate.of(2026, 5, 11), LocalTime.of(16, 0),
                "SCHEDULED", "IN_PERSON", null));

        // Future — scheduled
        appointmentRepository.save(buildAppointment(anitha, drLakshmi, h2,
                LocalDate.of(2026, 5, 14), LocalTime.of(11, 0),
                "SCHEDULED", "ONLINE", "https://meet.mediconnect.com/room/upc1"));

        Appointment a10 = appointmentRepository.save(buildAppointment(rajesh, drMeena, h1,
                LocalDate.of(2026, 5, 18), LocalTime.of(9, 30),
                "SCHEDULED", "IN_PERSON", null));

        Appointment a11 = appointmentRepository.save(buildAppointment(sneha, drArun, h1,
                LocalDate.of(2026, 5, 25), LocalTime.of(15, 0),
                "SCHEDULED", "ONLINE", "https://meet.mediconnect.com/room/upc2"));

        appointmentRepository.save(buildAppointment(mohan, drVikram, h2,
                LocalDate.of(2026, 6, 2), LocalTime.of(10, 0),
                "SCHEDULED", "IN_PERSON", null));

        log.info("  inserted → appointments (12)");

        // ── 7. Medical Records ────────────────────────────────
        MedicalRecord mr1 = medicalRecordRepository.save(buildMedicalRecord(
                rajesh, drArun, h1, LocalDate.of(2026, 4, 15),
                "Hypertension Stage 1",
                "Lifestyle modification and medication",
                "Amlodipine 5mg once daily; Telmisartan 40mg once daily",
                "Patient advised to reduce sodium intake and exercise daily",
                "IN_PERSON"));

        MedicalRecord mr2 = medicalRecordRepository.save(buildMedicalRecord(
                sneha, drMeena, h1, LocalDate.of(2026, 4, 22),
                "Migraine with Aura",
                "Preventive therapy initiated",
                "Topiramate 25mg twice daily; Sumatriptan 50mg as needed",
                "Patient reports 4-5 episodes per month. MRI ordered.",
                "ONLINE"));

        MedicalRecord mr3 = medicalRecordRepository.save(buildMedicalRecord(
                mohan, drVikram, h2, LocalDate.of(2026, 4, 12),
                "Right Knee Ligament Sprain (Grade 2)",
                "Physiotherapy and rest",
                "Diclofenac 75mg twice daily; Physiotherapy 3x/week",
                "X-ray clear. Patient to avoid weight-bearing sports for 6 weeks.",
                "IN_PERSON"));

        MedicalRecord mr4 = medicalRecordRepository.save(buildMedicalRecord(
                anitha, drLakshmi, h2, LocalDate.of(2026, 5, 2),
                "Acute Tonsillitis",
                "Antibiotic course",
                "Amoxicillin 250mg three times daily for 7 days",
                "Child presented with fever and sore throat. Follow-up in 1 week.",
                "ONLINE"));

        MedicalRecord mr5 = medicalRecordRepository.save(buildMedicalRecord(
                rajesh, drArun, h1, LocalDate.of(2026, 5, 8),
                "Hypertension — Follow-up",
                "Medication adjusted",
                "Amlodipine 10mg once daily; Telmisartan 40mg once daily",
                "BP readings improved. Dosage of Amlodipine increased.",
                "IN_PERSON"));

        MedicalRecord mr6 = medicalRecordRepository.save(buildMedicalRecord(
                sneha, drArun, h1, LocalDate.of(2026, 4, 30),
                "Type 2 Diabetes — Initial Diagnosis",
                "Diet control and oral medication",
                "Metformin 500mg twice daily after meals",
                "HbA1c 7.8%. Lifestyle counseling provided.",
                "IN_PERSON"));

        log.info("  inserted → medical_records (6)");

        // ── 8. Lab Reports ────────────────────────────────────
        labReportRepository.save(buildLabReport(rajesh, drArun, h1,
                "Complete Blood Count (CBC)",
                "Hb: 14.2 g/dL, WBC: 7200/µL, Platelets: 230000/µL — Normal",
                "https://reports.mediconnect.com/lab/1001.pdf",
                LocalDate.of(2026, 4, 15), false));

        labReportRepository.save(buildLabReport(rajesh, drArun, h1,
                "Lipid Profile",
                "Total Cholesterol: 215 mg/dL, LDL: 140 mg/dL, HDL: 45 mg/dL — Borderline High",
                "https://reports.mediconnect.com/lab/1002.pdf",
                LocalDate.of(2026, 4, 15), true));

        labReportRepository.save(buildLabReport(sneha, drMeena, h1,
                "MRI Brain",
                "No acute intracranial abnormality. Mild cortical atrophy noted.",
                "https://reports.mediconnect.com/lab/1003.pdf",
                LocalDate.of(2026, 4, 22), false));

        labReportRepository.save(buildLabReport(mohan, drVikram, h2,
                "X-Ray Right Knee",
                "No fracture detected. Mild soft tissue swelling around knee joint.",
                "https://reports.mediconnect.com/lab/1004.pdf",
                LocalDate.of(2026, 4, 12), false));

        labReportRepository.save(buildLabReport(anitha, drLakshmi, h2,
                "Throat Swab Culture",
                "Group A Streptococcus detected. Sensitive to Amoxicillin.",
                "https://reports.mediconnect.com/lab/1005.pdf",
                LocalDate.of(2026, 5, 2), true));

        labReportRepository.save(buildLabReport(sneha, drArun, h1,
                "HbA1c",
                "HbA1c: 7.8% — Elevated (target < 7.0%).",
                "https://reports.mediconnect.com/lab/1006.pdf",
                LocalDate.of(2026, 4, 30), true));

        labReportRepository.save(buildLabReport(rajesh, drArun, h1,
                "Blood Pressure Monitoring Report",
                "Average BP: 132/84 mmHg over 7 days — Improvement noted.",
                "https://reports.mediconnect.com/lab/1007.pdf",
                LocalDate.of(2026, 5, 8), false));

        labReportRepository.save(buildLabReport(mohan, drVikram, h2,
                "Blood Glucose Fasting",
                "Fasting Glucose: 98 mg/dL — Normal range.",
                "https://reports.mediconnect.com/lab/1008.pdf",
                LocalDate.of(2026, 4, 15), false));

        log.info("  inserted → lab_reports (8)");

        // ── 9. Prescriptions ──────────────────────────────────
        prescriptionRepository.save(buildPrescription(mr1, rajesh, drArun,
                "Amlodipine", "5mg", "Once daily in the morning"));
        prescriptionRepository.save(buildPrescription(mr1, rajesh, drArun,
                "Telmisartan", "40mg", "Once daily in the morning"));

        prescriptionRepository.save(buildPrescription(mr2, sneha, drMeena,
                "Topiramate", "25mg", "Twice daily — morning and evening"));
        prescriptionRepository.save(buildPrescription(mr2, sneha, drMeena,
                "Sumatriptan", "50mg", "As needed at onset of migraine"));

        prescriptionRepository.save(buildPrescription(mr3, mohan, drVikram,
                "Diclofenac", "75mg", "Twice daily after meals for 14 days"));

        prescriptionRepository.save(buildPrescription(mr4, anitha, drLakshmi,
                "Amoxicillin", "250mg", "Three times daily for 7 days"));

        prescriptionRepository.save(buildPrescription(mr5, rajesh, drArun,
                "Amlodipine", "10mg", "Once daily (dose increased from 5mg)"));

        prescriptionRepository.save(buildPrescription(mr6, sneha, drArun,
                "Metformin", "500mg", "Twice daily after meals"));

        log.info("  inserted → prescriptions (8)");

        // ── 10. Medicines ─────────────────────────────────────
        // Currently active medications driving patient reminder reminders
        medicineRepository.save(buildMedicine(rajesh,
                "Amlodipine", "10mg", "Once daily", "8:00 AM", "ACTIVE"));
        medicineRepository.save(buildMedicine(rajesh,
                "Telmisartan", "40mg", "Once daily", "8:00 AM", "ACTIVE"));

        medicineRepository.save(buildMedicine(sneha,
                "Topiramate", "25mg", "Twice daily", "8:00 AM", "ACTIVE"));
        medicineRepository.save(buildMedicine(sneha,
                "Metformin", "500mg", "Twice daily", "8:00 AM", "ACTIVE"));

        medicineRepository.save(buildMedicine(mohan,
                "Diclofenac", "75mg", "Twice daily", "9:00 AM", "ACTIVE"));

        medicineRepository.save(buildMedicine(anitha,
                "Amoxicillin", "250mg", "Thrice daily", "8:00 AM", "ACTIVE"));

        log.info("  inserted → medicines (6)");

        // ── 11. Video Sessions ────────────────────────────────
        // Records of completed ONLINE appointments
        videoSessionRepository.save(buildVideoSession(a2, sneha, drMeena,
                "VS-20260422-01",
                LocalDateTime.of(2026, 4, 22, 11, 30),
                LocalDateTime.of(2026, 4, 22, 11, 55),
                25, "COMPLETED"));

        videoSessionRepository.save(buildVideoSession(a4, anitha, drLakshmi,
                "VS-20260502-01",
                LocalDateTime.of(2026, 5, 2, 14, 0),
                LocalDateTime.of(2026, 5, 2, 14, 22),
                22, "COMPLETED"));

        log.info("  inserted → video_sessions (2)");

        // ── 12. Reschedule Requests ───────────────────────────
        rescheduleRequestRepository.save(buildRescheduleRequest(a10, rajesh, drMeena,
                LocalDate.of(2026, 5, 21), LocalTime.of(11, 0),
                "PENDING",
                "Patient requests morning slot due to work schedule.", null));

        rescheduleRequestRepository.save(buildRescheduleRequest(a11, sneha, drArun,
                LocalDate.of(2026, 5, 27), LocalTime.of(15, 0),
                "ACCEPTED",
                "Forwarded to doctor.", "Approved — new slot confirmed."));

        log.info("  inserted → reschedule_requests (2)");

        // ── 13. Bills ─────────────────────────────────────────
        // Past completed → PAID; today/scheduled → PENDING
        billRepository.save(buildBill(a1, rajesh, new BigDecimal("500.00"),
                "CONSULTATION", "PAID", LocalDate.of(2026, 4, 15)));
        billRepository.save(buildBill(a2, sneha, new BigDecimal("700.00"),
                "VIDEO_CONSULTATION", "PAID", LocalDate.of(2026, 4, 22)));
        billRepository.save(buildBill(a4, anitha, new BigDecimal("700.00"),
                "VIDEO_CONSULTATION", "PAID", LocalDate.of(2026, 5, 2)));
        billRepository.save(buildBill(a5, rajesh, new BigDecimal("500.00"),
                "CONSULTATION", "PAID", LocalDate.of(2026, 5, 8)));
        billRepository.save(buildBill(a6, rajesh, new BigDecimal("500.00"),
                "CONSULTATION", "PENDING", LocalDate.of(2026, 5, 11)));
        billRepository.save(buildBill(a7, sneha, new BigDecimal("700.00"),
                "VIDEO_CONSULTATION", "PENDING", LocalDate.of(2026, 5, 11)));
        billRepository.save(buildBill(a8, mohan, new BigDecimal("500.00"),
                "CONSULTATION", "PENDING", LocalDate.of(2026, 5, 11)));

        log.info("  inserted → bills (7)");

        // ── 14. Vitals ────────────────────────────────────────
        // Latest vitals per patient — drives patient dashboard health card
        vitalsRepository.save(buildVitals(rajesh, "138/88", 78,
                new BigDecimal("110.00"), new BigDecimal("27.20")));
        vitalsRepository.save(buildVitals(sneha,  "118/76", 72,
                new BigDecimal("145.00"), new BigDecimal("22.50")));
        vitalsRepository.save(buildVitals(mohan,  "126/82", 80,
                new BigDecimal("102.00"), new BigDecimal("24.80")));
        vitalsRepository.save(buildVitals(anitha, "110/70", 88,
                new BigDecimal("88.00"),  new BigDecimal("19.50")));

        log.info("  inserted → vitals (4)");

        // ── 15. Beds ──────────────────────────────────────────
        bedRepository.save(buildBed(h1, "General Ward",   101, "OCCUPIED",  rajesh));
        bedRepository.save(buildBed(h1, "General Ward",   102, "AVAILABLE", null));
        bedRepository.save(buildBed(h1, "General Ward",   103, "AVAILABLE", null));
        bedRepository.save(buildBed(h1, "ICU",            201, "OCCUPIED",  sneha));
        bedRepository.save(buildBed(h1, "ICU",            202, "AVAILABLE", null));
        bedRepository.save(buildBed(h2, "General Ward",   101, "OCCUPIED",  mohan));
        bedRepository.save(buildBed(h2, "General Ward",   102, "AVAILABLE", null));
        bedRepository.save(buildBed(h2, "Pediatric Ward", 301, "OCCUPIED",  anitha));

        log.info("  inserted → beds (8)");

        // ── 16. Inventory ─────────────────────────────────────
        inventoryRepository.save(buildInventory(h1, "Surgical Gloves (Box)",      "Consumables", 500,  100));
        inventoryRepository.save(buildInventory(h1, "Syringes 5ml",               "Consumables", 1200, 200));
        inventoryRepository.save(buildInventory(h1, "Paracetamol 500mg Tablets",  "Medicine",    3000, 500));
        inventoryRepository.save(buildInventory(h1, "IV Drip Saline 500ml",       "Medicine",    400,  80));
        inventoryRepository.save(buildInventory(h1, "Digital Thermometer",        "Equipment",   50,   10));
        inventoryRepository.save(buildInventory(h2, "Surgical Gloves (Box)",      "Consumables", 300,  80));
        inventoryRepository.save(buildInventory(h2, "Syringes 10ml",              "Consumables", 800,  150));
        inventoryRepository.save(buildInventory(h2, "Amoxicillin 500mg Capsules", "Medicine",    2000, 300));
        inventoryRepository.save(buildInventory(h2, "Bandage Roll (10cm)",        "Consumables", 600,  100));
        inventoryRepository.save(buildInventory(h2, "Blood Pressure Monitor",     "Equipment",   20,   5));

        log.info("  inserted → inventory (10)");

        // ── 17. Notifications ─────────────────────────────────
        // Today's appointment confirmations (unread)
        notificationRepository.save(buildNotification(patRajeshUser, "APPOINTMENT",
                "Your appointment with Dr. Arun Kumar is today at 10:00 AM.",
                false, LocalDateTime.of(2026, 5, 11, 7, 0)));

        notificationRepository.save(buildNotification(patSnehaUser, "APPOINTMENT",
                "Your online consult with Dr. Meena Reddy is today at 2:00 PM.",
                false, LocalDateTime.of(2026, 5, 11, 7, 5)));

        notificationRepository.save(buildNotification(patMohanUser, "APPOINTMENT",
                "Your appointment with Dr. Vikram Singh is today at 4:00 PM.",
                false, LocalDateTime.of(2026, 5, 11, 7, 10)));

        notificationRepository.save(buildNotification(patAnithaUser, "APPOINTMENT",
                "Reminder: Your online appointment with Dr. Lakshmi Nair is on May 14.",
                false, LocalDateTime.of(2026, 5, 10, 9, 0)));

        // Lab reports (read)
        notificationRepository.save(buildNotification(patRajeshUser, "LAB_REPORT",
                "Your Lipid Profile report is now available. Result: Borderline High.",
                true, LocalDateTime.of(2026, 4, 15, 14, 0)));

        notificationRepository.save(buildNotification(patSnehaUser, "LAB_REPORT",
                "Your HbA1c report is now available. Please review with your doctor.",
                false, LocalDateTime.of(2026, 4, 30, 16, 0)));

        // Medication reminders
        notificationRepository.save(buildNotification(patRajeshUser, "REMINDER",
                "Reminder: Please take your Amlodipine 10mg this morning.",
                true, LocalDateTime.of(2026, 5, 11, 8, 0)));

        // Doctor notifications
        notificationRepository.save(buildNotification(drArunUser, "REMINDER",
                "You have 2 appointments scheduled today (Rajesh, Sneha).",
                false, LocalDateTime.of(2026, 5, 11, 7, 0)));

        notificationRepository.save(buildNotification(drMeenaUser, "REMINDER",
                "You have 1 online consult scheduled today and 1 reschedule request pending.",
                false, LocalDateTime.of(2026, 5, 11, 7, 0)));

        log.info("  inserted → notifications (9)");

        // ── 18. Chatbot Logs ──────────────────────────────────
        chatbotLogRepository.save(buildChatbotLog(patRajeshUser,
                "What are the symptoms of hypertension?",
                "Common symptoms include headaches, shortness of breath, nosebleeds, and chest pain. " +
                "Hypertension is often called the silent killer as it may have no symptoms.",
                LocalDateTime.of(2026, 4, 10, 10, 30)));

        chatbotLogRepository.save(buildChatbotLog(patRajeshUser,
                "Is Amlodipine safe for long-term use?",
                "Amlodipine is generally safe for long-term use when prescribed by your doctor. " +
                "Regular monitoring of blood pressure and periodic blood tests are recommended.",
                LocalDateTime.of(2026, 4, 10, 10, 32)));

        chatbotLogRepository.save(buildChatbotLog(patSnehaUser,
                "How long does a migraine last?",
                "Migraines typically last between 4 to 72 hours. With proper treatment the duration " +
                "can be reduced. Keeping a migraine diary can help identify triggers.",
                LocalDateTime.of(2026, 4, 25, 14, 0)));

        chatbotLogRepository.save(buildChatbotLog(patMohanUser,
                "How do I recover from a knee sprain?",
                "Recovery includes RICE therapy (Rest, Ice, Compression, Elevation), physiotherapy " +
                "exercises, and avoiding strenuous activities for 4-6 weeks depending on severity.",
                LocalDateTime.of(2026, 5, 1, 11, 0)));

        chatbotLogRepository.save(buildChatbotLog(patAnithaUser,
                "What to do for a child with tonsillitis?",
                "Ensure the child completes the full antibiotic course, encourage warm fluids, rest, " +
                "and saltwater gargles. Consult the doctor if fever persists beyond 2 days of medication.",
                LocalDateTime.of(2026, 5, 3, 9, 0)));

        chatbotLogRepository.save(buildChatbotLog(patRajeshUser,
                "What foods should I avoid with high blood pressure?",
                "Avoid high-sodium foods like pickles, chips, processed meats, and canned soups. " +
                "Limit caffeine and alcohol. A DASH diet rich in fruits and vegetables is recommended.",
                LocalDateTime.of(2026, 5, 9, 16, 0)));

        log.info("  inserted → chatbot_logs (6)");
    }

    // =========================================================
    //  Builder helper methods
    // =========================================================

    private User buildUser(String name, String email, String password, String phone,
                           String role, Hospital hospital,
                           String specialization, String availabilityStatus,
                           LocalDate dob, String gender, String bloodGroup,
                           String emergencyContact) {
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(password));
        u.setPhone(phone);
        u.setRole(role);
        u.setHospital(hospital);
        u.setSpecialization(specialization);
        u.setAvailabilityStatus(availabilityStatus);
        u.setDateOfBirth(dob);
        u.setGender(gender);
        u.setBloodGroup(bloodGroup);
        u.setEmergencyContact(emergencyContact);
        return u;
    }

    private Department buildDepartment(String name, Hospital hospital) {
        Department d = new Department();
        d.setDepartmentName(name);
        d.setHospital(hospital);
        return d;
    }

    private Patient buildPatient(User user, LocalDate dob, String gender,
                                 String bloodGroup, String emergencyContact) {
        Patient p = new Patient();
        p.setUser(user);
        p.setDateOfBirth(dob);
        p.setGender(gender);
        p.setBloodGroup(bloodGroup);
        p.setEmergencyContact(emergencyContact);
        return p;
    }

    private Doctor buildDoctor(User user, Department department, Hospital hospital,
                               String specialization, String availabilityStatus) {
        Doctor d = new Doctor();
        d.setUser(user);
        d.setDepartment(department);
        d.setHospital(hospital);
        d.setSpecialization(specialization);
        d.setAvailabilityStatus(availabilityStatus);
        return d;
    }

    private Appointment buildAppointment(Patient patient, Doctor doctor, Hospital hospital,
                                         LocalDate date, LocalTime time,
                                         String status, String type, String sessionUrl) {
        Appointment a = new Appointment();
        a.setPatient(patient);
        a.setDoctor(doctor);
        a.setHospital(hospital);
        a.setAppointmentDate(date);
        a.setAppointmentTime(time);
        a.setStatus(status);
        a.setAppointmentType(type);
        a.setSessionUrl(sessionUrl);
        return a;
    }

    private MedicalRecord buildMedicalRecord(Patient patient, Doctor doctor, Hospital hospital,
                                             LocalDate date, String diagnosis,
                                             String treatment, String prescription, String notes,
                                             String consultationType) {
        MedicalRecord m = new MedicalRecord();
        m.setPatient(patient);
        m.setDoctor(doctor);
        m.setHospital(hospital);
        m.setRecordDate(date);
        m.setDiagnosis(diagnosis);
        m.setTreatment(treatment);
        m.setPrescription(prescription);
        m.setNotes(notes);
        m.setConsultationType(consultationType);
        return m;
    }

    private LabReport buildLabReport(Patient patient, Doctor doctor, Hospital hospital,
                                     String testName, String result,
                                     String reportUrl, LocalDate reportDate,
                                     Boolean isAbnormal) {
        LabReport r = new LabReport();
        r.setPatient(patient);
        r.setDoctor(doctor);
        r.setHospital(hospital);
        r.setTestName(testName);
        r.setResult(result);
        r.setReportUrl(reportUrl);
        r.setReportDate(reportDate);
        r.setIsAbnormal(isAbnormal);
        return r;
    }

    private Bed buildBed(Hospital hospital, String ward,
                         int bedNumber, String status, Patient patient) {
        Bed b = new Bed();
        b.setHospital(hospital);
        b.setWard(ward);
        b.setBedNumber(bedNumber);
        b.setStatus(status);
        b.setPatient(patient);
        return b;
    }

    private Inventory buildInventory(Hospital hospital, String itemName,
                                     String category, int quantity, int reorderLevel) {
        Inventory i = new Inventory();
        i.setHospital(hospital);
        i.setItemName(itemName);
        i.setCategory(category);
        i.setQuantity(quantity);
        i.setReorderLevel(reorderLevel);
        return i;
    }

    private Notification buildNotification(User user, String type,
                                           String message, Boolean isRead,
                                           LocalDateTime createdAt) {
        Notification n = new Notification();
        n.setUser(user);
        n.setNotificationType(type);
        n.setMessage(message);
        n.setIsRead(isRead);
        n.setCreatedAt(createdAt);
        return n;
    }

    private ChatbotLog buildChatbotLog(User user, String query,
                                       String response, LocalDateTime createdAt) {
        ChatbotLog c = new ChatbotLog();
        c.setUser(user);
        c.setQuery(query);
        c.setResponse(response);
        c.setCreatedAt(createdAt);
        return c;
    }

    private Prescription buildPrescription(MedicalRecord medicalRecord, Patient patient,
                                           Doctor doctor, String medicationName,
                                           String dosage, String instructions) {
        Prescription rx = new Prescription();
        rx.setMedicalRecord(medicalRecord);
        rx.setPatient(patient);
        rx.setDoctor(doctor);
        rx.setMedicationName(medicationName);
        rx.setDosage(dosage);
        rx.setInstructions(instructions);
        return rx;
    }

    private Medicine buildMedicine(Patient patient, String medicineName, String dosage,
                                   String frequency, String scheduledTime, String status) {
        Medicine m = new Medicine();
        m.setPatient(patient);
        m.setMedicineName(medicineName);
        m.setDosage(dosage);
        m.setFrequency(frequency);
        m.setScheduledTime(scheduledTime);
        m.setStatus(status);
        return m;
    }

    private VideoSession buildVideoSession(Appointment appointment, Patient patient,
                                           Doctor doctor, String sessionCode,
                                           LocalDateTime startedAt, LocalDateTime endedAt,
                                           Integer durationMinutes, String status) {
        VideoSession v = new VideoSession();
        v.setAppointment(appointment);
        v.setPatient(patient);
        v.setDoctor(doctor);
        v.setSessionCode(sessionCode);
        v.setStartedAt(startedAt);
        v.setEndedAt(endedAt);
        v.setDurationMinutes(durationMinutes);
        v.setStatus(status);
        return v;
    }

    private RescheduleRequest buildRescheduleRequest(Appointment appointment, Patient patient,
                                                    Doctor doctor, LocalDate requestedDate,
                                                    LocalTime requestedTime, String status,
                                                    String adminNotes, String doctorNotes) {
        RescheduleRequest r = new RescheduleRequest();
        r.setAppointment(appointment);
        r.setPatient(patient);
        r.setDoctor(doctor);
        r.setRequestedDate(requestedDate);
        r.setRequestedTime(requestedTime);
        r.setStatus(status);
        r.setAdminNotes(adminNotes);
        r.setDoctorNotes(doctorNotes);
        return r;
    }

    private Bill buildBill(Appointment appointment, Patient patient, BigDecimal amount,
                           String type, String status, LocalDate billDate) {
        Bill b = new Bill();
        b.setAppointment(appointment);
        b.setPatient(patient);
        b.setAmount(amount);
        b.setType(type);
        b.setStatus(status);
        b.setBillDate(billDate);
        return b;
    }

    private Vitals buildVitals(Patient patient, String bp, Integer heartRate,
                               BigDecimal glucose, BigDecimal bmi) {
        Vitals v = new Vitals();
        v.setPatient(patient);
        v.setBp(bp);
        v.setHeartRate(heartRate);
        v.setGlucose(glucose);
        v.setBmi(bmi);
        return v;
    }
}
