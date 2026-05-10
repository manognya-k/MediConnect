package com.cts.mfrp.service;

import com.cts.mfrp.entity.*;
import com.cts.mfrp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardDataService {

    private final PatientRepository patientRepository;
    private final VitalsRepository vitalsRepository;
    private final MedicineRepository medicineRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final BedRepository bedRepository;
    private final BillRepository billRepository;

    public Map<String, Object> getPatientVitals(Integer patientId) {
        ensurePatientExists(patientId);
        return vitalsRepository.findByPatientPatientIdOrderByUpdatedAtDesc(patientId).stream()
                .findFirst()
                .map(v -> {
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("bloodPressure", v.getBp());
                    body.put("heartRate", v.getHeartRate());
                    body.put("glucose", v.getGlucose());
                    body.put("bmi", v.getBmi());
                    body.put("lastUpdatedAt", v.getUpdatedAt());
                    return body;
                })
                .orElseGet(() -> {
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("bloodPressure", null);
                    body.put("heartRate", null);
                    body.put("glucose", null);
                    body.put("bmi", null);
                    body.put("lastUpdatedAt", null);
                    return body;
                });
    }

    public List<Map<String, Object>> getPatientMedicines(Integer patientId) {
        ensurePatientExists(patientId);
        return medicineRepository.findByPatientPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(m -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", m.getId());
                    item.put("medicineName", m.getMedicineName());
                    item.put("dosage", m.getDosage());
                    item.put("frequency", m.getFrequency());
                    item.put("scheduledTime", m.getScheduledTime());
                    item.put("status", m.getStatus());
                    return item;
                })
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getPatientActivities(Integer patientId) {
        ensurePatientExists(patientId);
        List<Map<String, Object>> activities = new ArrayList<>();

        appointmentRepository.findByPatientPatientId(patientId).forEach(a -> {
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("type", "APPOINTMENT");
            e.put("referenceId", a.getAppointmentId());
            e.put("text", "Appointment " + Optional.ofNullable(a.getStatus()).orElse("UPDATED"));
            e.put("eventAt", a.getAppointmentDate() != null ? a.getAppointmentDate().toString() : null);
            activities.add(e);
        });

        medicalRecordRepository.findByPatientPatientId(patientId).forEach(r -> {
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("type", "MEDICAL_RECORD");
            e.put("referenceId", r.getRecordId());
            e.put("text", "Medical record updated" + (r.getDiagnosis() != null ? ": " + r.getDiagnosis() : ""));
            e.put("eventAt", r.getRecordDate() != null ? r.getRecordDate().toString() : null);
            activities.add(e);
        });

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found"));
        Integer userId = patient.getUser() != null ? patient.getUser().getUserId() : null;
        if (userId != null) {
            notificationRepository.findByUserUserId(userId).forEach(n -> {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("type", "NOTIFICATION");
                e.put("referenceId", n.getNotificationId());
                e.put("text", n.getMessage());
                e.put("eventAt", n.getCreatedAt());
                activities.add(e);
            });
        }

        activities.sort((left, right) -> String.valueOf(Objects.toString(right.get("eventAt"), ""))
                .compareTo(String.valueOf(Objects.toString(left.get("eventAt"), ""))));
        return activities;
    }

    public Map<String, Object> getAdminDashboardStats(Integer adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Admin user not found"));
        if (!"ADMIN".equalsIgnoreCase(admin.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not an admin");
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalPatients", patientRepository.count());
        stats.put("totalDoctors", doctorRepository.count());
        stats.put("totalAppointments", appointmentRepository.count());
        long doctorsOnDuty = doctorRepository.findAll().stream()
                .filter(d -> "AVAILABLE".equalsIgnoreCase(d.getAvailabilityStatus()))
                .count();
        stats.put("doctorsOnDuty", doctorsOnDuty);

        long totalBeds = bedRepository.count();
        long occupiedBeds = bedRepository.findByStatus("OCCUPIED").size();
        double occupancyPct = totalBeds > 0 ? ((double) occupiedBeds / (double) totalBeds) * 100D : 0D;
        stats.put("occupancyPct", occupancyPct);

        // Revenue from bills table — current calendar month
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd   = monthStart.plusMonths(1).minusDays(1);
        BigDecimal revenue = billRepository.sumRevenueBetween(monthStart, monthEnd);
        stats.put("revenue", revenue != null ? revenue.doubleValue() : 0D);

        Map<String, Long> diseaseDistribution = medicalRecordRepository.findAll().stream()
                .collect(Collectors.groupingBy(
                        r -> Optional.ofNullable(r.getDiagnosis()).filter(s -> !s.isBlank()).orElse("UNSPECIFIED"),
                        Collectors.counting()
                ));
        stats.put("diseaseDistribution", diseaseDistribution);
        return stats;
    }

    private void ensurePatientExists(Integer patientId) {
        if (!patientRepository.existsById(patientId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found");
        }
    }
}
