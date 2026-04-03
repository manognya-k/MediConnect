package com.cts.mfrp.seed;

import com.cts.mfrp.entity.*;
import com.cts.mfrp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Executes only when the "seed" profile is active.
 * Uses JPA repositories to:
 *   Phase 1 → Delete all records (child tables first to respect FK constraints)
 *   Phase 2 → Insert fresh dummy data (parent tables first)
 */
@Slf4j
@Component
@Profile("seed")
@RequiredArgsConstructor
public class DataSeederRunner implements CommandLineRunner {

    // ── Repositories ─────────────────────────────────────────────
    private final HospitalRepository      hospitalRepository;
    private final UserRepository          userRepository;
    private final DepartmentRepository    departmentRepository;
    private final PatientRepository       patientRepository;
    private final DoctorRepository        doctorRepository;
    private final AppointmentRepository   appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final LabReportRepository     labReportRepository;
    private final BedRepository           bedRepository;
    private final InventoryRepository     inventoryRepository;
    private final NotificationRepository  notificationRepository;
    private final ChatbotLogRepository    chatbotLogRepository;

    // All seed users share the same plain-text password: MediConnect@123
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    // ─────────────────────────────────────────────────────────────
    @Override
    public void run(String... args) {
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

        labReportRepository.deleteAllInBatch();
        log.info("  deleted → lab_reports");

        medicalRecordRepository.deleteAllInBatch();
        log.info("  deleted → medical_records");

        appointmentRepository.deleteAllInBatch();
        log.info("  deleted → appointments");

        bedRepository.deleteAllInBatch();
        log.info("  deleted → beds");

        inventoryRepository.deleteAllInBatch();
        log.info("  deleted → inventory");

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

        String pwd = encoder.encode("MediConnect@123");

        // ── 1. Hospitals ──────────────────────────────────────
        Hospital h1 = new Hospital();
        h1.setHospitalName("City General Hospital");
        h1.setAddress("12 MG Road, Sector 5");
        h1.setCity("Chennai");
        h1.setPhone("044-22001100");
        h1.setTotalBeds(300);
        h1.setAvailableBeds(85);
        h1 = hospitalRepository.save(h1);

        Hospital h2 = new Hospital();
        h2.setHospitalName("Apollo Medical Centre");
        h2.setAddress("88 Anna Salai, T Nagar");
        h2.setCity("Bangalore");
        h2.setPhone("080-44002200");
        h2.setTotalBeds(200);
        h2.setAvailableBeds(60);
        h2 = hospitalRepository.save(h2);

        log.info("  inserted → hospitals (2)");

        // ── 2. Users ──────────────────────────────────────────
        // Admin users
        User adminUser1 = buildUser("Admin Rajan",   "admin.rajan@cgh.com",   pwd, "9900001111",
                "ADMIN", h1, null, null,
                LocalDate.of(1980, 3, 15), "MALE", null,
                "1 Admin Nagar, Chennai", "9900001112");
        adminUser1 = userRepository.save(adminUser1);

        User adminUser2 = buildUser("Admin Priya",   "admin.priya@amc.com",   pwd, "9900002222",
                "ADMIN", h2, null, null,
                LocalDate.of(1985, 7, 22), "FEMALE", null,
                "2 Admin Street, Bangalore", "9900002223");
        adminUser2 = userRepository.save(adminUser2);

        // Doctor users — Hospital 1
        User drArunUser = buildUser("Dr. Arun Kumar",  "arun.kumar@cgh.com",  pwd, "9811001111",
                "DOCTOR", h1, "Cardiology", "AVAILABLE",
                LocalDate.of(1978, 5, 10), "MALE", "B+",
                "10 Doctors Colony, Chennai", "9811001112");
        drArunUser = userRepository.save(drArunUser);

        User drMeenaUser = buildUser("Dr. Meena Reddy", "meena.reddy@cgh.com", pwd, "9811002222",
                "DOCTOR", h1, "Neurology", "AVAILABLE",
                LocalDate.of(1982, 11, 18), "FEMALE", "A+",
                "20 Health Avenue, Chennai", "9811002223");
        drMeenaUser = userRepository.save(drMeenaUser);

        // Doctor users — Hospital 2
        User drVikramUser = buildUser("Dr. Vikram Singh", "vikram.singh@amc.com", pwd, "9822003333",
                "DOCTOR", h2, "Orthopedics", "AVAILABLE",
                LocalDate.of(1975, 8, 25), "MALE", "O+",
                "15 Medical Lane, Bangalore", "9822003334");
        drVikramUser = userRepository.save(drVikramUser);

        User drLakshmiUser = buildUser("Dr. Lakshmi Nair", "lakshmi.nair@amc.com", pwd, "9822004444",
                "DOCTOR", h2, "Pediatrics", "NOT_AVAILABLE",
                LocalDate.of(1988, 2, 14), "FEMALE", "AB+",
                "30 Care Street, Bangalore", "9822004445");
        drLakshmiUser = userRepository.save(drLakshmiUser);

        // Patient users
        User patRajeshUser = buildUser("Rajesh Sharma",  "rajesh.sharma@gmail.com", pwd, "9733001111",
                "PATIENT", h1, null, null,
                LocalDate.of(1990, 6, 12), "MALE", "O+",
                "45 Park Road, Chennai", "9733001112");
        patRajeshUser = userRepository.save(patRajeshUser);

        User patSnehaUser = buildUser("Sneha Patel",    "sneha.patel@gmail.com",   pwd, "9733002222",
                "PATIENT", h1, null, null,
                LocalDate.of(1995, 9, 30), "FEMALE", "B+",
                "12 Lake View, Chennai", "9733002223");
        patSnehaUser = userRepository.save(patSnehaUser);

        User patMohanUser = buildUser("Mohan Das",      "mohan.das@gmail.com",     pwd, "9744003333",
                "PATIENT", h2, null, null,
                LocalDate.of(1988, 1, 20), "MALE", "A-",
                "77 Brigade Road, Bangalore", "9744003334");
        patMohanUser = userRepository.save(patMohanUser);

        User patAnithaUser = buildUser("Anitha Krishnan", "anitha.k@gmail.com",    pwd, "9744004444",
                "PATIENT", h2, null, null,
                LocalDate.of(2000, 4, 5), "FEMALE", "AB-",
                "33 MG Road, Bangalore", "9744004445");
        patAnithaUser = userRepository.save(patAnithaUser);

        log.info("  inserted → users (10)");

        // ── 3. Departments ────────────────────────────────────
        Department deptCardio   = buildDepartment("Cardiology",  h1);
        deptCardio   = departmentRepository.save(deptCardio);

        Department deptNeuro    = buildDepartment("Neurology",   h1);
        deptNeuro    = departmentRepository.save(deptNeuro);

        Department deptOrtho    = buildDepartment("Orthopedics", h2);
        deptOrtho    = departmentRepository.save(deptOrtho);

        Department deptPediatric = buildDepartment("Pediatrics", h2);
        deptPediatric = departmentRepository.save(deptPediatric);

        log.info("  inserted → departments (4)");

        // ── 4. Patients ───────────────────────────────────────
        Patient rajesh = buildPatient(patRajeshUser, LocalDate.of(1990, 6, 12),
                "MALE", "O+", "45 Park Road, Chennai", "9733001112");
        rajesh = patientRepository.save(rajesh);

        Patient sneha = buildPatient(patSnehaUser, LocalDate.of(1995, 9, 30),
                "FEMALE", "B+", "12 Lake View, Chennai", "9733002223");
        sneha = patientRepository.save(sneha);

        Patient mohan = buildPatient(patMohanUser, LocalDate.of(1988, 1, 20),
                "MALE", "A-", "77 Brigade Road, Bangalore", "9744003334");
        mohan = patientRepository.save(mohan);

        Patient anitha = buildPatient(patAnithaUser, LocalDate.of(2000, 4, 5),
                "FEMALE", "AB-", "33 MG Road, Bangalore", "9744004445");
        anitha = patientRepository.save(anitha);

        log.info("  inserted → patients (4)");

        // ── 5. Doctors ────────────────────────────────────────
        Doctor drArun   = buildDoctor(drArunUser,   deptCardio,    h1, "Cardiology",  "AVAILABLE");
        drArun   = doctorRepository.save(drArun);

        Doctor drMeena  = buildDoctor(drMeenaUser,  deptNeuro,     h1, "Neurology",   "AVAILABLE");
        drMeena  = doctorRepository.save(drMeena);

        Doctor drVikram = buildDoctor(drVikramUser, deptOrtho,     h2, "Orthopedics", "AVAILABLE");
        drVikram = doctorRepository.save(drVikram);

        Doctor drLakshmi = buildDoctor(drLakshmiUser, deptPediatric, h2, "Pediatrics", "NOT_AVAILABLE");
        drLakshmi = doctorRepository.save(drLakshmi);

        log.info("  inserted → doctors (4)");

        // ── 6. Appointments ───────────────────────────────────
        appointmentRepository.save(buildAppointment(rajesh, drArun,   h1,
                LocalDate.of(2026, 4, 5), LocalTime.of(10, 0),
                "SCHEDULED",  "IN_PERSON", null));

        appointmentRepository.save(buildAppointment(sneha,  drMeena,  h1,
                LocalDate.of(2026, 4, 6), LocalTime.of(11, 30),
                "SCHEDULED",  "ONLINE",    "https://meet.mediconnect.com/room/abc123"));

        appointmentRepository.save(buildAppointment(mohan,  drVikram, h2,
                LocalDate.of(2026, 4, 7), LocalTime.of(9, 0),
                "SCHEDULED",  "IN_PERSON", null));

        appointmentRepository.save(buildAppointment(anitha, drLakshmi, h2,
                LocalDate.of(2026, 4, 8), LocalTime.of(14, 0),
                "SCHEDULED",  "ONLINE",    "https://meet.mediconnect.com/room/xyz456"));

        appointmentRepository.save(buildAppointment(rajesh, drMeena,  h1,
                LocalDate.of(2026, 3, 20), LocalTime.of(10, 30),
                "COMPLETED",  "IN_PERSON", null));

        appointmentRepository.save(buildAppointment(mohan,  drVikram, h2,
                LocalDate.of(2026, 3, 25), LocalTime.of(16, 0),
                "CANCELLED",  "IN_PERSON", null));

        log.info("  inserted → appointments (6)");

        // ── 7. Medical Records ────────────────────────────────
        medicalRecordRepository.save(buildMedicalRecord(
                rajesh, drArun, h1, LocalDate.of(2026, 3, 20),
                "Hypertension Stage 1",
                "Lifestyle modification and medication",
                "Amlodipine 5mg once daily; Telmisartan 40mg once daily",
                "Patient advised to reduce sodium intake and exercise daily"));

        medicalRecordRepository.save(buildMedicalRecord(
                sneha, drMeena, h1, LocalDate.of(2026, 2, 15),
                "Migraine with Aura",
                "Preventive therapy initiated",
                "Topiramate 25mg twice daily; Sumatriptan 50mg as needed",
                "Patient reports 4-5 episodes per month. MRI scheduled."));

        medicalRecordRepository.save(buildMedicalRecord(
                mohan, drVikram, h2, LocalDate.of(2026, 3, 1),
                "Right Knee Ligament Sprain (Grade 2)",
                "Physiotherapy and rest",
                "Diclofenac 75mg twice daily; Physiotherapy 3x/week",
                "X-ray clear. Patient to avoid weight-bearing sports for 6 weeks."));

        medicalRecordRepository.save(buildMedicalRecord(
                anitha, drLakshmi, h2, LocalDate.of(2026, 1, 10),
                "Acute Tonsillitis",
                "Antibiotic course",
                "Amoxicillin 250mg three times daily for 7 days",
                "Child presented with fever and sore throat. Follow-up in 1 week."));

        medicalRecordRepository.save(buildMedicalRecord(
                rajesh, drArun, h1, LocalDate.of(2026, 3, 25),
                "Hypertension - Follow-up",
                "Medication adjusted",
                "Amlodipine 10mg once daily; Telmisartan 40mg once daily",
                "BP readings improved. Dosage of Amlodipine increased."));

        log.info("  inserted → medical_records (5)");

        // ── 8. Lab Reports ────────────────────────────────────
        labReportRepository.save(buildLabReport(
                rajesh, drArun, h1, "Complete Blood Count (CBC)",
                "Hb: 14.2 g/dL, WBC: 7200/µL, Platelets: 230000/µL — Normal",
                "https://reports.mediconnect.com/lab/1001.pdf",
                LocalDate.of(2026, 3, 18)));

        labReportRepository.save(buildLabReport(
                rajesh, drArun, h1, "Lipid Profile",
                "Total Cholesterol: 215 mg/dL, LDL: 140 mg/dL, HDL: 45 mg/dL — Borderline High",
                "https://reports.mediconnect.com/lab/1002.pdf",
                LocalDate.of(2026, 3, 18)));

        labReportRepository.save(buildLabReport(
                sneha, drMeena, h1, "MRI Brain",
                "No acute intracranial abnormality. Mild cortical atrophy noted.",
                "https://reports.mediconnect.com/lab/1003.pdf",
                LocalDate.of(2026, 2, 20)));

        labReportRepository.save(buildLabReport(
                mohan, drVikram, h2, "X-Ray Right Knee",
                "No fracture detected. Mild soft tissue swelling around knee joint.",
                "https://reports.mediconnect.com/lab/1004.pdf",
                LocalDate.of(2026, 3, 1)));

        labReportRepository.save(buildLabReport(
                anitha, drLakshmi, h2, "Throat Swab Culture",
                "Group A Streptococcus detected. Sensitive to Amoxicillin.",
                "https://reports.mediconnect.com/lab/1005.pdf",
                LocalDate.of(2026, 1, 10)));

        labReportRepository.save(buildLabReport(
                mohan, drVikram, h2, "Blood Glucose Fasting",
                "Fasting Glucose: 98 mg/dL — Normal Range",
                "https://reports.mediconnect.com/lab/1006.pdf",
                LocalDate.of(2026, 3, 2)));

        log.info("  inserted → lab_reports (6)");

        // ── 9. Beds ───────────────────────────────────────────
        bedRepository.save(buildBed(h1, "General Ward",   101, "OCCUPIED",  rajesh));
        bedRepository.save(buildBed(h1, "General Ward",   102, "AVAILABLE", null));
        bedRepository.save(buildBed(h1, "General Ward",   103, "AVAILABLE", null));
        bedRepository.save(buildBed(h1, "ICU",            201, "OCCUPIED",  sneha));
        bedRepository.save(buildBed(h1, "ICU",            202, "AVAILABLE", null));
        bedRepository.save(buildBed(h2, "General Ward",   101, "OCCUPIED",  mohan));
        bedRepository.save(buildBed(h2, "General Ward",   102, "AVAILABLE", null));
        bedRepository.save(buildBed(h2, "Pediatric Ward", 301, "OCCUPIED",  anitha));

        log.info("  inserted → beds (8)");

        // ── 10. Inventory ─────────────────────────────────────
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

        // ── 11. Notifications ─────────────────────────────────
        notificationRepository.save(buildNotification(patRajeshUser,  "APPOINTMENT",
                "Your appointment with Dr. Arun Kumar is confirmed for Apr 5, 2026 at 10:00 AM.",
                false, LocalDateTime.of(2026, 4, 1, 9, 0)));

        notificationRepository.save(buildNotification(patSnehaUser,   "APPOINTMENT",
                "Your online appointment with Dr. Meena Reddy is confirmed for Apr 6, 2026.",
                false, LocalDateTime.of(2026, 4, 1, 9, 5)));

        notificationRepository.save(buildNotification(patMohanUser,   "APPOINTMENT",
                "Your appointment with Dr. Vikram Singh is confirmed for Apr 7, 2026 at 9:00 AM.",
                false, LocalDateTime.of(2026, 4, 1, 9, 10)));

        notificationRepository.save(buildNotification(patAnithaUser,  "APPOINTMENT",
                "Your appointment with Dr. Lakshmi Nair is confirmed for Apr 8, 2026 at 2:00 PM.",
                false, LocalDateTime.of(2026, 4, 1, 9, 15)));

        notificationRepository.save(buildNotification(patRajeshUser,  "LAB_REPORT",
                "Your Lipid Profile report is now available. Please review it.",
                true,  LocalDateTime.of(2026, 3, 18, 14, 0)));

        notificationRepository.save(buildNotification(patRajeshUser,  "REMINDER",
                "Reminder: Please take your Amlodipine dose today.",
                true,  LocalDateTime.of(2026, 3, 25, 8, 0)));

        notificationRepository.save(buildNotification(drArunUser,     "REMINDER",
                "You have 2 appointments scheduled today.",
                false, LocalDateTime.of(2026, 4, 5, 7, 0)));

        notificationRepository.save(buildNotification(patMohanUser,   "LAB_REPORT",
                "Your X-Ray Right Knee report is now available.",
                true,  LocalDateTime.of(2026, 3, 1, 15, 0)));

        log.info("  inserted → notifications (8)");

        // ── 12. Chatbot Logs ──────────────────────────────────
        chatbotLogRepository.save(buildChatbotLog(patRajeshUser,
                "What are the symptoms of hypertension?",
                "Common symptoms include headaches, shortness of breath, nosebleeds, and chest pain. " +
                "Hypertension is often called the silent killer as it may have no symptoms.",
                LocalDateTime.of(2026, 3, 10, 10, 30)));

        chatbotLogRepository.save(buildChatbotLog(patRajeshUser,
                "Is Amlodipine safe for long-term use?",
                "Amlodipine is generally safe for long-term use when prescribed by your doctor. " +
                "Regular monitoring of blood pressure and periodic blood tests are recommended.",
                LocalDateTime.of(2026, 3, 10, 10, 32)));

        chatbotLogRepository.save(buildChatbotLog(patSnehaUser,
                "How long does a migraine last?",
                "Migraines typically last between 4 to 72 hours. With proper treatment, the duration " +
                "can be reduced. Keeping a migraine diary can help identify triggers.",
                LocalDateTime.of(2026, 2, 10, 14, 0)));

        chatbotLogRepository.save(buildChatbotLog(patMohanUser,
                "How do I recover from a knee sprain?",
                "Recovery includes RICE therapy (Rest, Ice, Compression, Elevation), physiotherapy " +
                "exercises, and avoiding strenuous activities for 4-6 weeks depending on severity.",
                LocalDateTime.of(2026, 3, 5, 11, 0)));

        chatbotLogRepository.save(buildChatbotLog(patAnithaUser,
                "What to do for a child with tonsillitis?",
                "Ensure the child completes the full antibiotic course, encourage warm fluids, rest, " +
                "and saltwater gargles. Consult the doctor if fever persists beyond 2 days of medication.",
                LocalDateTime.of(2026, 1, 12, 9, 0)));

        chatbotLogRepository.save(buildChatbotLog(patRajeshUser,
                "What foods should I avoid with high blood pressure?",
                "Avoid high-sodium foods like pickles, chips, processed meats, and canned soups. " +
                "Limit caffeine and alcohol. A DASH diet rich in fruits and vegetables is recommended.",
                LocalDateTime.of(2026, 3, 28, 16, 0)));

        log.info("  inserted → chatbot_logs (6)");
    }

