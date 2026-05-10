package com.cts.mfrp.seed;

import com.cts.mfrp.entity.*;
import com.cts.mfrp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Supplement seeder — runs after DataSeederRunner (@Order 1 → 2).
 * Adds rich sample data: 3 hospitals, 8 doctors, 12 patients,
 * 35 appointments (spread Jan–May 2026), vitals, medicines, prescriptions,
 * bills, video sessions, reschedule requests, lab reports, and notifications.
 *
 * Guard: skips if appointmentRepository.count() >= 30 (already rich)
 *        or if userRepository.count() == 0 (base data missing).
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class SupplementSeeder implements CommandLineRunner {

    private final PasswordEncoder              passwordEncoder;
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
    private final VitalsRepository            vitalsRepository;
    private final MedicineRepository          medicineRepository;
    private final PrescriptionRepository      prescriptionRepository;
    private final RescheduleRequestRepository rescheduleRequestRepository;
    private final BillRepository              billRepository;
    private final VideoSessionRepository      videoSessionRepository;

    private static final String PWD = "MediConnect@123";

    @Override
    public void run(String... args) {
        if (appointmentRepository.count() >= 30) {
            log.info("Rich sample data already present — skipping supplement seed.");
            return;
        }
        if (userRepository.count() == 0) {
            log.info("No base data found — supplement seed requires base data first.");
            return;
        }

        log.info("");
        log.info("╔══════════════════════════════════════════════╗");
        log.info("║   MediConnect — Supplement Data Seeder       ║");
        log.info("╚══════════════════════════════════════════════╝");
        log.info("");

        try {
            seed();
            log.info("");
            log.info("✔  Supplement seeding complete!");
            log.info("   35 appointments across Jan–May 2026.");
            log.info("   12 patients · 8 doctors · 3 hospitals.");
            log.info("");
        } catch (Exception ex) {
            log.error("Supplement seeding failed — partial data may have been inserted.", ex);
        }
    }

    // =========================================================
    //  Main seed method
    // =========================================================
    private void seed() {

        // ── Look up existing base entities (created by DataSeederRunner) ──
        Hospital h1 = hospitalRepository.findAll().stream()
                .filter(h -> "Chennai".equalsIgnoreCase(h.getCity())).findFirst()
                .orElseThrow(() -> new IllegalStateException("Chennai hospital not found — run seed profile first"));
        Hospital h2 = hospitalRepository.findAll().stream()
                .filter(h -> "Bangalore".equalsIgnoreCase(h.getCity())).findFirst()
                .orElseThrow(() -> new IllegalStateException("Bangalore hospital not found"));

        Doctor drArun    = doctorRepository.findByUserEmail("arun.kumar@cgh.com").orElseThrow();
        Doctor drMeena   = doctorRepository.findByUserEmail("meena.reddy@cgh.com").orElseThrow();
        Doctor drVikram  = doctorRepository.findByUserEmail("vikram.singh@amc.com").orElseThrow();
        Doctor drLakshmi = doctorRepository.findByUserEmail("lakshmi.nair@amc.com").orElseThrow();

        Patient rajesh = findPatient("rajesh.sharma@gmail.com");
        Patient sneha  = findPatient("sneha.patel@gmail.com");
        Patient mohan  = findPatient("mohan.das@gmail.com");
        Patient anitha = findPatient("anitha.k@gmail.com");

        // ── 1. New Hospital ────────────────────────────────────
        Hospital h3 = hospitalRepository.save(mkHospital(
                "MediCare Specialty Hospital", "45 Banjara Hills, Road No.12",
                "Hyderabad", "040-66778899", 150, 45));
        log.info("  inserted → hospital: MediCare Specialty Hospital (Hyderabad)");

        // ── 2. New Departments ─────────────────────────────────
        Department deptDerma     = departmentRepository.save(mkDept("Dermatology",       h1));
        Department deptOnco      = departmentRepository.save(mkDept("Oncology",           h2));
        Department deptGastro    = departmentRepository.save(mkDept("Gastroenterology",   h2));
        Department deptPsych     = departmentRepository.save(mkDept("Psychiatry",         h3));
        Department deptEmergency = departmentRepository.save(mkDept("Emergency Medicine", h3));
        log.info("  inserted → departments (5 new)");

        // ── 3. New Users ────────────────────────────────────────
        // Admin for h3
        userRepository.save(mkUser("Admin Suresh", "admin.suresh@msh.com",
                "9833001111", "ADMIN", h3, null, null,
                LocalDate.of(1983, 9, 12), "MALE", null, "9833001112"));

        // Doctor users
        User uPriya  = userRepository.save(mkUser("Dr. Priya Sharma",  "priya.sharma@cgh.com",
                "9811005555", "DOCTOR", h1, "Dermatology",       "AVAILABLE",
                LocalDate.of(1984, 3, 22),  "FEMALE", "A+",  "9811005556"));
        User uRavi   = userRepository.save(mkUser("Dr. Ravi Gupta",    "ravi.gupta@amc.com",
                "9822006666", "DOCTOR", h2, "Oncology",          "AVAILABLE",
                LocalDate.of(1979, 7, 15),  "MALE",   "O+",  "9822006667"));
        User uSanjay = userRepository.save(mkUser("Dr. Sanjay Verma",  "sanjay.verma@amc.com",
                "9822007777", "DOCTOR", h2, "Gastroenterology",  "AVAILABLE",
                LocalDate.of(1981, 11, 8),  "MALE",   "B+",  "9822007778"));
        User uAnand  = userRepository.save(mkUser("Dr. Anand Kapoor",  "anand.kapoor@msh.com",
                "9833008888", "DOCTOR", h3, "Psychiatry",        "AVAILABLE",
                LocalDate.of(1977, 5, 30),  "MALE",   "AB+", "9833008889"));
        User uKavita = userRepository.save(mkUser("Dr. Kavita Rao",    "kavita.rao@msh.com",
                "9833009999", "DOCTOR", h3, "Emergency Medicine","AVAILABLE",
                LocalDate.of(1986, 8, 18),  "FEMALE", "O-",  "9833009990"));

        Doctor drPriya  = doctorRepository.save(mkDoctor(uPriya,  deptDerma,     h1, "Dermatology",       "AVAILABLE"));
        Doctor drRavi   = doctorRepository.save(mkDoctor(uRavi,   deptOnco,      h2, "Oncology",          "AVAILABLE"));
        Doctor drSanjay = doctorRepository.save(mkDoctor(uSanjay, deptGastro,    h2, "Gastroenterology",  "AVAILABLE"));
        Doctor drAnand  = doctorRepository.save(mkDoctor(uAnand,  deptPsych,     h3, "Psychiatry",        "AVAILABLE"));
        Doctor drKavita = doctorRepository.save(mkDoctor(uKavita, deptEmergency, h3, "Emergency Medicine","AVAILABLE"));
        log.info("  inserted → users+doctors (5 new doctors + 1 admin)");

        // Patient users
        User uAmit    = userRepository.save(mkUser("Amit Joshi",     "amit.joshi@gmail.com",
                "9855001111", "PATIENT", h1, null, null, LocalDate.of(1985, 6, 25),  "MALE",   "A+",  "9855001112"));
        User uPreethi = userRepository.save(mkUser("Preethi Menon",  "preethi.menon@gmail.com",
                "9855002222", "PATIENT", h1, null, null, LocalDate.of(1992, 3, 14),  "FEMALE", "B-",  "9855002223"));
        User uKaran   = userRepository.save(mkUser("Karan Malhotra", "karan.malhotra@gmail.com",
                "9866003333", "PATIENT", h2, null, null, LocalDate.of(1978, 9, 3),   "MALE",   "O-",  "9866003334"));
        User uDivya   = userRepository.save(mkUser("Divya Reddy",    "divya.reddy@gmail.com",
                "9877004444", "PATIENT", h3, null, null, LocalDate.of(1996, 12, 20), "FEMALE", "AB+", "9877004445"));
        User uSuresh  = userRepository.save(mkUser("Suresh Kumar",   "suresh.kumar@gmail.com",
                "9877005555", "PATIENT", h3, null, null, LocalDate.of(1968, 4, 8),   "MALE",   "A+",  "9877005556"));
        User uLakshmi = userRepository.save(mkUser("Lakshmi Devi",   "lakshmi.devi@gmail.com",
                "9877006666", "PATIENT", h3, null, null, LocalDate.of(2003, 7, 17),  "FEMALE", "B+",  "9877006667"));
        User uNaveen  = userRepository.save(mkUser("Naveen Pillai",  "naveen.pillai@gmail.com",
                "9888007777", "PATIENT", h2, null, null, LocalDate.of(2000, 11, 5),  "MALE",   "A-",  "9888007778"));
        User uSunita  = userRepository.save(mkUser("Sunita Bose",    "sunita.bose@gmail.com",
                "9888008888", "PATIENT", h2, null, null, LocalDate.of(1975, 2, 28),  "FEMALE", "O+",  "9888008889"));

        Patient amit     = patientRepository.save(mkPatient(uAmit,    LocalDate.of(1985, 6, 25),  "MALE",   "A+",  "9855001112"));
        Patient preethi  = patientRepository.save(mkPatient(uPreethi, LocalDate.of(1992, 3, 14),  "FEMALE", "B-",  "9855002223"));
        Patient karan    = patientRepository.save(mkPatient(uKaran,   LocalDate.of(1978, 9, 3),   "MALE",   "O-",  "9866003334"));
        Patient divya    = patientRepository.save(mkPatient(uDivya,   LocalDate.of(1996, 12, 20), "FEMALE", "AB+", "9877004445"));
        Patient suresh   = patientRepository.save(mkPatient(uSuresh,  LocalDate.of(1968, 4, 8),   "MALE",   "A+",  "9877005556"));
        Patient lakshmiP = patientRepository.save(mkPatient(uLakshmi, LocalDate.of(2003, 7, 17),  "FEMALE", "B+",  "9877006667"));
        Patient naveen   = patientRepository.save(mkPatient(uNaveen,  LocalDate.of(2000, 11, 5),  "MALE",   "A-",  "9888007778"));
        Patient sunita   = patientRepository.save(mkPatient(uSunita,  LocalDate.of(1975, 2, 28),  "FEMALE", "O+",  "9888008889"));
        log.info("  inserted → users+patients (8 new)");

        // ── 4. Vitals for all 12 patients ─────────────────────
        vitalsRepository.save(mkVitals(rajesh,   "128/82", 76,  "98.0",  "24.2"));
        vitalsRepository.save(mkVitals(sneha,    "115/75", 72,  "90.5",  "21.8"));
        vitalsRepository.save(mkVitals(mohan,    "122/80", 80,  "105.0", "26.3"));
        vitalsRepository.save(mkVitals(anitha,   "110/70", 88,  "82.0",  "19.5"));
        vitalsRepository.save(mkVitals(amit,     "135/88", 82,  "112.0", "27.1"));
        vitalsRepository.save(mkVitals(preethi,  "118/76", 68,  "95.0",  "22.4"));
        vitalsRepository.save(mkVitals(karan,    "140/92", 78,  "108.0", "28.9"));
        vitalsRepository.save(mkVitals(divya,    "112/72", 74,  "88.0",  "20.6"));
        vitalsRepository.save(mkVitals(suresh,   "145/95", 85,  "130.0", "31.2"));
        vitalsRepository.save(mkVitals(lakshmiP, "108/68", 70,  "85.0",  "18.9"));
        vitalsRepository.save(mkVitals(naveen,   "120/78", 75,  "93.0",  "23.1"));
        vitalsRepository.save(mkVitals(sunita,   "132/84", 79,  "101.0", "25.8"));
        log.info("  inserted → vitals (12)");

        // ── 5. Medicines ────────────────────────────────────────
        medicineRepository.save(mkMed(rajesh,   "Amlodipine",              "10mg",      "Once daily",        "08:00 AM",                       "due"));
        medicineRepository.save(mkMed(rajesh,   "Telmisartan",             "40mg",      "Once daily",        "08:00 AM",                       "taken"));
        medicineRepository.save(mkMed(rajesh,   "Aspirin",                 "75mg",      "Once daily",        "09:00 AM",                       "upcoming"));
        medicineRepository.save(mkMed(sneha,    "Topiramate",              "25mg",      "Twice daily",       "08:00 AM / 08:00 PM",            "taken"));
        medicineRepository.save(mkMed(sneha,    "Sumatriptan",             "50mg",      "As needed",         "As needed",                      "upcoming"));
        medicineRepository.save(mkMed(mohan,    "Diclofenac",              "75mg",      "Twice daily",       "07:00 AM / 07:00 PM",            "taken"));
        medicineRepository.save(mkMed(mohan,    "Pantoprazole",            "40mg",      "Once daily",        "07:00 AM",                       "due"));
        medicineRepository.save(mkMed(anitha,   "Amoxicillin",             "250mg",     "Three times daily", "07:00 AM / 01:00 PM / 07:00 PM", "taken"));
        medicineRepository.save(mkMed(anitha,   "Paracetamol",             "500mg",     "As needed",         "As needed",                      "upcoming"));
        medicineRepository.save(mkMed(amit,     "Metformin",               "500mg",     "Twice daily",       "08:00 AM / 08:00 PM",            "due"));
        medicineRepository.save(mkMed(amit,     "Amlodipine",              "5mg",       "Once daily",        "08:00 AM",                       "upcoming"));
        medicineRepository.save(mkMed(amit,     "Atorvastatin",            "10mg",      "Once daily",        "10:00 PM",                       "taken"));
        medicineRepository.save(mkMed(preethi,  "Levothyroxine",           "50mcg",     "Once daily",        "06:00 AM",                       "taken"));
        medicineRepository.save(mkMed(preethi,  "Vitamin D3",              "60000 IU",  "Once weekly",       "Sunday 08:00 AM",                "upcoming"));
        medicineRepository.save(mkMed(karan,    "Pantoprazole",            "40mg",      "Once daily",        "07:00 AM",                       "taken"));
        medicineRepository.save(mkMed(karan,    "Domperidone",             "10mg",      "Three times daily", "Before meals",                   "due"));
        medicineRepository.save(mkMed(divya,    "Cetirizine",              "10mg",      "Once daily",        "09:00 PM",                       "taken"));
        medicineRepository.save(mkMed(divya,    "Escitalopram",            "10mg",      "Once daily",        "10:00 PM",                       "upcoming"));
        medicineRepository.save(mkMed(suresh,   "Metoprolol",              "25mg",      "Twice daily",       "08:00 AM / 08:00 PM",            "taken"));
        medicineRepository.save(mkMed(suresh,   "Metformin",               "1000mg",    "Twice daily",       "08:00 AM / 08:00 PM",            "taken"));
        medicineRepository.save(mkMed(suresh,   "Atorvastatin",            "20mg",      "Once daily",        "10:00 PM",                       "due"));
        medicineRepository.save(mkMed(lakshmiP, "Ferrous Sulphate",        "200mg",     "Once daily",        "12:00 PM",                       "taken"));
        medicineRepository.save(mkMed(naveen,   "Cetirizine",              "10mg",      "Once daily",        "09:00 PM",                       "upcoming"));
        medicineRepository.save(mkMed(sunita,   "Atorvastatin",            "10mg",      "Once daily",        "10:00 PM",                       "taken"));
        medicineRepository.save(mkMed(sunita,   "Aspirin",                 "75mg",      "Once daily",        "09:00 AM",                       "due"));
        log.info("  inserted → medicines (25)");

        // ── 6. Appointments (spread Jan–May 2026) ───────────────
        // January 2026
        Appointment a01 = appt(amit,    drArun,   h1, date(2026,1,10), time(9,0),   "CONFIRMED","IN_PERSON",null,                                        "Annual cardiac check-up");
        Appointment a02 = appt(preethi, drMeena,  h1, date(2026,1,15), time(11,0),  "CONFIRMED","VIDEO",    "https://meet.mediconnect.app/room/v001",    "Thyroid consultation");
        Appointment a03 = appt(karan,   drVikram, h2, date(2026,1,22), time(10,30), "CANCELLED","IN_PERSON",null,                                        "Knee follow-up — rescheduled");
        // February 2026
        Appointment a04 = appt(rajesh,  drArun,   h1, date(2026,2,3),  time(9,30),  "CONFIRMED","IN_PERSON",null,                                        "Hypertension monitoring");
        Appointment a05 = appt(divya,   drAnand,  h3, date(2026,2,8),  time(14,0),  "CONFIRMED","VIDEO",    "https://meet.mediconnect.app/room/v002",    "Anxiety management");
        Appointment a06 = appt(suresh,  drArun,   h1, date(2026,2,12), time(10,0),  "CONFIRMED","IN_PERSON",null,                                        "Chest pain evaluation");
        Appointment a07 = appt(sneha,   drMeena,  h1, date(2026,2,20), time(11,30), "CONFIRMED","IN_PERSON",null,                                        "Migraine review");
        Appointment a08 = appt(naveen,  drPriya,  h1, date(2026,2,25), time(15,0),  "CANCELLED","IN_PERSON",null,                                        "Skin allergy follow-up");
        // March 2026
        Appointment a09 = appt(mohan,   drVikram, h2, date(2026,3,2),  time(9,0),   "CONFIRMED","IN_PERSON",null,                                        "Orthopedic review");
        Appointment a10 = appt(lakshmiP,drLakshmi,h2, date(2026,3,5),  time(10,30), "CONFIRMED","IN_PERSON",null,                                        "Iron deficiency follow-up");
        Appointment a11 = appt(karan,   drSanjay, h2, date(2026,3,8),  time(11,0),  "CONFIRMED","VIDEO",    "https://meet.mediconnect.app/room/v003",    "GERD consultation");
        Appointment a12 = appt(suresh,  drRavi,   h2, date(2026,3,12), time(14,30), "CONFIRMED","IN_PERSON",null,                                        "Cancer screening");
        Appointment a13 = appt(rajesh,  drArun,   h1, date(2026,3,15), time(9,30),  "CONFIRMED","IN_PERSON",null,                                        "BP + renal monitoring");
        Appointment a14 = appt(divya,   drPriya,  h1, date(2026,3,18), time(15,0),  "CONFIRMED","IN_PERSON",null,                                        "Allergy consultation");
        Appointment a15 = appt(sneha,   drMeena,  h1, date(2026,3,22), time(10,0),  "CANCELLED","VIDEO",    null,                                        "Headache review");
        Appointment a16 = appt(preethi, drMeena,  h1, date(2026,3,28), time(11,30), "CONFIRMED","IN_PERSON",null,                                        "Thyroid recheck");
        Appointment a17 = appt(sunita,  drSanjay, h2, date(2026,3,18), time(9,0),   "CONFIRMED","IN_PERSON",null,                                        "Abdominal discomfort review");
        Appointment a18 = appt(naveen,  drAnand,  h3, date(2026,3,25), time(14,0),  "CONFIRMED","VIDEO",    "https://meet.mediconnect.app/room/v005",    "Stress and anxiety session");
        // April 2026
        Appointment a19 = appt(amit,    drArun,   h1, date(2026,4,2),  time(10,0),  "CONFIRMED","IN_PERSON",null,                                        "Cardiac follow-up");
        Appointment a20 = appt(karan,   drSanjay, h2, date(2026,4,4),  time(9,30),  "CONFIRMED","IN_PERSON",null,                                        "Endoscopy review");
        Appointment a21 = appt(suresh,  drAnand,  h3, date(2026,4,7),  time(13,0),  "PENDING",  "VIDEO",    null,                                        "Stress counseling session");
        Appointment a22 = appt(lakshmiP,drLakshmi,h2, date(2026,4,9),  time(11,0),  "CONFIRMED","IN_PERSON",null,                                        "Anaemia management");
        Appointment a23 = appt(divya,   drAnand,  h3, date(2026,4,12), time(14,0),  "PENDING",  "VIDEO",    null,                                        "Anxiety follow-up");
        Appointment a24 = appt(mohan,   drSanjay, h2, date(2026,4,15), time(10,30), "PENDING",  "IN_PERSON",null,                                        "Abdominal pain evaluation");
        Appointment a25 = appt(rajesh,  drArun,   h1, date(2026,4,18), time(9,0),   "CONFIRMED","IN_PERSON",null,                                        "Quarterly BP + kidney check");
        Appointment a26 = appt(sneha,   drMeena,  h1, date(2026,4,25), time(11,0),  "CONFIRMED","VIDEO",    "https://meet.mediconnect.app/room/v004",    "Migraine management");
        Appointment a27 = appt(sunita,  drRavi,   h2, date(2026,4,20), time(10,0),  "PENDING",  "IN_PERSON",null,                                        "Oncology consultation");
        // May 2026 (upcoming / pending)
        Appointment a28 = appt(amit,    drPriya,  h1, date(2026,5,5),  time(14,0),  "PENDING",  "IN_PERSON",null,                                        "Skin rash review");
        Appointment a29 = appt(karan,   drRavi,   h2, date(2026,5,8),  time(10,0),  "PENDING",  "IN_PERSON",null,                                        "Lung nodule follow-up");
        Appointment a30 = appt(suresh,  drArun,   h1, date(2026,5,12), time(9,30),  "PENDING",  "IN_PERSON",null,                                        "Cardiac stress test");
        Appointment a31 = appt(divya,   drMeena,  h1, date(2026,5,15), time(11,30), "PENDING",  "VIDEO",    null,                                        "Headache evaluation");
        Appointment a32 = appt(mohan,   drVikram, h2, date(2026,5,18), time(9,0),   "PENDING",  "IN_PERSON",null,                                        "Orthopedic follow-up");
        Appointment a33 = appt(lakshmiP,drLakshmi,h2, date(2026,5,20), time(14,30), "PENDING",  "IN_PERSON",null,                                        "Growth + anaemia check");
        Appointment a34 = appt(rajesh,  drArun,   h1, date(2026,5,22), time(10,0),  "PENDING",  "IN_PERSON",null,                                        "Hypertension + renal review");
        Appointment a35 = appt(naveen,  drKavita, h3, date(2026,5,10), time(15,0),  "PENDING",  "IN_PERSON",null,                                        "Sports injury evaluation");
        log.info("  inserted → appointments (35)");

        // ── 7. Bills ─────────────────────────────────────────────
        billRepository.save(mkBill(a01, amit,    "500", "CONSULTATION",       "PAID",    a01.getAppointmentDate()));
        billRepository.save(mkBill(a02, preethi, "700", "VIDEO_CONSULTATION", "PAID",    a02.getAppointmentDate()));
        billRepository.save(mkBill(a04, rajesh,  "500", "CONSULTATION",       "PAID",    a04.getAppointmentDate()));
        billRepository.save(mkBill(a05, divya,   "700", "VIDEO_CONSULTATION", "PAID",    a05.getAppointmentDate()));
        billRepository.save(mkBill(a06, suresh,  "500", "CONSULTATION",       "PAID",    a06.getAppointmentDate()));
        billRepository.save(mkBill(a07, sneha,   "500", "CONSULTATION",       "PAID",    a07.getAppointmentDate()));
        billRepository.save(mkBill(a09, mohan,   "500", "CONSULTATION",       "PAID",    a09.getAppointmentDate()));
        billRepository.save(mkBill(a10, lakshmiP,"500", "CONSULTATION",       "PAID",    a10.getAppointmentDate()));
        billRepository.save(mkBill(a11, karan,   "700", "VIDEO_CONSULTATION", "PAID",    a11.getAppointmentDate()));
        billRepository.save(mkBill(a12, suresh,  "500", "CONSULTATION",       "PAID",    a12.getAppointmentDate()));
        billRepository.save(mkBill(a13, rajesh,  "500", "CONSULTATION",       "PAID",    a13.getAppointmentDate()));
        billRepository.save(mkBill(a14, divya,   "500", "CONSULTATION",       "PAID",    a14.getAppointmentDate()));
        billRepository.save(mkBill(a16, preethi, "500", "CONSULTATION",       "PAID",    a16.getAppointmentDate()));
        billRepository.save(mkBill(a17, sunita,  "500", "CONSULTATION",       "PAID",    a17.getAppointmentDate()));
        billRepository.save(mkBill(a18, naveen,  "700", "VIDEO_CONSULTATION", "PAID",    a18.getAppointmentDate()));
        billRepository.save(mkBill(a19, amit,    "500", "CONSULTATION",       "PAID",    a19.getAppointmentDate()));
        billRepository.save(mkBill(a20, karan,   "500", "CONSULTATION",       "PAID",    a20.getAppointmentDate()));
        billRepository.save(mkBill(a22, lakshmiP,"500", "CONSULTATION",       "PAID",    a22.getAppointmentDate()));
        billRepository.save(mkBill(a25, rajesh,  "500", "CONSULTATION",       "PENDING", a25.getAppointmentDate()));
        billRepository.save(mkBill(a26, sneha,   "700", "VIDEO_CONSULTATION", "PENDING", a26.getAppointmentDate()));
        billRepository.save(mkBill(a27, sunita,  "500", "CONSULTATION",       "PENDING", a27.getAppointmentDate()));
        billRepository.save(mkBill(a28, amit,    "500", "CONSULTATION",       "PENDING", a28.getAppointmentDate()));
        billRepository.save(mkBill(a30, suresh,  "500", "CONSULTATION",       "PENDING", a30.getAppointmentDate()));
        log.info("  inserted → bills (23)");

        // ── 8. Medical Records ──────────────────────────────────
        MedicalRecord mr01 = medicalRecordRepository.save(mkRec(amit,    drArun,   h1, date(2026,1,10),
                "Hypertension Stage 1 + Pre-Diabetes",
                "Lifestyle modification and dual medication therapy",
                "Metformin 500mg twice daily; Amlodipine 5mg once daily; Aspirin 75mg daily",
                "BMI 27.1. FBS 118 mg/dL. Family history of DM. Review in 3 months."));
        MedicalRecord mr02 = medicalRecordRepository.save(mkRec(preethi, drMeena,  h1, date(2026,1,15),
                "Hypothyroidism + Vitamin D Deficiency",
                "Thyroid replacement therapy and Vitamin D supplementation",
                "Levothyroxine 50mcg once daily; Vitamin D3 60000 IU weekly",
                "TSH: 8.4 mIU/L (elevated). 25-OH Vitamin D: 14 ng/mL (deficient). Recheck TSH in 6 weeks."));
        MedicalRecord mr03 = medicalRecordRepository.save(mkRec(karan,   drSanjay, h2, date(2026,3,8),
                "Gastroesophageal Reflux Disease (GERD)",
                "PPI therapy and dietary modification",
                "Pantoprazole 40mg once daily; Domperidone 10mg three times daily before meals",
                "Frequent heartburn post-meals. H. pylori negative. Low-FODMAP diet advised."));
        MedicalRecord mr04 = medicalRecordRepository.save(mkRec(divya,   drPriya,  h1, date(2026,3,18),
                "Allergic Rhinitis — Seasonal",
                "Antihistamine + nasal corticosteroid therapy",
                "Cetirizine 10mg once daily; Fluticasone Nasal Spray 50mcg twice daily",
                "IgE: 412 IU/mL elevated. Pollen sensitisation confirmed. Avoid outdoor exposure at peak times."));
        MedicalRecord mr05 = medicalRecordRepository.save(mkRec(suresh,  drArun,   h1, date(2026,2,12),
                "Hypertension Stage 2 + Type 2 Diabetes Mellitus",
                "Dual antihypertensive + glucose-lowering therapy",
                "Metoprolol 25mg twice daily; Metformin 1000mg twice daily; Atorvastatin 20mg at night",
                "58-year-old male. Long-standing DM and HTN. Cardiac evaluation recommended."));
        MedicalRecord mr06 = medicalRecordRepository.save(mkRec(suresh,  drRavi,   h2, date(2026,3,12),
                "Pulmonary Nodule — Watchful Waiting",
                "CT scan follow-up in 6 months. No intervention required at this stage.",
                "No medication required",
                "3mm pulmonary nodule right lower lobe found incidentally. Low-risk (Fleischner criteria). Follow-up CT in 6 months."));
        MedicalRecord mr07 = medicalRecordRepository.save(mkRec(lakshmiP,drLakshmi,h2, date(2026,3,5),
                "Iron Deficiency Anaemia",
                "Iron supplementation therapy",
                "Ferrous Sulphate 200mg once daily; Vitamin C 500mg to aid absorption",
                "Hb: 9.8 g/dL (low). Ferritin: 6 ng/mL (low). Dietary iron counselling provided."));
        MedicalRecord mr08 = medicalRecordRepository.save(mkRec(divya,   drAnand,  h3, date(2026,2,8),
                "Generalised Anxiety Disorder (GAD)",
                "CBT-based psychotherapy + SSRI pharmacotherapy",
                "Escitalopram 10mg once daily at bedtime",
                "PHQ-9 score: 14. Persistent worry, insomnia, irritability. Follow-up in 4 weeks."));
        MedicalRecord mr09 = medicalRecordRepository.save(mkRec(rajesh,  drArun,   h1, date(2026,3,15),
                "Hypertension — Controlled with Microalbuminuria",
                "Continue current regimen; add renal monitoring",
                "Amlodipine 10mg once daily; Telmisartan 40mg once daily; Aspirin 75mg",
                "BP 128/82 — well controlled. Urine microalbumin 30 mg/g (borderline). Renal function monitoring initiated."));
        MedicalRecord mr10 = medicalRecordRepository.save(mkRec(mohan,   drSanjay, h2, date(2026,4,15),
                "Irritable Bowel Syndrome (IBS-M)",
                "Antispasmodic + probiotic therapy with dietary guidance",
                "Mebeverine 135mg three times daily; Probiotic once daily",
                "Alternating constipation and diarrhoea with abdominal cramping. Low-FODMAP diet recommended."));
        MedicalRecord mr11 = medicalRecordRepository.save(mkRec(sunita,  drSanjay, h2, date(2026,3,18),
                "Dyspepsia + Mild Antral Gastritis",
                "PPI therapy + dietary advice",
                "Pantoprazole 40mg once daily; Antacid gel after meals",
                "Epigastric discomfort 3+ months. Upper GI endoscopy: mild antral gastritis. H. pylori negative."));
        MedicalRecord mr12 = medicalRecordRepository.save(mkRec(naveen,  drAnand,  h3, date(2026,3,25),
                "Adjustment Disorder with Anxiety",
                "Short-term CBT and lifestyle coaching",
                "Alprazolam 0.25mg as needed (maximum 3 weeks use)",
                "Work-related stress and performance anxiety. PHQ-9: 9 (mild). No suicidal ideation. Follow-up in 2 weeks."));
        log.info("  inserted → medical_records (12)");

        // ── 9. Lab Reports ──────────────────────────────────────
        lab(amit,    drArun,   h1, "HbA1c",                        "5.9% — Pre-diabetic range (normal <5.7%, diabetic ≥6.5%)",                     true,  date(2026,1,10));
        lab(amit,    drArun,   h1, "Fasting Lipid Profile",        "Total Cholesterol: 195 mg/dL, LDL: 120 mg/dL, HDL: 52 mg/dL — Normal",        false, date(2026,1,10));
        lab(amit,    drArun,   h1, "2D Echocardiogram",            "EF: 62% — Normal. No wall motion abnormality.",                                false, date(2026,2,28));
        lab(preethi, drMeena,  h1, "Thyroid Function Test (TSH)",  "TSH: 8.4 mIU/L — Elevated. Hypothyroidism confirmed.",                         true,  date(2026,1,15));
        lab(preethi, drMeena,  h1, "Vitamin D (25-OH)",            "14 ng/mL — Deficient (Normal: 30–100 ng/mL)",                                  true,  date(2026,1,15));
        lab(karan,   drSanjay, h2, "H. pylori Antigen Test",       "Negative — No H. pylori infection detected",                                   false, date(2026,3,8));
        lab(karan,   drSanjay, h2, "Liver Function Test",          "ALT: 32 U/L, AST: 28 U/L, Bilirubin: 0.8 mg/dL — All within normal limits",   false, date(2026,3,8));
        lab(divya,   drPriya,  h1, "Total IgE and Allergy Panel",  "IgE: 412 IU/mL — Elevated. Pollen and dust mite sensitisation confirmed.",     true,  date(2026,3,18));
        lab(suresh,  drArun,   h1, "Fasting Blood Sugar (FBS)",    "FBS: 148 mg/dL — Diabetic range (Normal fasting: 70–100 mg/dL)",               true,  date(2026,2,12));
        lab(suresh,  drArun,   h1, "HbA1c",                        "HbA1c: 8.2% — Poor glycaemic control (Target: <7.0%)",                         true,  date(2026,2,12));
        lab(suresh,  drArun,   h1, "12-lead ECG",                  "Sinus Rhythm. HR 82/min. No ST changes or arrhythmia. Normal ECG.",             false, date(2026,2,12));
        lab(suresh,  drRavi,   h2, "HRCT Chest",                   "3mm pulmonary nodule right lower lobe. No mediastinal involvement. Low-risk.",  false, date(2026,3,12));
        lab(lakshmiP,drLakshmi,h2, "Complete Blood Count (CBC)",   "Hb: 9.8 g/dL (Low; Normal F: 12–15). MCV: 72 fL — Microcytic hypochromic.",    true,  date(2026,3,5));
        lab(lakshmiP,drLakshmi,h2, "Serum Iron and Ferritin",      "Serum Iron: 38 mcg/dL (Low). Ferritin: 6 ng/mL (Low). TSAT: 12%.",             true,  date(2026,3,5));
        lab(rajesh,  drArun,   h1, "Urine Microalbumin (ACR)",     "Albumin–Creatinine Ratio: 30 mg/g — Borderline microalbuminuria",               true,  date(2026,3,15));
        lab(rajesh,  drArun,   h1, "Kidney Function Test (KFT)",   "Creatinine: 1.1 mg/dL, Urea: 28 mg/dL, eGFR: 72 mL/min — Mildly reduced",     false, date(2026,3,15));
        lab(sneha,   drMeena,  h1, "Serum Prolactin",              "Prolactin: 28 ng/mL — Mildly elevated (Normal: 2–25 ng/mL). Repeat in 4 weeks.",true,  date(2026,2,20));
        lab(mohan,   drVikram, h2, "MRI Right Knee",               "Grade 2 MCL sprain. No meniscal tear. Mild joint effusion present.",            false, date(2026,3,2));
        lab(sunita,  drSanjay, h2, "Upper GI Endoscopy",           "Mild antral gastritis. No erosions or ulcers. H. pylori negative on biopsy.",   false, date(2026,3,18));
        lab(naveen,  drAnand,  h3, "GAD-7 Anxiety Scale",          "Score: 11 — Moderate anxiety. CBT and medication initiated.",                   true,  date(2026,3,25));
        log.info("  inserted → lab_reports (20)");

        // ── 10. Prescriptions ────────────────────────────────────
        prescriptionRepository.save(mkRx(mr01, amit,    drArun,   "Metformin",       "500mg twice daily",        "Take with meals. Monitor fasting glucose weekly."));
        prescriptionRepository.save(mkRx(mr01, amit,    drArun,   "Amlodipine",      "5mg once daily",           "Take in the morning. Check BP daily at home."));
        prescriptionRepository.save(mkRx(mr02, preethi, drMeena,  "Levothyroxine",   "50mcg once daily",         "Take on empty stomach 30 min before breakfast. Avoid soy."));
        prescriptionRepository.save(mkRx(mr02, preethi, drMeena,  "Vitamin D3",      "60000 IU weekly",          "Take with a fatty meal for better absorption."));
        prescriptionRepository.save(mkRx(mr03, karan,   drSanjay, "Pantoprazole",    "40mg once daily",          "Take 30 min before breakfast. Do not crush or chew."));
        prescriptionRepository.save(mkRx(mr05, suresh,  drArun,   "Metoprolol",      "25mg twice daily",         "Do not skip doses. Taper before stopping."));
        prescriptionRepository.save(mkRx(mr05, suresh,  drArun,   "Metformin",       "1000mg twice daily",       "Take with meals to reduce GI side effects."));
        prescriptionRepository.save(mkRx(mr05, suresh,  drArun,   "Atorvastatin",    "20mg at bedtime",          "Avoid grapefruit. Liver function test in 3 months."));
        prescriptionRepository.save(mkRx(mr07, lakshmiP,drLakshmi,"Ferrous Sulphate","200mg once daily",         "Take with Vitamin C. Avoid dairy within 1 hour of dose."));
        prescriptionRepository.save(mkRx(mr08, divya,   drAnand,  "Escitalopram",    "10mg once daily at night", "Do not stop abruptly. Follow-up in 4 weeks."));
        prescriptionRepository.save(mkRx(mr09, rajesh,  drArun,   "Telmisartan",     "40mg once daily",          "Take at the same time each day. Monitor BP."));
        prescriptionRepository.save(mkRx(mr12, naveen,  drAnand,  "Alprazolam",      "0.25mg as needed",         "Use only when anxiety is severe. Max 3 weeks."));
        log.info("  inserted → prescriptions (12)");

        // ── 11. Reschedule Requests ──────────────────────────────
        rescheduleRequestRepository.save(mkReschedule(a04, rajesh,  drArun,   date(2026,2,10), time(11,0),  "PENDING",   null,                               null));
        rescheduleRequestRepository.save(mkReschedule(a09, mohan,   drVikram, date(2026,3,6),  time(14,0),  "FORWARDED", "Forwarded to doctor for review",    null));
        rescheduleRequestRepository.save(mkReschedule(a11, karan,   drSanjay, date(2026,3,14), time(9,30),  "ACCEPTED",  "Approved by admin",                "New slot works for me, thank you"));
        rescheduleRequestRepository.save(mkReschedule(a12, suresh,  drRavi,   date(2026,3,15), time(10,0),  "REJECTED",  "Doctor unavailable on that date",  "Cannot accommodate this date"));
        rescheduleRequestRepository.save(mkReschedule(a19, amit,    drArun,   date(2026,4,5),  time(9,0),   "PENDING",   null,                               null));
        rescheduleRequestRepository.save(mkReschedule(a22, lakshmiP,drLakshmi,date(2026,4,12), time(11,30), "PENDING",   null,                               null));
        log.info("  inserted → reschedule_requests (6)");

        // ── 12. Video Sessions ────────────────────────────────────
        videoSessionRepository.save(mkVideoSession("VS001", a02, preethi, drMeena,
                dt(2026,1,15,11,0), dt(2026,1,15,11,28), 28, "COMPLETED"));
        videoSessionRepository.save(mkVideoSession("VS002", a05, divya,   drAnand,
                dt(2026,2,8,14,0),  dt(2026,2,8,14,45),  45, "COMPLETED"));
        videoSessionRepository.save(mkVideoSession("VS003", a11, karan,   drSanjay,
                dt(2026,3,8,11,0),  dt(2026,3,8,11,32),  32, "COMPLETED"));
        videoSessionRepository.save(mkVideoSession("VS004", a18, naveen,  drAnand,
                dt(2026,3,25,14,0), dt(2026,3,25,14,38), 38, "COMPLETED"));
        videoSessionRepository.save(mkVideoSession("VS005", a26, sneha,   drMeena,
                dt(2026,4,25,11,0), dt(2026,4,25,11,22), 22, "COMPLETED"));
        log.info("  inserted → video_sessions (5)");

        // ── 13. Additional Beds ───────────────────────────────────
        bedRepository.save(mkBed(h1, "ICU",             203, "AVAILABLE", null));
        bedRepository.save(mkBed(h1, "Cardiac Ward",    301, "OCCUPIED",  amit));
        bedRepository.save(mkBed(h1, "Cardiac Ward",    302, "AVAILABLE", null));
        bedRepository.save(mkBed(h1, "Cardiac Ward",    303, "AVAILABLE", null));
        bedRepository.save(mkBed(h2, "Orthopedic Ward", 401, "OCCUPIED",  karan));
        bedRepository.save(mkBed(h2, "Orthopedic Ward", 402, "AVAILABLE", null));
        bedRepository.save(mkBed(h2, "Oncology Ward",   501, "OCCUPIED",  sunita));
        bedRepository.save(mkBed(h2, "Oncology Ward",   502, "AVAILABLE", null));
        bedRepository.save(mkBed(h3, "General Ward",    101, "OCCUPIED",  suresh));
        bedRepository.save(mkBed(h3, "General Ward",    102, "AVAILABLE", null));
        bedRepository.save(mkBed(h3, "Psychiatric Ward",201, "OCCUPIED",  divya));
        bedRepository.save(mkBed(h3, "Psychiatric Ward",202, "AVAILABLE", null));
        log.info("  inserted → beds (12 additional)");

        // ── 14. Additional Inventory ──────────────────────────────
        inventoryRepository.save(mkInventory(h1, "Amlodipine 5mg Tablets",        "Medicine",    5000, 500));
        inventoryRepository.save(mkInventory(h1, "Telmisartan 40mg Tablets",       "Medicine",    3000, 300));
        inventoryRepository.save(mkInventory(h1, "Pulse Oximeter",                 "Equipment",   30,   5));
        inventoryRepository.save(mkInventory(h1, "N95 Masks (Box of 20)",          "Consumables", 200,  50));
        inventoryRepository.save(mkInventory(h1, "Insulin Syringes (Box of 100)",  "Consumables", 2000, 300));
        inventoryRepository.save(mkInventory(h1, "Defibrillator Pads (Pair)",      "Equipment",   50,   10));
        inventoryRepository.save(mkInventory(h2, "Pantoprazole 40mg Tablets",      "Medicine",    3000, 400));
        inventoryRepository.save(mkInventory(h2, "Oncology PPE Kits",              "Consumables", 100,  20));
        inventoryRepository.save(mkInventory(h2, "CT Contrast Dye (Iodixanol)",    "Medicine",    50,   10));
        inventoryRepository.save(mkInventory(h2, "Endoscopy Biopsy Forceps",       "Equipment",   25,   5));
        inventoryRepository.save(mkInventory(h3, "Escitalopram 10mg Tablets",      "Medicine",    2000, 300));
        inventoryRepository.save(mkInventory(h3, "Alprazolam 0.25mg Tablets",      "Medicine",    500,  100));
        inventoryRepository.save(mkInventory(h3, "Psychiatric Assessment Kits",    "Consumables", 100,  20));
        inventoryRepository.save(mkInventory(h3, "ECG Machine",                    "Equipment",   5,    1));
        inventoryRepository.save(mkInventory(h3, "Surgical Gloves (Box of 100)",   "Consumables", 300,  60));
        inventoryRepository.save(mkInventory(h3, "IV Saline 500ml",                "Medicine",    300,  60));
        log.info("  inserted → inventory (16 additional)");

        // ── 15. Notifications ─────────────────────────────────────
        User drArunUser   = drArun.getUser();
        User drMeenaUser  = drMeena.getUser();
        User drVikramUser = drVikram.getUser();

        notif(uAmit,    "APPOINTMENT_BOOKED",    "Your appointment with Dr. Arun Kumar on Jan 10 is confirmed. Arrive 10 minutes early.",         true,  dt(2026,1,8,9,0));
        notif(uAmit,    "LAB_REPORT",            "Your HbA1c result is available: 5.9% — Pre-diabetic. Review with your doctor.",                 true,  dt(2026,1,11,14,0));
        notif(uAmit,    "REMINDER",              "Reminder: Take your Metformin dose with breakfast today.",                                      false, dt(2026,4,3,8,0));
        notif(uPreethi, "APPOINTMENT_BOOKED",    "Your video consultation with Dr. Meena Reddy on Jan 15 at 11:00 AM is confirmed.",              true,  dt(2026,1,13,9,0));
        notif(uPreethi, "LAB_REPORT",            "Your TSH result: 8.4 mIU/L — Hypothyroidism confirmed. Medication has been prescribed.",        false, dt(2026,1,16,10,0));
        notif(uKaran,   "APPOINTMENT_BOOKED",    "Your consultation with Dr. Sanjay Verma on Mar 8 is confirmed.",                               true,  dt(2026,3,6,9,0));
        notif(uKaran,   "APPOINTMENT_CANCELLED", "Your appointment on Jan 22 has been cancelled. Please rebook at your convenience.",             true,  dt(2026,1,23,10,0));
        notif(uDivya,   "APPOINTMENT_BOOKED",    "Your video consultation with Dr. Anand Kapoor on Feb 8 at 2:00 PM is confirmed.",               true,  dt(2026,2,6,9,0));
        notif(uDivya,   "LAB_REPORT",            "Your IgE Allergy Panel report is available. Elevated IgE detected — review with Dr. Priya.",    false, dt(2026,3,19,10,0));
        notif(uSuresh,  "APPOINTMENT_BOOKED",    "Your appointment with Dr. Arun Kumar on Feb 12 is confirmed.",                                  true,  dt(2026,2,10,9,0));
        notif(uSuresh,  "LAB_REPORT",            "Fasting Blood Sugar: 148 mg/dL — diabetic range. Please contact your doctor urgently.",         false, dt(2026,2,13,11,0));
        notif(uSuresh,  "REMINDER",              "HbA1c follow-up test is due next week. Schedule at your nearest diagnostic centre.",             false, dt(2026,4,10,8,0));
        notif(uLakshmi, "APPOINTMENT_BOOKED",    "Your appointment with Dr. Lakshmi Nair on Mar 5 is confirmed.",                                 true,  dt(2026,3,3,9,0));
        notif(uLakshmi, "LAB_REPORT",            "CBC report: Hb 9.8 g/dL — low. Please start the prescribed iron supplements today.",           false, dt(2026,3,6,10,0));
        notif(uNaveen,  "APPOINTMENT_BOOKED",    "Your video consultation with Dr. Anand Kapoor on Mar 25 at 2:00 PM is confirmed.",              true,  dt(2026,3,23,9,0));
        notif(uSunita,  "APPOINTMENT_BOOKED",    "Your appointment with Dr. Sanjay Verma on Mar 18 is confirmed.",                               true,  dt(2026,3,16,9,0));
        notif(drArunUser,  "APPOINTMENT_BOOKED", "New appointment: Amit Joshi — Jan 10 at 09:00 AM (Annual cardiac check-up).",                   true,  dt(2026,1,9,8,0));
        notif(drMeenaUser, "APPOINTMENT_BOOKED", "New video consultation: Preethi Menon — Jan 15 at 11:00 AM (Thyroid consultation).",            true,  dt(2026,1,13,8,0));
        notif(drVikramUser,"APPOINTMENT_BOOKED", "Reschedule request received from Mohan Das for the Mar 2 appointment.",                         false, dt(2026,3,1,10,0));
        notif(uAnand,   "APPOINTMENT_BOOKED",    "New video consultation: Divya Reddy — Feb 8 at 2:00 PM (Anxiety management).",                  true,  dt(2026,2,6,8,0));
        log.info("  inserted → notifications (20)");

        // ── 16. Chatbot Logs ──────────────────────────────────────
        chatbotLogRepository.save(mkLog(uAmit,    "I feel dizzy sometimes — could it be my blood pressure medication?",
                "Dizziness is a known side effect of Amlodipine, particularly when standing up quickly (orthostatic hypotension). Take the medication consistently at the same time each day. Report persistent dizziness to Dr. Arun.",
                dt(2026,1,12,10,0)));
        chatbotLogRepository.save(mkLog(uAmit,    "Can I eat rice if I have pre-diabetes?",
                "Yes, in moderation. Prefer brown rice over white, control portion size (¼ of your plate), and combine with protein and vegetables to reduce the glycaemic impact.",
                dt(2026,1,12,10,5)));
        chatbotLogRepository.save(mkLog(uPreethi, "How long before Levothyroxine starts working?",
                "Subtle improvements appear in 1–2 weeks, but full therapeutic effect takes 4–6 weeks. A repeat TSH test after 6–8 weeks confirms whether the dose is optimal. Always take it on an empty stomach.",
                dt(2026,1,20,14,0)));
        chatbotLogRepository.save(mkLog(uPreethi, "What foods interfere with my thyroid medication?",
                "Soy, high-fibre foods, walnuts, and coffee can reduce Levothyroxine absorption. Take the tablet 30 minutes before breakfast and wait 4 hours before consuming these foods.",
                dt(2026,2,1,9,0)));
        chatbotLogRepository.save(mkLog(uSuresh,  "What should my target blood sugar be?",
                "Fasting glucose target: 80–130 mg/dL. Post-meal (2 hr): below 180 mg/dL. HbA1c target: below 7%. Your HbA1c of 8.2% indicates suboptimal control — discuss a medication review with Dr. Arun.",
                dt(2026,2,15,9,0)));
        chatbotLogRepository.save(mkLog(uSuresh,  "Is exercising safe with high blood pressure?",
                "Yes — moderate aerobic exercise (brisk walking 30 min, 5 days/week) is recommended for hypertension. Avoid very heavy weightlifting. Warm up gradually. Monitor BP before and after exercise initially.",
                dt(2026,2,20,10,0)));
        chatbotLogRepository.save(mkLog(uKaran,   "What foods should I avoid with acid reflux?",
                "Avoid spicy, fatty, and acidic foods; caffeine; carbonated drinks; chocolate; and mint. Eat smaller, frequent meals. Avoid eating 2–3 hours before bedtime. Elevate the head end of your bed slightly.",
                dt(2026,3,10,11,0)));
        chatbotLogRepository.save(mkLog(uDivya,   "Why does anxiety cause physical symptoms?",
                "Anxiety triggers the fight-or-flight response: adrenaline causes rapid heart rate, muscle tension, shallow breathing, and GI disturbances. Over time, chronic anxiety leads to fatigue, headaches, and reduced immunity. CBT and Escitalopram can address both mental and physical symptoms.",
                dt(2026,2,10,15,0)));
        chatbotLogRepository.save(mkLog(uLakshmi, "What are the best foods to increase haemoglobin?",
                "Iron-rich foods: red meat, chicken, liver, lentils, spinach, tofu, and fortified cereals. Always combine with Vitamin C (orange, lemon, tomato) to boost non-haem iron absorption. Avoid tea and coffee with iron-rich meals.",
                dt(2026,3,8,16,0)));
        chatbotLogRepository.save(mkLog(uNaveen,  "How can I manage stress and anxiety better?",
                "Evidence-based strategies: regular aerobic exercise, mindfulness meditation, consistent sleep schedule, limiting caffeine and alcohol, and journalling. CBT sessions with Dr. Anand will give you personalised coping tools.",
                dt(2026,3,28,11,0)));
        log.info("  inserted → chatbot_logs (10)");
    }

    // =========================================================
    //  Lookup helpers
    // =========================================================
    private Patient findPatient(String email) {
        User u = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User not found: " + email));
        return patientRepository.findByUserUserId(u.getUserId())
                .orElseThrow(() -> new IllegalStateException("Patient not found for: " + email));
    }

    // =========================================================
    //  Builder helpers
    // =========================================================
    private Hospital mkHospital(String name, String address, String city,
                                String phone, int totalBeds, int availBeds) {
        Hospital h = new Hospital();
        h.setHospitalName(name); h.setAddress(address); h.setCity(city);
        h.setPhone(phone); h.setTotalBeds(totalBeds); h.setAvailableBeds(availBeds);
        return h;
    }

    private Department mkDept(String name, Hospital hospital) {
        Department d = new Department();
        d.setDepartmentName(name); d.setHospital(hospital);
        return d;
    }

    private User mkUser(String name, String email, String phone, String role,
                        Hospital hospital, String spec, String availability,
                        LocalDate dob, String gender, String bloodGroup, String emergency) {
        User u = new User();
        u.setName(name); u.setEmail(email);
        u.setPassword(passwordEncoder.encode(PWD));
        u.setPhone(phone); u.setRole(role); u.setHospital(hospital);
        u.setSpecialization(spec); u.setAvailabilityStatus(availability);
        u.setDateOfBirth(dob); u.setGender(gender);
        u.setBloodGroup(bloodGroup); u.setEmergencyContact(emergency);
        return u;
    }

    private Doctor mkDoctor(User user, Department dept, Hospital hospital,
                            String spec, String availability) {
        Doctor d = new Doctor();
        d.setUser(user); d.setDepartment(dept); d.setHospital(hospital);
        d.setSpecialization(spec); d.setAvailabilityStatus(availability);
        return d;
    }

    private Patient mkPatient(User user, LocalDate dob, String gender,
                              String bloodGroup, String emergency) {
        Patient p = new Patient();
        p.setUser(user); p.setDateOfBirth(dob); p.setGender(gender);
        p.setBloodGroup(bloodGroup); p.setEmergencyContact(emergency);
        return p;
    }

    private Vitals mkVitals(Patient patient, String bp, int hr, String glucose, String bmi) {
        Vitals v = new Vitals();
        v.setPatient(patient); v.setBp(bp); v.setHeartRate(hr);
        v.setGlucose(new BigDecimal(glucose)); v.setBmi(new BigDecimal(bmi));
        return v;
    }

    private Medicine mkMed(Patient patient, String name, String dosage,
                           String frequency, String scheduledTime, String status) {
        Medicine m = new Medicine();
        m.setPatient(patient); m.setMedicineName(name); m.setDosage(dosage);
        m.setFrequency(frequency); m.setScheduledTime(scheduledTime); m.setStatus(status);
        return m;
    }

    private Appointment appt(Patient patient, Doctor doctor, Hospital hospital,
                             LocalDate date, LocalTime time, String status,
                             String type, String sessionUrl, String notes) {
        Appointment a = new Appointment();
        a.setPatient(patient); a.setDoctor(doctor); a.setHospital(hospital);
        a.setAppointmentDate(date); a.setAppointmentTime(time);
        a.setStatus(status); a.setAppointmentType(type);
        a.setSessionUrl(sessionUrl); a.setNotes(notes);
        return appointmentRepository.save(a);
    }

    private Bill mkBill(Appointment appt, Patient patient, String amount,
                        String type, String status, LocalDate billDate) {
        Bill b = new Bill();
        b.setAppointment(appt); b.setPatient(patient);
        b.setAmount(new BigDecimal(amount));
        b.setType(type); b.setStatus(status); b.setBillDate(billDate);
        return b;
    }

    private MedicalRecord mkRec(Patient patient, Doctor doctor, Hospital hospital,
                                LocalDate date, String diagnosis, String treatment,
                                String prescription, String notes) {
        MedicalRecord m = new MedicalRecord();
        m.setPatient(patient); m.setDoctor(doctor); m.setHospital(hospital);
        m.setRecordDate(date); m.setDiagnosis(diagnosis); m.setTreatment(treatment);
        m.setPrescription(prescription); m.setNotes(notes);
        return m;
    }

    private void lab(Patient patient, Doctor doctor, Hospital hospital,
                     String testName, String result, boolean isAbnormal, LocalDate date) {
        LabReport r = new LabReport();
        r.setPatient(patient); r.setDoctor(doctor); r.setHospital(hospital);
        r.setTestName(testName); r.setResult(result);
        r.setIsAbnormal(isAbnormal); r.setReportDate(date);
        labReportRepository.save(r);
    }

    private Prescription mkRx(MedicalRecord record, Patient patient, Doctor doctor,
                              String name, String dosage, String instructions) {
        Prescription p = new Prescription();
        p.setMedicalRecord(record); p.setPatient(patient); p.setDoctor(doctor);
        p.setMedicationName(name); p.setDosage(dosage); p.setInstructions(instructions);
        return p;
    }

    private RescheduleRequest mkReschedule(Appointment appt, Patient patient, Doctor doctor,
                                           LocalDate date, LocalTime time, String status,
                                           String adminNotes, String doctorNotes) {
        RescheduleRequest r = new RescheduleRequest();
        r.setAppointment(appt); r.setPatient(patient); r.setDoctor(doctor);
        r.setRequestedDate(date); r.setRequestedTime(time); r.setStatus(status);
        r.setAdminNotes(adminNotes); r.setDoctorNotes(doctorNotes);
        return r;
    }

    private VideoSession mkVideoSession(String code, Appointment appt, Patient patient,
                                        Doctor doctor, LocalDateTime startedAt,
                                        LocalDateTime endedAt, int duration, String status) {
        VideoSession s = new VideoSession();
        s.setSessionCode(code); s.setAppointment(appt);
        s.setPatient(patient); s.setDoctor(doctor);
        s.setStartedAt(startedAt); s.setEndedAt(endedAt);
        s.setDurationMinutes(duration); s.setStatus(status);
        return s;
    }

    private Bed mkBed(Hospital hospital, String ward, int bedNumber,
                      String status, Patient patient) {
        Bed b = new Bed();
        b.setHospital(hospital); b.setWard(ward);
        b.setBedNumber(bedNumber); b.setStatus(status); b.setPatient(patient);
        return b;
    }

    private Inventory mkInventory(Hospital hospital, String itemName,
                                  String category, int quantity, int reorderLevel) {
        Inventory i = new Inventory();
        i.setHospital(hospital); i.setItemName(itemName); i.setCategory(category);
        i.setQuantity(quantity); i.setReorderLevel(reorderLevel);
        return i;
    }

    private void notif(User user, String type, String message,
                       boolean isRead, LocalDateTime createdAt) {
        Notification n = new Notification();
        n.setUser(user); n.setNotificationType(type); n.setMessage(message);
        n.setIsRead(isRead); n.setCreatedAt(createdAt);
        notificationRepository.save(n);
    }

    private ChatbotLog mkLog(User user, String query, String response, LocalDateTime createdAt) {
        ChatbotLog c = new ChatbotLog();
        c.setUser(user); c.setQuery(query); c.setResponse(response); c.setCreatedAt(createdAt);
        return c;
    }

    // Date/time shortcuts
    private static LocalDate     date(int y, int m, int d)             { return LocalDate.of(y, m, d); }
    private static LocalTime     time(int h, int min)                   { return LocalTime.of(h, min); }
    private static LocalDateTime dt(int y, int mo, int d, int h, int min) { return LocalDateTime.of(y, mo, d, h, min); }
}
