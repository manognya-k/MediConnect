package com.cts.mfrp.controller;

import com.cts.mfrp.entity.*;
import com.cts.mfrp.repository.*;
import com.cts.mfrp.service.DashboardDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final HospitalRepository hospitalRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final BedRepository bedRepository;
    private final InventoryRepository inventoryRepository;
    private final LabReportRepository labReportRepository;
    private final BillRepository billRepository;
    private final DashboardDataService dashboardDataService;

    @GetMapping("/{id}/dashboard-stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats(@PathVariable Integer id) {
        return ResponseEntity.ok(dashboardDataService.getAdminDashboardStats(id));
    }

    /** Aggregated overview stats */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalHospitals", hospitalRepository.count());
        stats.put("totalPatients", patientRepository.count());
        stats.put("totalDoctors", doctorRepository.count());
        stats.put("totalAppointments", appointmentRepository.count());
        stats.put("totalInventoryItems", inventoryRepository.count());

        long totalBeds = bedRepository.count();
        long occupiedBeds = bedRepository.findByStatus("OCCUPIED").size();
        stats.put("totalBeds", totalBeds);
        stats.put("occupiedBeds", occupiedBeds);
        stats.put("icuOccupancyPct", totalBeds > 0 ? Math.round((double) occupiedBeds / totalBeds * 100) : 0);

        long onlineDoctors = doctorRepository.findAll().stream()
                .filter(d -> "AVAILABLE".equalsIgnoreCase(d.getAvailabilityStatus()))
                .count();
        stats.put("doctorsOnDuty", onlineDoctors);

        // New patients registered this calendar month
        java.time.LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        java.time.LocalDateTime monthEnd   = monthStart.plusMonths(1);
        stats.put("newPatientsThisMonth", patientRepository.countByCreatedAtBetween(monthStart, monthEnd));

        // Appointment status breakdown
        stats.put("confirmedAppointments", appointmentRepository.countByStatus("CONFIRMED"));
        stats.put("pendingAppointments",   appointmentRepository.countByStatus("PENDING"));
        stats.put("cancelledAppointments", appointmentRepository.countByStatus("CANCELLED"));
        stats.put("completedAppointments", appointmentRepository.countByStatus("COMPLETED"));

        return ResponseEntity.ok(stats);
    }

    /** Bed occupancy by hospital */
    @GetMapping("/bed-occupancy")
    public ResponseEntity<List<Map<String, Object>>> getBedOccupancy() {
        List<Hospital> hospitals = hospitalRepository.findAll();
        List<Map<String, Object>> result = hospitals.stream().map(h -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("hospitalId", h.getHospitalId());
            row.put("hospitalName", h.getHospitalName());
            row.put("city", h.getCity());
            row.put("totalBeds", h.getTotalBeds());
            row.put("availableBeds", h.getAvailableBeds());
            int occupied = h.getTotalBeds() - h.getAvailableBeds();
            row.put("occupiedBeds", Math.max(0, occupied));
            row.put("occupancyPct", h.getTotalBeds() > 0
                    ? Math.round((double) Math.max(0, occupied) / h.getTotalBeds() * 100)
                    : 0);
            return row;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** Appointment status breakdown */
    @GetMapping("/appointment-stats")
    public ResponseEntity<Map<String, Object>> getAppointmentStats() {
        List<Appointment> all = appointmentRepository.findAll();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", all.size());
        stats.put("confirmed", all.stream().filter(a -> "CONFIRMED".equalsIgnoreCase(a.getStatus())).count());
        stats.put("pending", all.stream().filter(a -> "PENDING".equalsIgnoreCase(a.getStatus())).count());
        stats.put("cancelled", all.stream().filter(a -> "CANCELLED".equalsIgnoreCase(a.getStatus())).count());
        stats.put("video", all.stream().filter(a -> "VIDEO".equalsIgnoreCase(a.getAppointmentType())).count());
        return ResponseEntity.ok(stats);
    }

    /** Inventory alerts: low stock + expiring */
    @GetMapping("/inventory-alerts")
    public ResponseEntity<Map<String, Object>> getInventoryAlerts() {
        List<Inventory> all = inventoryRepository.findAll();
        Map<String, Object> alerts = new LinkedHashMap<>();
        List<Inventory> lowStock = all.stream()
                .filter(i -> i.getQuantity() != null && i.getReorderLevel() != null
                        && i.getQuantity() <= i.getReorderLevel())
                .collect(Collectors.toList());
        alerts.put("lowStockCount", lowStock.size());
        alerts.put("lowStockItems", lowStock);
        alerts.put("totalItems", all.size());
        return ResponseEntity.ok(alerts);
    }

    /** Lab report stats */
    @GetMapping("/lab-stats")
    public ResponseEntity<Map<String, Object>> getLabStats() {
        List<LabReport> all = labReportRepository.findAll();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", all.size());
        stats.put("pending", all.stream().filter(r -> "PENDING".equalsIgnoreCase(r.getResult()) || r.getResult() == null).count());
        stats.put("abnormal", all.stream().filter(r -> Boolean.TRUE.equals(r.getIsAbnormal())).count());
        return ResponseEntity.ok(stats);
    }

    /** Recent bills with patient and amount info */
    @GetMapping("/bills")
    public ResponseEntity<List<Map<String, Object>>> getBills() {
        List<Bill> bills = billRepository.findAll();
        List<Map<String, Object>> result = bills.stream()
                .filter(b -> b.getBillDate() != null)
                .sorted((a, b) -> b.getBillDate().compareTo(a.getBillDate()))
                .limit(20)
                .map(b -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", b.getId());
                    row.put("amount", b.getAmount());
                    row.put("type", b.getType());
                    row.put("status", b.getStatus());
                    row.put("billDate", b.getBillDate().toString());
                    String patientName = (b.getPatient() != null && b.getPatient().getUser() != null)
                            ? b.getPatient().getUser().getName() : "—";
                    row.put("patientName", patientName);
                    String dept = (b.getAppointment() != null && b.getAppointment().getDoctor() != null)
                            ? b.getAppointment().getDoctor().getSpecialization() : "General";
                    row.put("department", dept);
                    row.put("appointmentId", b.getAppointment() != null ? b.getAppointment().getAppointmentId() : null);
                    return row;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** Doctor availability grid */
    @GetMapping("/doctor-availability")
    public ResponseEntity<List<Map<String, Object>>> getDoctorAvailability() {
        List<Doctor> doctors = doctorRepository.findAll();
        List<Map<String, Object>> result = doctors.stream().map(d -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("doctorId", d.getDoctorId());
            row.put("name", d.getUser() != null ? d.getUser().getName() : "Unknown");
            row.put("specialization", d.getSpecialization());
            row.put("hospital", d.getHospital() != null ? d.getHospital().getHospitalName() : "");
            row.put("status", d.getAvailabilityStatus() != null ? d.getAvailabilityStatus() : "OFFLINE");
            return row;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** Video appointments (telemedicine) */
    @GetMapping("/video-appointments")
    public ResponseEntity<List<Appointment>> getVideoAppointments() {
        List<Appointment> videoAppts = appointmentRepository.findAll().stream()
                .filter(a -> "VIDEO".equalsIgnoreCase(a.getAppointmentType()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(videoAppts);
    }

    /**
     * Analytics: monthly appointment flow, department completion rates,
     * cancellation rate trend, and day×time heatmap — all derived from live DB data.
     */
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(
            @RequestParam(required = false) Integer hospitalId,
            @RequestParam(required = false) String department,
            @RequestParam(required = false, defaultValue = "180") int rangeDays) {
        Map<String, Object> result = new LinkedHashMap<>();
        LocalDate now = LocalDate.now();
        LocalDate rangeStart = now.minusDays(rangeDays);

        List<Appointment> allAppts = appointmentRepository.findAll().stream()
                .filter(a -> a.getAppointmentDate() == null || !a.getAppointmentDate().isBefore(rangeStart))
                .filter(a -> hospitalId == null || (a.getHospital() != null && hospitalId.equals(a.getHospital().getHospitalId())))
                .filter(a -> department == null || department.isBlank() ||
                        (a.getDoctor() != null && department.equalsIgnoreCase(a.getDoctor().getSpecialization())))
                .collect(Collectors.toList());

        // Monthly appointment flow — last 6 months, split by type
        Map<String, Long> monthlyFlow        = new LinkedHashMap<>();
        Map<String, Long> monthlyInPerson    = new LinkedHashMap<>();
        Map<String, Long> monthlyVideo       = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            String key = month.getMonth().getDisplayName(TextStyle.SHORT, java.util.Locale.US) + " " + month.getYear();
            int y = month.getYear(), m = month.getMonthValue();
            List<Appointment> monthAppts = allAppts.stream()
                    .filter(a -> a.getAppointmentDate() != null
                            && a.getAppointmentDate().getYear() == y
                            && a.getAppointmentDate().getMonthValue() == m)
                    .collect(Collectors.toList());
            monthlyFlow.put(key, (long) monthAppts.size());
            monthlyInPerson.put(key, monthAppts.stream()
                    .filter(a -> !"VIDEO".equalsIgnoreCase(a.getAppointmentType())).count());
            monthlyVideo.put(key, monthAppts.stream()
                    .filter(a -> "VIDEO".equalsIgnoreCase(a.getAppointmentType())).count());
        }
        result.put("monthlyFlow", monthlyFlow);
        result.put("monthlyInPersonFlow", monthlyInPerson);
        result.put("monthlyVideoFlow", monthlyVideo);

        // Department-wise: completed and total appointment counts
        Map<String, Long> completedByDept = allAppts.stream()
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()) && a.getDoctor() != null)
                .collect(Collectors.groupingBy(
                        a -> Optional.ofNullable(a.getDoctor().getSpecialization()).orElse("General"),
                        Collectors.counting()
                ));
        Map<String, Long> totalByDept = allAppts.stream()
                .filter(a -> a.getDoctor() != null)
                .collect(Collectors.groupingBy(
                        a -> Optional.ofNullable(a.getDoctor().getSpecialization()).orElse("General"),
                        Collectors.counting()
                ));
        result.put("completedByDepartment", completedByDept);
        result.put("totalByDepartment", totalByDept);

        // Monthly cancellation rate — last 6 months
        Map<String, Double> cancellationRate = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            String key = month.getMonth().getDisplayName(TextStyle.SHORT, java.util.Locale.US);
            int y = month.getYear(), m = month.getMonthValue();
            long total = allAppts.stream()
                    .filter(a -> a.getAppointmentDate() != null
                            && a.getAppointmentDate().getYear() == y
                            && a.getAppointmentDate().getMonthValue() == m)
                    .count();
            long cancelled = allAppts.stream()
                    .filter(a -> a.getAppointmentDate() != null
                            && a.getAppointmentDate().getYear() == y
                            && a.getAppointmentDate().getMonthValue() == m
                            && "CANCELLED".equalsIgnoreCase(a.getStatus()))
                    .count();
            cancellationRate.put(key, total > 0 ? Math.round((double) cancelled / total * 1000.0) / 10.0 : 0.0);
        }
        result.put("cancellationRate", cancellationRate);

        // Appointment heatmap: day-of-week (0=Mon) × 2-hour time bucket (0=6AM…11=4AM)
        int[][] heatmap = new int[7][12];
        allAppts.forEach(a -> {
            if (a.getAppointmentDate() != null && a.getAppointmentTime() != null) {
                int dow    = a.getAppointmentDate().getDayOfWeek().getValue() - 1;
                int hour   = a.getAppointmentTime().getHour();
                int bucket = ((hour - 6 + 24) % 24) / 2;
                if (bucket >= 0 && bucket < 12 && dow >= 0 && dow < 7)
                    heatmap[dow][bucket]++;
            }
        });
        List<List<Integer>> heatmapList = new ArrayList<>();
        for (int[] row : heatmap) {
            List<Integer> r = new ArrayList<>();
            for (int v : row) r.add(v);
            heatmapList.add(r);
        }
        result.put("heatmap", heatmapList);

        // Monthly revenue from bills — last 6 months
        Map<String, Object> monthlyRevenue = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            String key = month.getMonth().getDisplayName(TextStyle.SHORT, java.util.Locale.US) + " " + month.getYear();
            LocalDate start = month.withDayOfMonth(1);
            LocalDate end = month.withDayOfMonth(month.lengthOfMonth());
            BigDecimal revenue = billRepository.sumRevenueBetween(start, end);
            monthlyRevenue.put(key, revenue != null ? revenue : BigDecimal.ZERO);
        }
        result.put("monthlyRevenue", monthlyRevenue);

        return ResponseEntity.ok(result);
    }
}
