package com.cts.mfrp.service;

import com.cts.mfrp.entity.*;
import com.cts.mfrp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiContextService {

    private final UserRepository       userRepo;
    private final DoctorRepository     doctorRepo;
    private final PatientRepository    patientRepo;
    private final AppointmentRepository appointmentRepo;
    private final LabReportRepository   labReportRepo;
    private final MedicalRecordRepository medicalRecordRepo;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    // ── Doctor context ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public String buildDoctorContext(String email) {
        try {
            Optional<Doctor> doctorOpt = doctorRepo.findByUserEmail(email);
            if (doctorOpt.isEmpty()) return "";

            Doctor doctor = doctorOpt.get();
            StringBuilder sb = new StringBuilder();
            sb.append("=== REAL HOSPITAL DATA — use this to answer the doctor's questions ===\n");
            sb.append("Doctor: Dr. ").append(doctor.getUser().getName());
            if (doctor.getSpecialization() != null)
                sb.append(" | ").append(doctor.getSpecialization());
            if (doctor.getDepartment() != null)
                sb.append(" | Dept: ").append(doctor.getDepartment().getDepartmentName());
            if (doctor.getHospital() != null)
                sb.append(" | ").append(doctor.getHospital().getHospitalName());
            sb.append("\nDate: ").append(LocalDate.now().format(DATE_FMT)).append("\n\n");

            // Today's appointments
            List<Appointment> todayAppts = appointmentRepo
                    .findByDoctorDoctorIdAndAppointmentDate(doctor.getDoctorId(), LocalDate.now());
            todayAppts.sort(Comparator.comparing(Appointment::getAppointmentTime));

            sb.append("TODAY'S APPOINTMENTS (").append(todayAppts.size()).append("):\n");
            if (todayAppts.isEmpty()) {
                sb.append("  No appointments scheduled for today.\n");
            } else {
                for (int i = 0; i < todayAppts.size(); i++) {
                    Appointment a = todayAppts.get(i);
                    Patient p = a.getPatient();
                    String patientName = p != null && p.getUser() != null ? p.getUser().getName() : "Unknown";
                    String gender = p != null && p.getGender() != null ? p.getGender().substring(0, 1).toUpperCase() : "?";
                    int age = p != null && p.getDateOfBirth() != null
                            ? LocalDate.now().getYear() - p.getDateOfBirth().getYear() : 0;
                    String time = a.getAppointmentTime() != null ? a.getAppointmentTime().format(TIME_FMT) : "TBD";
                    String type = a.getAppointmentType() != null ? a.getAppointmentType() : "In-Person";
                    String status = a.getStatus() != null ? a.getStatus() : "PENDING";
                    sb.append(String.format("  %d. %s | %s | %s (%s, %d yrs) | Status: %s",
                            i + 1, time, type, patientName, gender, age, status));
                    if (a.getNotes() != null && !a.getNotes().isBlank())
                        sb.append(" | Notes: ").append(a.getNotes());
                    sb.append("\n");
                }
            }

            // Recent lab reports (last 14 days, abnormal first)
            List<LabReport> labs = labReportRepo.findByDoctorDoctorId(doctor.getDoctorId());
            LocalDate cutoff = LocalDate.now().minusDays(14);
            List<LabReport> recentLabs = labs.stream()
                    .filter(l -> l.getReportDate() != null && !l.getReportDate().isBefore(cutoff))
                    .sorted(Comparator.comparing((LabReport l) -> Boolean.TRUE.equals(l.getIsAbnormal()) ? 0 : 1)
                            .thenComparing(Comparator.comparing(LabReport::getReportDate).reversed()))
                    .limit(10)
                    .toList();

            sb.append("\nRECENT LAB REPORTS (last 14 days, ").append(recentLabs.size()).append("):\n");
            if (recentLabs.isEmpty()) {
                sb.append("  No lab reports in the last 14 days.\n");
            } else {
                for (LabReport r : recentLabs) {
                    String patName = r.getPatient() != null && r.getPatient().getUser() != null
                            ? r.getPatient().getUser().getName() : "Unknown";
                    String flag = Boolean.TRUE.equals(r.getIsAbnormal()) ? " ⚠ ABNORMAL" : "";
                    sb.append(String.format("  - %s | %s | %s%s | %s\n",
                            patName, r.getTestName(), r.getResult(), flag,
                            r.getReportDate().format(DATE_FMT)));
                }
            }

            // Recent medical records (last 10)
            List<MedicalRecord> records = medicalRecordRepo.findByDoctorDoctorId(doctor.getDoctorId());
            List<MedicalRecord> recentRecs = records.stream()
                    .filter(r -> r.getRecordDate() != null && !r.getRecordDate().isBefore(LocalDate.now().minusDays(30)))
                    .sorted(Comparator.comparing(MedicalRecord::getRecordDate).reversed())
                    .limit(8)
                    .toList();

            if (!recentRecs.isEmpty()) {
                sb.append("\nRECENT MEDICAL RECORDS (last 30 days):\n");
                for (MedicalRecord r : recentRecs) {
                    String patName = r.getPatient() != null && r.getPatient().getUser() != null
                            ? r.getPatient().getUser().getName() : "Unknown";
                    sb.append(String.format("  - %s | %s | %s | Tx: %s\n",
                            r.getRecordDate().format(DATE_FMT), patName,
                            r.getDiagnosis() != null ? r.getDiagnosis() : "-",
                            r.getTreatment() != null ? r.getTreatment() : "-"));
                }
            }

            sb.append("\n=== END DATA — answer using only real facts above; don't invent patient names or values ===\n");
            return sb.toString();

        } catch (Exception e) {
            log.warn("AiContextService: failed building doctor context for {}: {}", email, e.getMessage());
            return "";
        }
    }

    // ── Patient context ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public String buildPatientContext(String email) {
        try {
            Optional<Patient> patientOpt = patientRepo.findByUserEmail(email);
            if (patientOpt.isEmpty()) return "";

            Patient patient = patientOpt.get();
            User user = patient.getUser();
            StringBuilder sb = new StringBuilder();
            sb.append("=== PATIENT HEALTH CONTEXT — use this to personalise responses ===\n");
            sb.append("Patient: ").append(user.getName());
            if (patient.getDateOfBirth() != null) {
                int age = LocalDate.now().getYear() - patient.getDateOfBirth().getYear();
                sb.append(" | Age: ").append(age);
                sb.append(" | DOB: ").append(patient.getDateOfBirth().format(DATE_FMT));
            }
            if (patient.getGender() != null)    sb.append(" | ").append(patient.getGender());
            if (patient.getBloodGroup() != null) sb.append(" | Blood: ").append(patient.getBloodGroup());
            sb.append("\nDate: ").append(LocalDate.now().format(DATE_FMT)).append("\n\n");

            // Upcoming appointments (today + next 30 days)
            List<Appointment> upcoming = appointmentRepo
                    .findByPatientPatientIdAndAppointmentDateGreaterThanEqual(patient.getPatientId(), LocalDate.now())
                    .stream()
                    .sorted(Comparator.comparing(Appointment::getAppointmentDate)
                            .thenComparing(a -> a.getAppointmentTime() != null ? a.getAppointmentTime().toString() : ""))
                    .limit(5)
                    .toList();

            sb.append("UPCOMING APPOINTMENTS:\n");
            if (upcoming.isEmpty()) {
                sb.append("  No upcoming appointments.\n");
            } else {
                for (Appointment a : upcoming) {
                    String docName = a.getDoctor() != null && a.getDoctor().getUser() != null
                            ? "Dr. " + a.getDoctor().getUser().getName() : "Doctor";
                    String spec = a.getDoctor() != null ? a.getDoctor().getSpecialization() : "";
                    String time = a.getAppointmentTime() != null ? a.getAppointmentTime().format(TIME_FMT) : "";
                    sb.append(String.format("  - %s at %s | %s (%s) | %s | Status: %s\n",
                            a.getAppointmentDate().format(DATE_FMT), time,
                            docName, spec != null ? spec : "",
                            a.getAppointmentType() != null ? a.getAppointmentType() : "",
                            a.getStatus() != null ? a.getStatus() : ""));
                }
            }

            // Recent lab reports
            List<LabReport> labs = labReportRepo.findByPatientPatientId(patient.getPatientId())
                    .stream()
                    .sorted(Comparator.comparing(LabReport::getReportDate).reversed())
                    .limit(8)
                    .toList();

            sb.append("\nRECENT LAB REPORTS:\n");
            if (labs.isEmpty()) {
                sb.append("  No lab reports on file.\n");
            } else {
                for (LabReport r : labs) {
                    String flag = Boolean.TRUE.equals(r.getIsAbnormal()) ? " ⚠ ABNORMAL" : "";
                    String docName = r.getDoctor() != null && r.getDoctor().getUser() != null
                            ? "Dr. " + r.getDoctor().getUser().getName() : "";
                    sb.append(String.format("  - %s | %s | %s%s | %s\n",
                            r.getReportDate().format(DATE_FMT), r.getTestName(), r.getResult(), flag,
                            docName));
                }
            }

            // Recent medical records / diagnoses
            List<MedicalRecord> records = medicalRecordRepo.findByPatientPatientId(patient.getPatientId())
                    .stream()
                    .sorted(Comparator.comparing(MedicalRecord::getRecordDate).reversed())
                    .limit(5)
                    .toList();

            if (!records.isEmpty()) {
                sb.append("\nRECENT DIAGNOSES & TREATMENTS:\n");
                for (MedicalRecord r : records) {
                    sb.append(String.format("  - %s | %s | Tx: %s",
                            r.getRecordDate().format(DATE_FMT),
                            r.getDiagnosis() != null ? r.getDiagnosis() : "-",
                            r.getTreatment() != null ? r.getTreatment() : "-"));
                    if (r.getPrescription() != null && !r.getPrescription().isBlank())
                        sb.append(" | Rx: ").append(r.getPrescription());
                    sb.append("\n");
                }
            }

            sb.append("\n=== END DATA — personalise answers using patient's actual data above ===\n");
            return sb.toString();

        } catch (Exception e) {
            log.warn("AiContextService: failed building patient context for {}: {}", email, e.getMessage());
            return "";
        }
    }
}