    // =========================================================
    //  Builder helper methods
    // =========================================================

    private User buildUser(String name, String email, String password, String phone,
                           String role, Hospital hospital,
                           String specialization, String availabilityStatus,
                           LocalDate dob, String gender, String bloodGroup,
                           String address, String emergencyContact) {
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        u.setPassword(password);
        u.setPhone(phone);
        u.setRole(role);
        u.setHospital(hospital);
        u.setSpecialization(specialization);
        u.setAvailabilityStatus(availabilityStatus);
        u.setDateOfBirth(dob);
        u.setGender(gender);
        u.setBloodGroup(bloodGroup);
        u.setAddress(address);
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
                                 String bloodGroup, String address, String emergencyContact) {
        Patient p = new Patient();
        p.setUser(user);
        p.setDateOfBirth(dob);
        p.setGender(gender);
        p.setBloodGroup(bloodGroup);
        p.setAddress(address);
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
                                             String treatment, String prescription, String notes) {
        MedicalRecord m = new MedicalRecord();
        m.setPatient(patient);
        m.setDoctor(doctor);
        m.setHospital(hospital);
        m.setRecordDate(date);
        m.setDiagnosis(diagnosis);
        m.setTreatment(treatment);
        m.setPrescription(prescription);
        m.setNotes(notes);
        return m;
    }

    private LabReport buildLabReport(Patient patient, Doctor doctor, Hospital hospital,
                                     String testName, String result,
                                     String reportUrl, LocalDate reportDate) {
        LabReport r = new LabReport();
        r.setPatient(patient);
        r.setDoctor(doctor);
        r.setHospital(hospital);
        r.setTestName(testName);
        r.setResult(result);
        r.setReportUrl(reportUrl);
        r.setReportDate(reportDate);
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
}
